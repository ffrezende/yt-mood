import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs-extra';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Transcribe audio using OpenAI Whisper
   * Audio must be 16kHz WAV format
   */
  async transcribe(audioPath: string): Promise<string> {
    try {
      this.logger.debug(`Transcribing audio: ${audioPath}`);

      // Check if file exists before attempting transcription
      if (!(await fs.pathExists(audioPath))) {
        throw new Error(`Audio file does not exist: ${audioPath}`);
      }

      // Check file size (empty files will cause errors)
      const stats = await fs.stat(audioPath);
      if (stats.size === 0) {
        throw new Error(`Audio file is empty: ${audioPath}`);
      }

      this.logger.debug(`Audio file exists, size: ${stats.size} bytes`);

      // Call Whisper API using file stream
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath) as any,
        model: 'whisper-1',
        language: 'en', // Can be made configurable
      });

      const text = transcription.text.trim();
      this.logger.debug(`Transcription: ${text}`);
      return text;
    } catch (error: any) {
      // Handle OpenAI API errors with helpful messages
      if (error?.status === 429) {
        if (error?.message?.includes('quota')) {
          throw new Error(
            'OpenAI API quota exceeded. Please check your billing at https://platform.openai.com/usage'
          );
        } else {
          throw new Error('OpenAI API rate limit exceeded. Please wait and try again.');
        }
      }
      
      this.logger.error(`Transcription error: ${error?.message || error}`);
      if (error?.message?.includes('ENOENT') || error?.message?.includes('does not exist')) {
        throw new Error(`Audio file not found: ${audioPath}. The audio extraction may have failed.`);
      }
      throw new Error(`Failed to transcribe audio: ${error?.message || error}`);
    }
  }

  /**
   * Analyze voice tone characteristics from audio
   * This is a placeholder - in production, you might use audio analysis libraries
   * or additional ML models to extract pitch, speed, energy, etc.
   */
  async analyzeVoiceTone(audioPath: string): Promise<string> {
    // For now, return a placeholder
    // In production, you could use librosa, essentia, or similar tools
    // to extract: pitch, tempo, energy, spectral features
    return 'Voice tone analysis would extract pitch, speed, and energy here';
  }
}

