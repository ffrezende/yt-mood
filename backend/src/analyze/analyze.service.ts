import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents, Job } from 'bullmq';
import * as fs from 'fs-extra';
import { VideoService, VideoChunk } from '../video/video.service';
import { AggregationService, AggregatedResult } from '../aggregation/aggregation.service';
import { ChunkJobData, ChunkJobResult } from '../queue/processors/chunk.processor';
import { YoutubeUtil } from '../common/utils/youtube.util';
import { CacheService } from '../cache/cache.service';
import {
  InvalidYouTubeUrlException,
  VideoProcessingException,
  VideoChunkingException,
} from '../common/exceptions/app.exceptions';
import { AppConstants } from '../common/constants/app.constants';
import { createRedisConfig } from '../common/config/redis.config';

@Injectable()
export class AnalyzeService {
  private readonly logger = new Logger(AnalyzeService.name);

  private queueEvents: QueueEvents | null = null;

  constructor(
    private videoService: VideoService,
    private aggregationService: AggregationService,
    private configService: ConfigService,
    private cacheService: CacheService,
    @InjectQueue(AppConstants.QUEUE_NAME) private chunkQueue: Queue<ChunkJobData, ChunkJobResult>,
  ) {
    this.initializeQueueEvents();
  }

  private initializeQueueEvents(): void {
    try {
      const redisConfig = createRedisConfig(this.configService);
      this.queueEvents = new QueueEvents(AppConstants.QUEUE_NAME, {
        connection: redisConfig,
      });

      this.queueEvents.on('error', (error) => {
        this.logger.error('QueueEvents Redis connection error:', error);
      });

      this.logger.log('QueueEvents initialized successfully');
    } catch (error: any) {
      this.logger.warn('Failed to create QueueEvents, will use polling fallback', error?.message || error);
    }
  }

  async analyzeVideo(youtubeUrl: string): Promise<AggregatedResult> {
    this.logger.log(`Starting analysis for: ${youtubeUrl}`);

    const videoId = this.validateAndExtractVideoId(youtubeUrl);
    const cachedResult = await this.getCachedResult(videoId);
    if (cachedResult) {
      return cachedResult;
    }

    let chunks: VideoChunk[] = [];

    try {
      chunks = await this.videoService.downloadAndChunk(youtubeUrl);
      this.logger.log(`Video chunked into ${chunks.length} segments`);

      const verifiedChunks = await this.verifyChunks(chunks);
      const results = await this.processChunks(verifiedChunks);
      const aggregated = this.aggregationService.aggregateResults(results);

      await this.cacheResult(videoId, aggregated);
      await this.videoService.cleanupChunks(chunks);

      this.logger.log(`Analysis complete. Overall mood: ${aggregated.overall_mood}`);
      return aggregated;
    } catch (error: any) {
      this.logger.error(`Analysis error: ${error.message}`);
      if (chunks.length > 0) {
        await this.videoService.cleanupChunks(chunks).catch(() => {});
      }
      throw error;
    }
  }

  private validateAndExtractVideoId(youtubeUrl: string): string {
    if (!YoutubeUtil.isValidUrl(youtubeUrl)) {
      throw new InvalidYouTubeUrlException(youtubeUrl);
    }

    const videoId = YoutubeUtil.getVideoId(youtubeUrl);
    if (!videoId) {
      throw new InvalidYouTubeUrlException(youtubeUrl);
    }

    return videoId;
  }

  private async getCachedResult(videoId: string): Promise<AggregatedResult | null> {
    if (!this.cacheService.isCacheAvailable()) {
      this.logger.debug('Cache not available');
      return null;
    }

    this.logger.debug(`Checking cache for video: ${videoId}`);
    const cachedResult = await this.cacheService.getCachedResult(videoId);

    if (cachedResult) {
      this.logger.log(`Cache HIT for video: ${videoId}`);
      return cachedResult;
    }

    this.logger.log(`Cache MISS for video: ${videoId}`);
    return null;
  }

  private async verifyChunks(chunks: VideoChunk[]): Promise<VideoChunk[]> {
    const verifiedChunks: VideoChunk[] = [];

    for (const chunk of chunks) {
      const isValid = await this.verifyChunk(chunk);
      if (isValid) {
        verifiedChunks.push(chunk);
      } else {
        throw new VideoChunkingException(
          `Chunk ${chunk.index} verification failed: files missing or empty`,
        );
      }
    }

    this.logger.log(`Verified ${verifiedChunks.length}/${chunks.length} chunks`);
    return verifiedChunks;
  }

  private async verifyChunk(chunk: VideoChunk): Promise<boolean> {
    try {
      const [videoExists, audioExists] = await Promise.all([
        fs.pathExists(chunk.videoPath),
        fs.pathExists(chunk.audioPath),
      ]);

      if (!videoExists || !audioExists) {
        this.logger.error(`Chunk ${chunk.index} files missing: video=${videoExists}, audio=${audioExists}`);
        return false;
      }

      const [videoStats, audioStats] = await Promise.all([
        fs.stat(chunk.videoPath),
        fs.stat(chunk.audioPath),
      ]);

      if (videoStats.size === 0 || audioStats.size === 0) {
        this.logger.error(`Chunk ${chunk.index} has empty files: video=${videoStats.size}, audio=${audioStats.size}`);
        return false;
      }

      this.logger.debug(`Chunk ${chunk.index} verified: ${videoStats.size + audioStats.size} bytes`);
      return true;
    } catch (error: any) {
      this.logger.error(`Error verifying chunk ${chunk.index}: ${error.message}`);
      return false;
    }
  }

  private async processChunks(chunks: VideoChunk[]): Promise<ChunkJobResult[]> {
    const jobs = await Promise.all(
      chunks.map((chunk) =>
        this.chunkQueue.add('process-chunk', {
          chunk,
          jobId: `chunk-${chunk.index}`,
        } as ChunkJobData),
      ),
    );

    this.logger.log(`Created ${jobs.length} processing jobs`);

    const results = await Promise.all(
      jobs.map((job) => this.waitForJobResult(job)),
    );

    this.logger.log(`All ${results.length} chunks processed`);
    return results;
  }

  private async waitForJobResult(job: Job<ChunkJobData, ChunkJobResult>): Promise<ChunkJobResult> {
    if (this.queueEvents) {
      return (await job.waitUntilFinished(this.queueEvents)) as ChunkJobResult;
    }
    return this.waitForJobCompletion(job);
  }

  private async cacheResult(videoId: string, result: AggregatedResult): Promise<void> {
    if (!this.cacheService.isCacheAvailable()) {
      return;
    }

    const cacheTtl = this.configService.get<number>(
      'CACHE_TTL',
      AppConstants.CACHE_DEFAULT_TTL_SECONDS,
    );

    await this.cacheService.setCachedResult(videoId, result, cacheTtl);
    this.logger.log(`Result cached for video: ${videoId} (TTL: ${cacheTtl}s)`);
  }

  private async waitForJobCompletion(
    job: Job<ChunkJobData, ChunkJobResult>,
  ): Promise<ChunkJobResult> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
      const checkInterval = setInterval(async () => {
        try {
          const jobState = await job.getState();
          if (jobState === 'completed') {
            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            const returnValue = await job.returnvalue;
            resolve(returnValue as ChunkJobResult);
          } else if (jobState === 'failed') {
            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            const failedReason = await job.failedReason;
            reject(new VideoProcessingException(`Job failed: ${failedReason || 'Unknown error'}`));
          }
        } catch (error: any) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          reject(error);
        }
      }, AppConstants.JOB_POLL_INTERVAL_MS);

      timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        reject(new VideoProcessingException(`Job timeout after ${AppConstants.JOB_TIMEOUT_MS / 1000}s`));
      }, AppConstants.JOB_TIMEOUT_MS);
    });
  }
}

