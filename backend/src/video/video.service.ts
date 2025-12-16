import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
// Using @distube/ytdl-core via npm alias (ytdl-core@npm:@distube/ytdl-core)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ytdl = require('ytdl-core');
import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs-extra';
import { TempFileUtil } from '../common/utils/temp-file.util';
import { YoutubeUtil } from '../common/utils/youtube.util';
import { FfmpegUtil } from '../common/utils/ffmpeg.util';

export interface VideoChunk {
  index: number;
  startTime: number;
  endTime: number;
  videoPath: string;
  audioPath: string;
}

@Injectable()
export class VideoService implements OnModuleInit {
  private readonly logger = new Logger(VideoService.name);

  onModuleInit() {
    // Configure fluent-ffmpeg to use the bundled FFmpeg binary
    FfmpegUtil.configure();
  }

  /**
   * Download YouTube video and split into 15-second chunks
   * Returns array of chunk metadata with paths to video and audio files
   */
  async downloadAndChunk(youtubeUrl: string): Promise<VideoChunk[]> {
    // Validate URL
    if (!YoutubeUtil.isValidUrl(youtubeUrl)) {
      throw new Error('Invalid YouTube URL');
    }

    let videoInfo;
    try {
      // Get video info
      this.logger.log(`Fetching video information for: ${youtubeUrl}`);
      videoInfo = await YoutubeUtil.getVideoInfo(youtubeUrl);
    } catch (error: any) {
      this.logger.error(`Failed to get video info: ${error.message}`);
      throw error;
    }

    const duration = parseInt(videoInfo.videoDetails.lengthSeconds);
    if (isNaN(duration) || duration <= 0) {
      throw new Error('Invalid video duration. Cannot process this video.');
    }

    const chunkCount = YoutubeUtil.calculateChunkCount(duration);
    const videoId = YoutubeUtil.getVideoId(youtubeUrl);

    this.logger.log(
      `Processing video: ${videoInfo.videoDetails.title} (${duration}s, ${chunkCount} chunks)`,
    );

    // Create temp directory for this video
    const tempDir = TempFileUtil.createTempDir();
    await fs.ensureDir(tempDir);

    // Download video stream to temp file
    const videoPath = path.join(tempDir, 'video.mp4');
    this.logger.log(`Downloading video to: ${videoPath}`);
    await this.downloadVideo(youtubeUrl, videoPath);
    
    // Verify downloaded video exists and has content
    if (!(await fs.pathExists(videoPath))) {
      throw new Error('Video download failed: file not created');
    }
    const videoStats = await fs.stat(videoPath);
    if (videoStats.size === 0) {
      throw new Error('Video download failed: file is empty');
    }
    this.logger.log(`Video downloaded successfully: ${videoStats.size} bytes`);

    // Split into chunks
    const chunks: VideoChunk[] = [];
    this.logger.log(`Starting chunk extraction for ${chunkCount} chunks...`);
    
    for (let i = 0; i < chunkCount; i++) {
      const startTime = i * 15;
      const endTime = Math.min(startTime + 15, duration);

      const chunkVideoPath = path.join(tempDir, `chunk_${i}_video.mp4`);
      const chunkAudioPath = path.join(tempDir, `chunk_${i}_audio.wav`);

      this.logger.debug(`Extracting chunk ${i}: ${startTime}s - ${endTime}s`);

      try {
        // Extract video chunk
        this.logger.debug(`Extracting video chunk ${i}...`);
        await this.extractVideoChunk(videoPath, chunkVideoPath, startTime, endTime);
        
        // Verify video chunk was created
        if (!(await fs.pathExists(chunkVideoPath))) {
          throw new Error(`Video chunk ${i} extraction failed: file not created`);
        }
        const videoChunkStats = await fs.stat(chunkVideoPath);
        if (videoChunkStats.size === 0) {
          throw new Error(`Video chunk ${i} extraction failed: file is empty`);
        }

        // Extract audio chunk (16kHz WAV)
        this.logger.debug(`Extracting audio chunk ${i}...`);
        await this.extractAudioChunk(videoPath, chunkAudioPath, startTime, endTime);
        
        // Verify audio chunk was created and has content
        if (!(await fs.pathExists(chunkAudioPath))) {
          throw new Error(`Audio chunk ${i} extraction failed: file not created`);
        }
        
        const audioStats = await fs.stat(chunkAudioPath);
        if (audioStats.size === 0) {
          throw new Error(`Audio chunk ${i} extraction failed: file is empty`);
        }

        this.logger.debug(`Chunk ${i} extracted successfully (video: ${chunkVideoPath}, audio: ${chunkAudioPath}, ${audioStats.size} bytes)`);

        chunks.push({
          index: i,
          startTime,
          endTime,
          videoPath: chunkVideoPath,
          audioPath: chunkAudioPath,
        });
      } catch (error: any) {
        this.logger.error(`Failed to extract chunk ${i} (${startTime}s-${endTime}s): ${error.message}`);
        // Clean up partial files
        await fs.unlink(chunkVideoPath).catch(() => {});
        await fs.unlink(chunkAudioPath).catch(() => {});
        // Don't throw - continue processing other chunks
        // We'll verify all chunks at the end
      }
    }

    // Verify all chunks were created successfully
    if (chunks.length === 0) {
      await TempFileUtil.cleanup(videoPath).catch(() => {});
      throw new Error('Failed to extract any chunks from the video. Check FFmpeg installation and video format.');
    }

    if (chunks.length < chunkCount) {
      this.logger.warn(
        `Only extracted ${chunks.length} out of ${chunkCount} chunks. Missing chunks will be skipped.`,
      );
    }

    // Verify all chunk files exist before returning
    for (const chunk of chunks) {
      const videoExists = await fs.pathExists(chunk.videoPath);
      const audioExists = await fs.pathExists(chunk.audioPath);
      
      if (!videoExists || !audioExists) {
        this.logger.error(
          `Chunk ${chunk.index} verification failed after extraction: video=${videoExists}, audio=${audioExists}`,
        );
        // Remove invalid chunk from array
        const index = chunks.indexOf(chunk);
        if (index > -1) {
          chunks.splice(index, 1);
        }
      }
    }

    if (chunks.length === 0) {
      await TempFileUtil.cleanup(videoPath).catch(() => {});
      throw new Error('No valid chunks were extracted. All chunk extractions failed.');
    }

    // Clean up original downloaded video only after verification
    this.logger.debug('Cleaning up original video file...');
    await TempFileUtil.cleanup(videoPath);

    this.logger.log(`Successfully created ${chunks.length} chunks (expected ${chunkCount})`);
    return chunks;
  }

  /**
   * Download video stream from YouTube
   * Optimized for mood analysis:
   * - Uses 720p quality (quality '22') which is sufficient for facial expression analysis
   * - Balances download speed with analysis accuracy
   * - Higher quality doesn't significantly improve mood detection but increases processing time
   * - Falls back to 'lowestvideo' if 720p is not available
   */
  private async downloadVideo(url: string, outputPath: string): Promise<void> {
    // Try 720p first (optimal for facial analysis)
    // Fallback to lowest if not available (some videos may not have 720p)
    const qualityOptions = ['22', 'lowestvideo', 'lowest'];
    let lastError: Error | null = null;
    
    for (const quality of qualityOptions) {
      try {
        this.logger.debug(`Attempting download at quality: ${quality}`);
        await this.attemptDownload(url, outputPath, quality);
        this.logger.log(`Video downloaded at quality ${quality}: ${outputPath}`);
        return;
      } catch (error: any) {
        lastError = error;
        this.logger.warn(`Failed to download at quality ${quality}: ${error.message}`);
        
        // If this is the last option, throw the error
        if (quality === qualityOptions[qualityOptions.length - 1]) {
          throw new Error(
            `Failed to download video at any quality. Last error: ${error.message}\n` +
            'This may be due to:\n' +
            '- Video format restrictions\n' +
            '- Network issues\n' +
            '- YouTube API changes'
          );
        }
      }
    }
    
    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('Unknown download error');
  }

  /**
   * Attempt to download video at a specific quality
   */
  private async attemptDownload(
    url: string,
    outputPath: string,
    quality: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let videoStream;
      try {
        videoStream = ytdl(url, {
          quality: quality,
          filter: 'videoandaudio',
        });
      } catch (error: any) {
        reject(new Error(`Failed to create download stream: ${error.message}`));
        return;
      }

      const writeStream = fs.createWriteStream(outputPath);

      videoStream.pipe(writeStream);

      videoStream.on('error', (error: any) => {
        this.logger.error(`Video stream error (quality ${quality}):`, error.message);
        // Clean up partial file
        fs.unlink(outputPath).catch(() => {});
        reject(new Error(`Video download failed: ${error.message}`));
      });

      writeStream.on('finish', () => {
        resolve();
      });

      writeStream.on('error', (error: any) => {
        this.logger.error(`File write error:`, error.message);
        reject(new Error(`Failed to write video file: ${error.message}`));
      });
    });
  }

  /**
   * Extract a video chunk using ffmpeg
   * Command: ffmpeg -i input.mp4 -ss START -t DURATION -c copy output.mp4
   */
  private async extractVideoChunk(
    inputPath: string,
    outputPath: string,
    startTime: number,
    endTime: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const duration = endTime - startTime;

      ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .output(outputPath)
        .on('end', () => {
          this.logger.debug(`Video chunk extracted: ${outputPath}`);
          resolve();
        })
        .on('error', (error) => {
          this.logger.error(`FFmpeg video extraction error: ${error.message}`);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Extract audio chunk as 16kHz WAV
   * Command: ffmpeg -i input.mp4 -ss START -t DURATION -ar 16000 -ac 1 output.wav
   */
  private async extractAudioChunk(
    inputPath: string,
    outputPath: string,
    startTime: number,
    endTime: number,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // Verify input file exists
      if (!(await fs.pathExists(inputPath))) {
        reject(new Error(`Input video file does not exist: ${inputPath}`));
        return;
      }

      const duration = endTime - startTime;

      ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .audioFrequency(16000) // 16kHz
        .audioChannels(1) // Mono
        .audioCodec('pcm_s16le') // WAV format
        .format('wav')
        .output(outputPath)
        .on('end', async () => {
          // Verify output file was created and has content
          try {
            if (!(await fs.pathExists(outputPath))) {
              reject(new Error(`Audio extraction completed but file not found: ${outputPath}`));
              return;
            }
            const stats = await fs.stat(outputPath);
            if (stats.size === 0) {
              reject(new Error(`Audio extraction created empty file: ${outputPath}`));
              return;
            }
            this.logger.debug(`Audio chunk extracted: ${outputPath} (${stats.size} bytes)`);
            resolve();
          } catch (error: any) {
            reject(new Error(`Failed to verify extracted audio file: ${error.message}`));
          }
        })
        .on('error', (error: any) => {
          this.logger.error(`FFmpeg audio extraction error: ${error.message}`);
          // Clean up partial file if it exists
          fs.unlink(outputPath).catch(() => {});
          reject(new Error(`Audio extraction failed: ${error.message}`));
        })
        .run();
    });
  }

  /**
   * Clean up all chunks for a video
   */
  async cleanupChunks(chunks: VideoChunk[]): Promise<void> {
    for (const chunk of chunks) {
      await TempFileUtil.cleanup(chunk.videoPath).catch(() => {});
      await TempFileUtil.cleanup(chunk.audioPath).catch(() => {});
    }
    // Clean up parent directory
    if (chunks.length > 0) {
      const parentDir = path.dirname(chunks[0].videoPath);
      await TempFileUtil.cleanup(parentDir).catch(() => {});
    }
  }
}


