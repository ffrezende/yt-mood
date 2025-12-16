import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents } from 'bullmq';
import { VideoService, VideoChunk } from '../video/video.service';
import { AggregationService, AggregatedResult } from '../aggregation/aggregation.service';
import { ChunkJobData, ChunkJobResult } from '../queue/processors/chunk.processor';
import { YoutubeUtil } from '../common/utils/youtube.util';
import { CacheService } from '../cache/cache.service';
import { InvalidYouTubeUrlException } from '../common/exceptions/app.exceptions';
import { AppConstants } from '../common/constants/app.constants';

@Injectable()
export class AnalyzeService {
  private readonly logger = new Logger(AnalyzeService.name);

  private queueEvents: QueueEvents | null = null;

  constructor(
    private videoService: VideoService,
    private aggregationService: AggregationService,
    private configService: ConfigService,
    private cacheService: CacheService,
    @InjectQueue('chunk-processing') private chunkQueue: Queue<ChunkJobData, ChunkJobResult>,
  ) {
    this.initializeQueueEvents();
  }

  /**
   * Initialize QueueEvents for job completion tracking
   * @private
   */
  private initializeQueueEvents(): void {
    try {
      // Import dynamically to avoid circular dependencies
      const { createRedisConfig } = require('../common/config/redis.config');
      const redisConfig = createRedisConfig(this.configService);

      this.queueEvents = new QueueEvents('chunk-processing', {
        connection: redisConfig,
      });

      // Handle connection errors
      this.queueEvents.on('error', (error) => {
        this.logger.error('QueueEvents Redis connection error:', error);
      });

      this.logger.log('QueueEvents initialized successfully');
    } catch (error: any) {
      this.logger.warn(
        'Failed to create QueueEvents, will use alternative method',
        error?.message || error,
      );
    }
  }

  /**
   * Main orchestration method for video mood analysis
   * Uses Redis cache to avoid re-downloading and re-processing videos
   */
  async analyzeVideo(youtubeUrl: string): Promise<AggregatedResult> {
    this.logger.log(`Starting analysis for: ${youtubeUrl}`);

    // Validate URL
    if (!YoutubeUtil.isValidUrl(youtubeUrl)) {
      throw new InvalidYouTubeUrlException(youtubeUrl);
    }

    // Extract video ID for caching
    const videoId = YoutubeUtil.getVideoId(youtubeUrl);
    if (!videoId) {
      throw new InvalidYouTubeUrlException(youtubeUrl);
    }

    // Step 0: Check cache first
    if (this.cacheService.isCacheAvailable()) {
      this.logger.debug(`Checking cache for video: ${videoId}`);
      const cachedResult = await this.cacheService.getCachedResult(videoId);
      
      if (cachedResult) {
        this.logger.log(`✅ Cache HIT! Returning cached result for video: ${videoId}`);
        return cachedResult;
      }
      
      this.logger.log(`Cache MISS for video: ${videoId}. Processing from scratch...`);
    } else {
      this.logger.debug('Cache not available, processing from scratch...');
    }

    let chunks: VideoChunk[] = [];

    try {
      // Step 1: Download and chunk video
      chunks = await this.videoService.downloadAndChunk(youtubeUrl);
      this.logger.log(`Video chunked into ${chunks.length} segments`);

      // Verify all chunk files exist before queuing
      const fs = require('fs-extra');
      const verifiedChunks: VideoChunk[] = [];
      
      for (const chunk of chunks) {
        const videoExists = await fs.pathExists(chunk.videoPath);
        const audioExists = await fs.pathExists(chunk.audioPath);
        
        if (!videoExists || !audioExists) {
          this.logger.error(
            `Chunk ${chunk.index} verification failed: video=${videoExists}, audio=${audioExists}`,
          );
          throw new Error(
            `Chunk ${chunk.index} files are missing. Video: ${videoExists}, Audio: ${audioExists}`,
          );
        }
        
        // Verify files have content
        const videoStats = await fs.stat(chunk.videoPath);
        const audioStats = await fs.stat(chunk.audioPath);
        
        if (videoStats.size === 0 || audioStats.size === 0) {
          this.logger.error(
            `Chunk ${chunk.index} has empty files: video=${videoStats.size} bytes, audio=${audioStats.size} bytes`,
          );
          throw new Error(`Chunk ${chunk.index} has empty files`);
        }
        
        verifiedChunks.push(chunk);
        this.logger.debug(
          `Chunk ${chunk.index} verified: video=${videoStats.size} bytes, audio=${audioStats.size} bytes`,
        );
      }

      this.logger.log(`Verified ${verifiedChunks.length} chunks, creating jobs...`);

      // Step 2: Create jobs for each verified chunk
      const jobs = await Promise.all(
        verifiedChunks.map((chunk) =>
          this.chunkQueue.add('process-chunk', {
            chunk,
            jobId: `chunk-${chunk.index}`,
          } as ChunkJobData),
        ),
      );

      this.logger.log(`Created ${jobs.length} processing jobs`);

      // Step 3: Wait for all jobs to complete
      const results: ChunkJobResult[] = await Promise.all(
        jobs.map(async (job) => {
          if (this.queueEvents) {
            const result = await job.waitUntilFinished(this.queueEvents);
            return result as ChunkJobResult;
          } else {
            // Fallback: poll job status if QueueEvents is not available
            return await this.waitForJobCompletion(job);
          }
        }),
      );

      this.logger.log(`All ${results.length} chunks processed`);

      // Step 4: Aggregate results
      const aggregated = this.aggregationService.aggregateResults(results);

      // Step 5: Store result in cache
      if (this.cacheService.isCacheAvailable()) {
        const cacheTtl = this.configService.get<number>(
          'CACHE_TTL',
          AppConstants.CACHE_DEFAULT_TTL_SECONDS,
        );
        await this.cacheService.setCachedResult(videoId, aggregated, cacheTtl);
        this.logger.log(`Result cached for video: ${videoId} (TTL: ${cacheTtl}s)`);
      }

      // Step 6: Clean up video chunks
      await this.videoService.cleanupChunks(chunks);

      this.logger.log(`Analysis complete. Overall mood: ${aggregated.overall_mood}`);

      return aggregated;
    } catch (error) {
      this.logger.error(`Analysis error: ${error.message}`);
      
      // Clean up on error
      if (chunks.length > 0) {
        await this.videoService.cleanupChunks(chunks).catch(() => {});
      }

      throw error;
    }
  }

  /**
   * Fallback method to wait for job completion by polling
   */
  private async waitForJobCompletion(
    job: any,
  ): Promise<ChunkJobResult> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
      const checkInterval = setInterval(async () => {
        try {
          const jobState = await job.getState();
          if (jobState === 'completed') {
            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            // Get the return value from the completed job
            const returnValue = await job.returnvalue;
            resolve(returnValue as ChunkJobResult);
          } else if (jobState === 'failed') {
            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            const failedReason = await job.failedReason;
            reject(new Error(`Job failed: ${failedReason || 'Unknown error'}`));
          }
        } catch (error: any) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          reject(error);
        }
      }, 500); // Check every 500ms

      // Timeout after 5 minutes
      timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Job timeout after 5 minutes'));
      }, 5 * 60 * 1000);
    });
  }
}

