/**
 * Interfaces for video processing domain
 * Defines contracts for services
 */

export interface IVideoChunk {
  index: number;
  startTime: number;
  endTime: number;
  videoPath: string;
  audioPath: string;
}

export interface IExtractedFrame {
  timestamp: number;
  filePath: string;
}

export interface IVideoService {
  downloadAndChunk(youtubeUrl: string): Promise<IVideoChunk[]>;
  cleanupChunks(chunks: IVideoChunk[]): Promise<void>;
}

export interface IFramesService {
  extractFrames(videoPath: string): Promise<IExtractedFrame[]>;
  frameToBase64(framePath: string): Promise<string>;
  cleanupFrames(frames: IExtractedFrame[]): Promise<void>;
}

