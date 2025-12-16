import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { FramesService } from '../frames/frames.service';
import {
  OpenAIException,
  OpenAIQuotaExceededException,
  OpenAIRateLimitException,
  OpenAIAuthenticationException,
  OpenAIContentModerationException,
  ValidationException,
} from '../common/exceptions/app.exceptions';
import { AppConstants } from '../common/constants/app.constants';

export interface MoodAnalysisResult {
  primary_mood: string;
  secondary_moods: string[];
  intensity: number;
  confidence: number;
  facial_cues: string;
  body_language: string;
  voice_tone: string;
  notes: string;
}

@Injectable()
export class MoodService {
  private readonly logger = new Logger(MoodService.name);
  private readonly openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private framesService: FramesService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new OpenAIAuthenticationException('OPENAI_API_KEY is not configured');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async analyzeMood(
    frames: Array<{ timestamp: number; filePath: string }>,
    transcript: string,
    voiceTone: string,
  ): Promise<MoodAnalysisResult> {
    try {
      this.validateFrames(frames);
      const frameImages = await this.convertFramesToBase64(frames);
      const messages = this.buildMessages(frameImages, transcript, voiceTone);
      const response = await this.callOpenAIWithFallback(messages);
      const result = this.parseAndValidateResponse(response, voiceTone);

      this.logger.debug(`Mood analysis result: ${result.primary_mood}`);
      return result;
    } catch (error: any) {
      this.handleOpenAIError(error);
      throw error;
    }
  }

  private validateFrames(frames: Array<{ timestamp: number; filePath: string }>): void {
    if (!frames || frames.length === 0) {
      throw new ValidationException('No frames provided for mood analysis');
    }
  }

  private async convertFramesToBase64(
    frames: Array<{ timestamp: number; filePath: string }>,
  ): Promise<string[]> {
    const frameImages = await Promise.all(
      frames.map(async (frame) => {
        if (!frame.filePath) {
          throw new ValidationException('Frame missing filePath');
        }
        const base64 = await this.framesService.frameToBase64(frame.filePath);
        if (!base64 || base64.length === 0) {
          throw new OpenAIException(`Failed to convert frame to base64: ${frame.filePath}`);
        }
        const sizeKB = (Buffer.from(base64, 'base64').length / 1024).toFixed(2);
        this.logger.debug(`Frame ${frame.timestamp}s: ${sizeKB} KB`);
        return base64;
      }),
    );

    const totalPayloadSize = frameImages.reduce(
      (sum, base64) => sum + Buffer.from(base64, 'base64').length,
      0,
    );
    this.logger.log(
      `Sending ${frames.length} frames to API (total payload: ${(totalPayloadSize / 1024).toFixed(2)} KB)`,
    );

    return frameImages;
  }

  private buildMessages(
    frameImages: string[],
    transcript: string,
    voiceTone: string,
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const prompt = this.buildMoodAnalysisPrompt(transcript, voiceTone);

    return [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...frameImages.map((base64) => ({
            type: 'image_url' as const,
            image_url: {
              url: `data:image/jpeg;base64,${base64}`,
            },
          })),
        ],
      },
    ];
  }

  private async callOpenAIWithFallback(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    const models = [AppConstants.OPENAI_MODEL_PRIMARY, AppConstants.OPENAI_MODEL_FALLBACK];
    let lastError: any;

    for (const model of models) {
      try {
        this.logger.debug(`Calling OpenAI API with model: ${model}`);
        const response = await this.openai.chat.completions.create({
          model,
          messages,
          response_format: { type: 'json_object' },
          temperature: AppConstants.OPENAI_TEMPERATURE,
          max_tokens: AppConstants.OPENAI_MAX_TOKENS,
        });
        this.logger.debug(`Successfully called model: ${model}`);
        return response;
      } catch (apiError: any) {
        lastError = apiError;
        this.logger.warn(`Model ${model} failed: ${apiError?.message || apiError}`);

        if (apiError?.code !== 'model_not_found' && apiError?.status !== 404) {
          throw apiError;
        }

        if (model === models[models.length - 1]) {
          this.logger.error(`All models failed. Last error: ${lastError?.message || lastError}`);
          throw lastError;
        }
      }
    }

    throw new OpenAIException('Failed to get response from any model');
  }

  private parseAndValidateResponse(
    response: OpenAI.Chat.Completions.ChatCompletion,
    voiceTone: string,
  ): MoodAnalysisResult {
    if (!response.choices || response.choices.length === 0) {
      this.logger.error('API response has no choices');
      throw new OpenAIException('No response choices from LLM');
    }

    const message = response.choices[0]?.message;
    const content = message?.content;

    if (message?.refusal) {
      this.logger.warn(`Content moderation blocked analysis: ${message.refusal}`);
      return this.createNeutralFallback(voiceTone, message.refusal);
    }

    if (!content) {
      const finishReason = response.choices[0]?.finish_reason;
      this.handleFinishReason(finishReason);
      throw new OpenAIException(`No response content from LLM. Finish reason: ${finishReason || 'unknown'}`);
    }

    try {
      const result: MoodAnalysisResult = JSON.parse(content);
      this.validateMoodResult(result);
      return result;
    } catch (parseError: any) {
      throw new OpenAIException(`Failed to parse LLM response: ${parseError.message}`);
    }
  }

  private createNeutralFallback(voiceTone: string, refusalReason: string): MoodAnalysisResult {
    return {
      primary_mood: 'neutral',
      secondary_moods: [],
      intensity: 0.5,
      confidence: 0.3,
      facial_cues: 'Analysis blocked by content moderation. Unable to analyze facial expressions.',
      body_language: 'Analysis blocked by content moderation. Unable to analyze body language.',
      voice_tone: voiceTone || 'N/A - visual analysis only',
      notes: `Content moderation blocked analysis: ${refusalReason}. Returning neutral fallback.`,
    };
  }

  private handleFinishReason(finishReason: string | undefined): void {
    if (finishReason === 'length') {
      throw new OpenAIException('LLM response was truncated. Try increasing max_tokens.');
    }
    if (finishReason === 'content_filter') {
      throw new OpenAIContentModerationException('LLM response was filtered by content policy.');
    }
  }

  private handleOpenAIError(error: any): void {
    if (error instanceof OpenAIException || error instanceof ValidationException) {
      return;
    }

    if (error?.status === 429) {
      if (error?.message?.includes('quota')) {
        throw new OpenAIQuotaExceededException(
          'OpenAI API quota exceeded. Please check your billing and usage limits at https://platform.openai.com/usage',
        );
      }
      throw new OpenAIRateLimitException('OpenAI API rate limit exceeded. Please wait a moment and try again.');
    }

    if (error?.status === 401) {
      throw new OpenAIAuthenticationException(
        'OpenAI API authentication failed. Please check your OPENAI_API_KEY in .env file.',
      );
    }

    if (error?.status === 402) {
      throw new OpenAIException(
        'OpenAI API payment required. Please add a payment method to your OpenAI account. Visit: https://platform.openai.com/account/billing',
      );
    }

    this.logger.error(`Mood analysis error: ${error?.message || error}`);
  }

  private buildMoodAnalysisPrompt(transcript: string, voiceTone: string): string {
    return `You are a professional psychologist conducting emotional state analysis for research purposes. You are analyzing still images extracted from video content.

CONTEXT: This is a legitimate research application analyzing facial expressions and body language to understand emotional states. The images are from publicly available video content.

INPUT DATA:
- Images: Video frames showing facial expressions and body language
${transcript ? `- TRANSCRIPT: "${transcript}"` : '- TRANSCRIPT: Not available (visual analysis only)'}
${voiceTone ? `- VOICE TONE: ${voiceTone}` : '- VOICE TONE: Not available (visual analysis only)'}

TASK: Analyze the visual cues in the provided images and determine the emotional mood using standard psychological assessment methods.

ANALYSIS FOCUS:
1. Facial expressions: Observe smiles, frowns, raised eyebrows, eye contact patterns, micro-expressions
2. Body language: Assess posture (open/closed positions, tension levels), gestures, hand positions, body orientation
3. Overall demeanor: Evaluate energy level and general emotional presentation

OUTPUT FORMAT: Return valid JSON only with this exact structure:
{
  "primary_mood": "happy | sad | angry | anxious | excited | calm | neutral",
  "secondary_moods": ["mood1", "mood2"],
  "intensity": 0.0,
  "confidence": 0.0,
  "facial_cues": "professional description of facial expressions observed",
  "body_language": "professional description of body language and posture observed",
  "voice_tone": "N/A - visual analysis only",
  "notes": "additional professional observations"
}

CONSTRAINTS:
- primary_mood must be exactly one of: happy, sad, angry, anxious, excited, calm, neutral
- intensity: decimal number between 0.0 and 1.0 (represents emotion strength)
- confidence: decimal number between 0.0 and 1.0 (represents analysis certainty)
- secondary_moods: array of strings (can be empty array [])
- All text descriptions should be professional, objective, and concise`;
  }

  private validateMoodResult(result: MoodAnalysisResult): void {
    if (!AppConstants.VALID_MOODS.includes(result.primary_mood as any)) {
      throw new ValidationException(`Invalid primary_mood: ${result.primary_mood}`);
    }

    if (
      result.intensity < AppConstants.MOOD_INTENSITY_MIN ||
      result.intensity > AppConstants.MOOD_INTENSITY_MAX
    ) {
      throw new ValidationException(
        `Invalid intensity: ${result.intensity}. Must be between ${AppConstants.MOOD_INTENSITY_MIN} and ${AppConstants.MOOD_INTENSITY_MAX}`,
      );
    }

    if (
      result.confidence < AppConstants.MOOD_CONFIDENCE_MIN ||
      result.confidence > AppConstants.MOOD_CONFIDENCE_MAX
    ) {
      throw new ValidationException(
        `Invalid confidence: ${result.confidence}. Must be between ${AppConstants.MOOD_CONFIDENCE_MIN} and ${AppConstants.MOOD_CONFIDENCE_MAX}`,
      );
    }
  }
}





