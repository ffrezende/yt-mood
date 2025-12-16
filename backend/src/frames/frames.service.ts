import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs-extra';
import { TempFileUtil } from '../common/utils/temp-file.util';
import { FfmpegUtil } from '../common/utils/ffmpeg.util';

export interface ExtractedFrame {
  timestamp: number;
  filePath: string;
}

@Injectable()
export class FramesService implements OnModuleInit {
  private readonly logger = new Logger(FramesService.name);

  onModuleInit() {
    // Configure fluent-ffmpeg to use the bundled FFmpeg binary
    FfmpegUtil.configure();
  }

  /**
   * Extract representative frames from a video chunk
   * Optimized: Extracts 1-2 frames per chunk to reduce API costs
   * Frames are resized to 512px max width and lower quality to minimize payload size
   */
  async extractFrames(videoPath: string): Promise<ExtractedFrame[]> {
    const frames: ExtractedFrame[] = [];
    const outputDir = TempFileUtil.createTempDir();
    await fs.ensureDir(outputDir);

    // Extract frames at 0s and 7.5s (2 frames per 15s chunk to reduce API costs)
    // Reduced from 3 frames to 2 frames to minimize payload size
    const timestamps = [0, 7.5];

    for (const timestamp of timestamps) {
      const framePath = path.join(outputDir, `frame_${timestamp}s.jpg`);

      try {
        await this.extractFrameAtTime(videoPath, framePath, timestamp);
        
        // Verify frame was created
        if (await fs.pathExists(framePath)) {
          frames.push({
            timestamp,
            filePath: framePath,
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to extract frame at ${timestamp}s: ${error.message}`);
      }
    }

    this.logger.debug(`Extracted ${frames.length} frames from ${videoPath}`);
    return frames;
  }

  /**
   * Extract a single frame at a specific timestamp
   * Optimized for API usage: smaller resolution and lower quality to reduce payload size
   * Command: ffmpeg -i input.mp4 -ss TIMESTAMP -vframes 1 -vf scale=512:-1 -q:v 5 output.jpg
   */
  private async extractFrameAtTime(
    videoPath: string,
    outputPath: string,
    timestamp: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(timestamp)
        .frames(1)
        .videoFilters('scale=512:-1') // Resize to max 512px width, maintain aspect ratio
        .outputOptions('-q:v', '5') // Lower quality (5 instead of 2) - still good for analysis
        .output(outputPath)
        .on('end', async () => {
          // Log file size for monitoring
          try {
            const stats = await fs.stat(outputPath);
            this.logger.debug(`Frame extracted: ${outputPath} (${(stats.size / 1024).toFixed(2)} KB)`);
          } catch {
            // Ignore stats error
          }
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        })
        .run();
    });
  }

  /**
   * Convert frame to base64 for LLM input
   */
  async frameToBase64(framePath: string): Promise<string> {
    const buffer = await fs.readFile(framePath);
    return buffer.toString('base64');
  }

  /**
   * Clean up extracted frames
   */
  async cleanupFrames(frames: ExtractedFrame[]): Promise<void> {
    for (const frame of frames) {
      await TempFileUtil.cleanup(frame.filePath).catch(() => {});
    }
    // Clean up parent directory
    if (frames.length > 0) {
      const parentDir = path.dirname(frames[0].filePath);
      await TempFileUtil.cleanup(parentDir).catch(() => {});
    }
  }
}


