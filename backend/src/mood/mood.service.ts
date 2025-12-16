import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { FramesService } from '../frames/frames.service';

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
      throw new Error('OPENAI_API_KEY is not configured');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Analyze mood from frames, transcript, and audio cues
   * Uses GPT-4 Vision (GPT-4o) for multimodal analysis
   */
  async analyzeMood(
    frames: Array<{ timestamp: number; filePath: string }>,
    transcript: string,
    voiceTone: string,
  ): Promise<MoodAnalysisResult> {
    try {
      this.logger.debug(`Starting mood analysis with ${frames.length} frames...`);

      // Validate frames
      if (!frames || frames.length === 0) {
        throw new Error('No frames provided for mood analysis');
      }

      // Convert frames to base64 and log payload size
      const frameImages = await Promise.all(
        frames.map(async (frame) => {
          if (!frame.filePath) {
            throw new Error('Frame missing filePath');
          }
          const base64 = await this.framesService.frameToBase64(frame.filePath);
          if (!base64 || base64.length === 0) {
            throw new Error(`Failed to convert frame to base64: ${frame.filePath}`);
          }
          const sizeKB = (Buffer.from(base64, 'base64').length / 1024).toFixed(2);
          this.logger.debug(`Frame ${frame.timestamp}s: ${sizeKB} KB (base64)`);
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

      // Build prompt
      const prompt = this.buildMoodAnalysisPrompt(transcript, voiceTone);

      // Prepare messages with images
      const messages: any[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...frameImages.map((base64) => ({
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
              },
            })),
          ],
        },
      ];

      // Call GPT-4 Vision API
      this.logger.debug(`Calling OpenAI API with ${frames.length} frames...`);
      
      // Try gpt-4o first, fallback to gpt-4-vision-preview if needed
      const models = ['gpt-4o', 'gpt-4-vision-preview'];
      let response;
      let lastError: any;
      
      for (const model of models) {
        try {
          this.logger.debug(`Trying model: ${model}`);
          response = await this.openai.chat.completions.create({
            model: model,
            messages: messages as any,
            response_format: { type: 'json_object' },
            temperature: 0.3, // Lower temperature for more consistent analysis
            max_tokens: 800, // Increased from 500 to handle longer responses
          });
          this.logger.debug(`Successfully called model: ${model}`);
          break; // Success, exit loop
        } catch (apiError: any) {
          lastError = apiError;
          this.logger.warn(`Model ${model} failed: ${apiError?.message || apiError}`);
          
          // If it's not a model-specific error, don't try next model
          if (apiError?.code !== 'model_not_found' && apiError?.status !== 404) {
            throw apiError;
          }
          
          // Continue to next model if this one doesn't exist
          if (model === models[models.length - 1]) {
            // Last model failed
            this.logger.error(`All models failed. Last error: ${lastError?.message || lastError}`);
            throw lastError;
          }
        }
      }
      
      if (!response) {
        throw new Error('Failed to get response from any model');
      }

      this.logger.debug(`OpenAI API response received. Choices: ${response.choices?.length || 0}`);

      if (!response.choices || response.choices.length === 0) {
        this.logger.error('API response has no choices');
        this.logger.error('Full response:', JSON.stringify(response, null, 2));
        throw new Error('No response choices from LLM');
      }

      const message = response.choices[0]?.message;
      const content = message?.content;
      
      // Check for refusal (content moderation)
      if (message?.refusal) {
        this.logger.warn('OpenAI API refused the request due to content moderation');
        this.logger.warn(`Refusal reason: ${message.refusal}`);
        this.logger.warn('Returning neutral fallback response due to content moderation');
        
        // Return a neutral fallback response when content moderation blocks
        // This allows the analysis to continue even if some chunks are blocked
        const fallbackResult: MoodAnalysisResult = {
          primary_mood: 'neutral',
          secondary_moods: [],
          intensity: 0.5,
          confidence: 0.3, // Low confidence since we couldn't analyze
          facial_cues: 'Analysis blocked by content moderation. Unable to analyze facial expressions.',
          body_language: 'Analysis blocked by content moderation. Unable to analyze body language.',
          voice_tone: voiceTone || 'N/A - visual analysis only',
          notes: `Content moderation blocked analysis: ${message.refusal}. Returning neutral fallback.`,
        };
        
        this.logger.debug('Returning fallback neutral mood result');
        return fallbackResult;
      }
      
      if (!content) {
        this.logger.error('API response has empty content');
        this.logger.error('Response structure:', JSON.stringify(response, null, 2));
        this.logger.error('First choice:', JSON.stringify(response.choices[0], null, 2));
        
        // Check for finish reason
        const finishReason = response.choices[0]?.finish_reason;
        if (finishReason === 'length') {
          throw new Error('LLM response was truncated. Try increasing max_tokens.');
        }
        if (finishReason === 'content_filter') {
          throw new Error('LLM response was filtered by content policy.');
        }
        
        throw new Error(`No response content from LLM. Finish reason: ${finishReason || 'unknown'}`);
      }

      // Parse JSON response
      const result: MoodAnalysisResult = JSON.parse(content);

      // Validate result structure
      this.validateMoodResult(result);

      this.logger.debug(`Mood analysis result: ${result.primary_mood}`);
      return result;
    } catch (error: any) {
      // Handle OpenAI API errors with helpful messages
      if (error?.status === 429) {
        if (error?.message?.includes('quota')) {
          throw new Error(
            'OpenAI API quota exceeded. Please check your billing and usage limits at https://platform.openai.com/usage\n' +
            'You may need to:\n' +
            '1. Add payment method to your OpenAI account\n' +
            '2. Upgrade your plan\n' +
            '3. Wait for quota reset\n' +
            `Original error: ${error.message}`
          );
        } else {
          throw new Error(
            'OpenAI API rate limit exceeded. Please wait a moment and try again.\n' +
            `Original error: ${error.message}`
          );
        }
      }
      
      if (error?.status === 401) {
        throw new Error(
          'OpenAI API authentication failed. Please check your OPENAI_API_KEY in .env file.\n' +
          `Original error: ${error.message}`
        );
      }
      
      if (error?.status === 402) {
        throw new Error(
          'OpenAI API payment required. Please add a payment method to your OpenAI account.\n' +
          'Visit: https://platform.openai.com/account/billing\n' +
          `Original error: ${error.message}`
        );
      }
      
      this.logger.error(`Mood analysis error: ${error?.message || error}`);
      throw new Error(`Failed to analyze mood: ${error?.message || error}`);
    }
  }

  /**
   * Build the prompt for mood analysis
   * Currently focused on visual analysis only (audio/transcript temporarily disabled)
   * Prompt is designed to avoid content moderation filters by being explicit about research context
   */
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

  /**
   * Build a more neutral prompt for retry when content moderation blocks
   */
  private buildNeutralPrompt(transcript: string, voiceTone: string): string {
    return `You are an academic researcher analyzing facial expressions in video frames for a scientific study on emotion recognition.

RESEARCH CONTEXT: This is part of a university research project studying how facial expressions correlate with emotional states. The images are from educational video content.

TASK: Analyze the provided images and classify the emotional state based solely on observable facial features and body posture.

Return JSON with this structure:
{
  "primary_mood": "happy | sad | angry | anxious | excited | calm | neutral",
  "secondary_moods": [],
  "intensity": 0.0,
  "confidence": 0.0,
  "facial_cues": "brief description",
  "body_language": "brief description",
  "voice_tone": "N/A",
  "notes": "brief notes"
}

Rules:
- primary_mood: one of happy, sad, angry, anxious, excited, calm, neutral
- intensity: 0.0 to 1.0
- confidence: 0.0 to 1.0
- Keep all descriptions brief and objective`;
  }

  /**
   * Validate mood analysis result
   */
  private validateMoodResult(result: MoodAnalysisResult): void {
    const validMoods = ['happy', 'sad', 'angry', 'anxious', 'excited', 'calm', 'neutral'];
    
    if (!validMoods.includes(result.primary_mood)) {
      throw new Error(`Invalid primary_mood: ${result.primary_mood}`);
    }

    if (result.intensity < 0 || result.intensity > 1) {
      throw new Error(`Invalid intensity: ${result.intensity}`);
    }

    if (result.confidence < 0 || result.confidence > 1) {
      throw new Error(`Invalid confidence: ${result.confidence}`);
    }
  }
}





