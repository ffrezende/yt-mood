import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { VideoService, VideoChunk } from '../../video/video.service';
import { FramesService } from '../../frames/frames.service';
import { TranscriptionService } from '../../transcription/transcription.service';
import { MoodService, MoodAnalysisResult } from '../../mood/mood.service';
import { TempFileUtil } from '../../common/utils/temp-file.util';

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

@Processor('chunk-processing')
export class ChunkProcessor extends WorkerHost {
  private readonly logger = new Logger(ChunkProcessor.name);

  constructor(
    private videoService: VideoService,
    private framesService: FramesService,
    private transcriptionService: TranscriptionService,
    private moodService: MoodService,
  ) {
    super();
  }

  async process(job: Job<ChunkJobData, ChunkJobResult>): Promise<ChunkJobResult> {
    const { chunk } = job.data;
    this.logger.log(
      `Processing chunk ${chunk.index} (${chunk.startTime}s - ${chunk.endTime}s)`,
    );

    let frames: Array<{ timestamp: number; filePath: string }> = [];
    let transcript = '';
    let voiceTone = '';

    try {
      // Verify chunk files exist before processing
      const fs = require('fs-extra');
      
      if (!(await fs.pathExists(chunk.videoPath))) {
        throw new Error(`Video chunk file does not exist: ${chunk.videoPath}`);
      }
      
      // Audio analysis temporarily disabled - focusing on image analysis
      // if (!(await fs.pathExists(chunk.audioPath))) {
      //   throw new Error(`Audio chunk file does not exist: ${chunk.audioPath}. Audio extraction may have failed.`);
      // }

      this.logger.debug(`Chunk ${chunk.index} files verified, starting processing...`);

      // Step 1: Extract frames
      frames = await this.framesService.extractFrames(chunk.videoPath);
      
      // Validate that we have at least one frame
      if (!frames || frames.length === 0) {
        throw new Error(`Failed to extract any frames from chunk ${chunk.index}. Cannot analyze mood without visual data.`);
      }
      
      this.logger.debug(`Extracted ${frames.length} frames for chunk ${chunk.index}`);

      // Step 2: Transcribe audio (TEMPORARILY DISABLED - focusing on image analysis)
      // transcript = await this.transcriptionService.transcribe(chunk.audioPath);
      // voiceTone = await this.transcriptionService.analyzeVoiceTone(chunk.audioPath);
      transcript = ''; // Empty transcript for now
      voiceTone = ''; // Empty voice tone for now

      // Step 3: Analyze mood using multimodal LLM (image analysis only for now)
      const moodResult = await this.moodService.analyzeMood(frames, transcript, voiceTone);

      // Step 4: Convert representative frame to base64 for frontend display (before cleanup)
      let frameImage: string | undefined;
      if (frames.length > 0) {
        try {
          // Use the middle frame (or first frame) as representative
          const representativeFrame = frames[Math.floor(frames.length / 2)] || frames[0];
          
          // Verify frame file exists before converting
          if (!(await fs.pathExists(representativeFrame.filePath))) {
            this.logger.warn(`Frame file does not exist for chunk ${chunk.index}: ${representativeFrame.filePath}`);
          } else {
            // Verify file has content
            const frameStats = await fs.stat(representativeFrame.filePath);
            if (frameStats.size === 0) {
              this.logger.warn(`Frame file is empty for chunk ${chunk.index}: ${representativeFrame.filePath}`);
            } else {
              frameImage = await this.framesService.frameToBase64(representativeFrame.filePath);
              
              // Verify base64 conversion was successful
              if (!frameImage || frameImage.length === 0) {
                this.logger.warn(`Base64 conversion returned empty string for chunk ${chunk.index}`);
                frameImage = undefined;
              } else {
                const sizeKB = (frameImage.length * 3 / 4 / 1024).toFixed(2); // Approximate size
                this.logger.log(`Converted frame to base64 for chunk ${chunk.index}: ${sizeKB} KB`);
              }
            }
          }
        } catch (error: any) {
          this.logger.error(`Failed to convert frame to base64 for chunk ${chunk.index}: ${error.message}`);
          this.logger.error(`Error stack: ${error.stack}`);
          frameImage = undefined;
        }
      } else {
        this.logger.warn(`No frames available for chunk ${chunk.index} to convert to base64`);
      }

      // Step 5: Clean up temporary files
      await this.framesService.cleanupFrames(frames);

      this.logger.log(
        `Chunk ${chunk.index} processed: ${moodResult.primary_mood} (confidence: ${moodResult.confidence})`,
      );

      return {
        chunkIndex: chunk.index,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        moodResult,
        frameImage, // Include frame image for frontend display
      };
    } catch (error) {
      this.logger.error(`Error processing chunk ${chunk.index}:`, error.message);
      
      // Clean up on error
      if (frames.length > 0) {
        await this.framesService.cleanupFrames(frames).catch(() => {});
      }

      throw error;
    }
  }
}





