import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs-extra';

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);

  /**
   * Read audio file and return buffer
   * Audio is already extracted as 16kHz WAV by VideoService
   */
  async readAudioFile(audioPath: string): Promise<Buffer> {
    try {
      const buffer = await fs.readFile(audioPath);
      this.logger.debug(`Read audio file: ${audioPath} (${buffer.length} bytes)`);
      return buffer;
    } catch (error) {
      this.logger.error(`Failed to read audio file ${audioPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Get audio file size (for logging/debugging)
   */
  async getAudioFileSize(audioPath: string): Promise<number> {
    const stats = await fs.stat(audioPath);
    return stats.size;
  }
}





