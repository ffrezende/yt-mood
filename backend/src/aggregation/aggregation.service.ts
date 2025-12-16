import { Injectable, Logger } from '@nestjs/common';
import { MoodAnalysisResult } from '../mood/mood.service';

export interface MoodTimelineEntry {
  start: number;
  end: number;
  mood: string;
  confidence: number;
  frameImage?: string; // Base64 encoded representative frame image
}

export interface AggregatedResult {
  overall_mood: string;
  mood_timeline: MoodTimelineEntry[];
  emotional_variability: number;
}

@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);

  /**
   * Aggregate mood analysis results from all chunks
   */
  aggregateResults(
    chunkResults: Array<{
      chunkIndex: number;
      startTime: number;
      endTime: number;
      moodResult: MoodAnalysisResult;
      frameImage?: string;
    }>,
  ): AggregatedResult {
    this.logger.log(`Aggregating ${chunkResults.length} chunk results`);

    // Build timeline with frame images
    const timeline: MoodTimelineEntry[] = chunkResults.map((chunk) => {
      const entry: MoodTimelineEntry = {
        start: chunk.startTime,
        end: chunk.endTime,
        mood: chunk.moodResult.primary_mood,
        confidence: chunk.moodResult.confidence,
      };
      
      // Include frame image if available
      if (chunk.frameImage && chunk.frameImage.length > 0) {
        entry.frameImage = chunk.frameImage;
        this.logger.debug(`Including frame image for chunk ${chunk.chunkIndex} (${chunk.frameImage.length} chars)`);
      } else {
        this.logger.debug(`No frame image available for chunk ${chunk.chunkIndex}`);
      }
      
      return entry;
    });
    
    const framesWithImages = timeline.filter(entry => entry.frameImage).length;
    this.logger.log(`Timeline created: ${timeline.length} entries, ${framesWithImages} with frame images`);

    // Calculate overall mood (most frequent mood weighted by confidence)
    const overallMood = this.calculateOverallMood(chunkResults);

    // Calculate emotional variability (standard deviation of mood changes)
    const variability = this.calculateEmotionalVariability(chunkResults);

    return {
      overall_mood: overallMood,
      mood_timeline: timeline,
      emotional_variability: variability,
    };
  }

  /**
   * Calculate overall mood from chunk results
   * Uses weighted average based on confidence scores
   */
  private calculateOverallMood(
    chunkResults: Array<{ moodResult: MoodAnalysisResult }>,
  ): string {
    // Count mood occurrences weighted by confidence
    const moodScores: Record<string, number> = {};

    for (const chunk of chunkResults) {
      const mood = chunk.moodResult.primary_mood;
      const confidence = chunk.moodResult.confidence;
      moodScores[mood] = (moodScores[mood] || 0) + confidence;
    }

    // Find mood with highest score
    let maxScore = 0;
    let overallMood = 'neutral';

    for (const [mood, score] of Object.entries(moodScores)) {
      if (score > maxScore) {
        maxScore = score;
        overallMood = mood;
      }
    }

    return overallMood;
  }

  /**
   * Calculate emotional variability
   * Measures how much the mood changes across chunks (0 = no change, 1 = high variability)
   */
  private calculateEmotionalVariability(
    chunkResults: Array<{ moodResult: MoodAnalysisResult }>,
  ): number {
    if (chunkResults.length <= 1) {
      return 0;
    }

    // Count mood transitions
    let transitions = 0;
    for (let i = 1; i < chunkResults.length; i++) {
      const prevMood = chunkResults[i - 1].moodResult.primary_mood;
      const currMood = chunkResults[i].moodResult.primary_mood;
      if (prevMood !== currMood) {
        transitions++;
      }
    }

    // Normalize to 0-1 range
    const maxPossibleTransitions = chunkResults.length - 1;
    return transitions / maxPossibleTransitions;
  }
}





