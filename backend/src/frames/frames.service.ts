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
    FfmpegUtil.configure();
  }

  async extractFrames(videoPath: string): Promise<ExtractedFrame[]> {
    const frames: ExtractedFrame[] = [];
    const outputDir = TempFileUtil.createTempDir();
    await fs.ensureDir(outputDir);

    const timestamps = [0, 7.5];

    for (const timestamp of timestamps) {
      const framePath = path.join(outputDir, `frame_${timestamp}s.jpg`);

      try {
        await this.extractFrameAtTime(videoPath, framePath, timestamp);
        
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

  private async extractFrameAtTime(
    videoPath: string,
    outputPath: string,
    timestamp: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(timestamp)
        .frames(1)
        .videoFilters('scale=512:-1')
        .outputOptions('-q:v', '5')
        .output(outputPath)
        .on('end', async () => {
          try {
            const stats = await fs.stat(outputPath);
            this.logger.debug(`Frame extracted: ${outputPath} (${(stats.size / 1024).toFixed(2)} KB)`);
          } catch {
          }
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        })
        .run();
    });
  }

  async frameToBase64(framePath: string): Promise<string> {
    const buffer = await fs.readFile(framePath);
    return buffer.toString('base64');
  }

  async cleanupFrames(frames: ExtractedFrame[]): Promise<void> {
    for (const frame of frames) {
      await TempFileUtil.cleanup(frame.filePath).catch(() => {});
    }
    if (frames.length > 0) {
      const parentDir = path.dirname(frames[0].filePath);
      await TempFileUtil.cleanup(parentDir).catch(() => {});
    }
  }
}


