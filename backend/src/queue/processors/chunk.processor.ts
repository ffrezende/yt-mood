import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as fs from 'fs-extra';
import { VideoService, VideoChunk } from '../../video/video.service';
import { FramesService } from '../../frames/frames.service';
import { TranscriptionService } from '../../transcription/transcription.service';
import { MoodService, MoodAnalysisResult } from '../../mood/mood.service';
import {
  VideoProcessingException,
  FrameExtractionException,
} from '../../common/exceptions/app.exceptions';
import { AppConstants } from '../../common/constants/app.constants';

export interface ChunkJobData {
  chunk: VideoChunk;
  jobId: string;
}

export interface ChunkJobResult {
  chunkIndex: number;
  startTime: number;
  endTime: number;
  moodResult: MoodAnalysisResult;
  frameImage?: string; // Base64 encoded representative frame image
}

@Processor(AppConstants.QUEUE_NAME)
export class ChunkProcessor extends WorkerHost {
  private readonly logger = new Logger(ChunkProcessor.name);

  constructor(
    private framesService: FramesService,
    private moodService: MoodService,
  ) {
    super();
  }

  async process(job: Job<ChunkJobData, ChunkJobResult>): Promise<ChunkJobResult> {
    const { chunk } = job.data;
    this.logger.log(`Processing chunk ${chunk.index} (${chunk.startTime}s - ${chunk.endTime}s)`);

    let frames: Array<{ timestamp: number; filePath: string }> = [];

    try {
      await this.verifyChunkFiles(chunk);
      frames = await this.extractAndValidateFrames(chunk);
      const moodResult = await this.analyzeMood(frames);
      const frameImage = await this.extractRepresentativeFrame(chunk.index, frames);
      await this.framesService.cleanupFrames(frames);

      this.logger.log(
        `Chunk ${chunk.index} processed: ${moodResult.primary_mood} (confidence: ${moodResult.confidence})`,
      );

      return {
        chunkIndex: chunk.index,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        moodResult,
        frameImage,
      };
    } catch (error: any) {
      this.logger.error(`Error processing chunk ${chunk.index}: ${error.message}`);
      if (frames.length > 0) {
        await this.framesService.cleanupFrames(frames).catch(() => {});
      }
      throw error;
    }
  }

  private async verifyChunkFiles(chunk: VideoChunk): Promise<void> {
    const videoExists = await fs.pathExists(chunk.videoPath);
    if (!videoExists) {
      throw new VideoProcessingException(`Video chunk file does not exist: ${chunk.videoPath}`);
    }
  }

  private async extractAndValidateFrames(
    chunk: VideoChunk,
  ): Promise<Array<{ timestamp: number; filePath: string }>> {
    const frames = await this.framesService.extractFrames(chunk.videoPath);

    if (!frames || frames.length === 0) {
      throw new FrameExtractionException(
        `Failed to extract frames from chunk ${chunk.index}. Cannot analyze mood without visual data.`,
      );
    }

    this.logger.debug(`Extracted ${frames.length} frames for chunk ${chunk.index}`);
    return frames;
  }

  private async analyzeMood(
    frames: Array<{ timestamp: number; filePath: string }>,
  ): Promise<MoodAnalysisResult> {
    return this.moodService.analyzeMood(frames, '', '');
  }

  private async extractRepresentativeFrame(
    chunkIndex: number,
    frames: Array<{ timestamp: number; filePath: string }>,
  ): Promise<string | undefined> {
    if (frames.length === 0) {
      return undefined;
    }

    try {
      const representativeFrame = frames[Math.floor(frames.length / 2)] || frames[0];

      if (!(await fs.pathExists(representativeFrame.filePath))) {
        this.logger.warn(`Frame file missing for chunk ${chunkIndex}: ${representativeFrame.filePath}`);
        return undefined;
      }

      const frameStats = await fs.stat(representativeFrame.filePath);
      if (frameStats.size === 0) {
        this.logger.warn(`Frame file empty for chunk ${chunkIndex}`);
        return undefined;
      }

      const frameImage = await this.framesService.frameToBase64(representativeFrame.filePath);

      if (!frameImage || frameImage.length === 0) {
        this.logger.warn(`Base64 conversion failed for chunk ${chunkIndex}`);
        return undefined;
      }

      const sizeKB = ((frameImage.length * 3) / 4 / 1024).toFixed(2);
      this.logger.debug(`Frame converted to base64 for chunk ${chunkIndex}: ${sizeKB} KB`);

      return frameImage;
    } catch (error: any) {
      this.logger.error(`Failed to extract frame for chunk ${chunkIndex}: ${error.message}`);
      return undefined;
    }
  }
}





