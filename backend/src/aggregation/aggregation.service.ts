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

    const timeline: MoodTimelineEntry[] = chunkResults.map((chunk) => {
      const entry: MoodTimelineEntry = {
        start: chunk.startTime,
        end: chunk.endTime,
        mood: chunk.moodResult.primary_mood,
        confidence: chunk.moodResult.confidence,
      };
      
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

    const overallMood = this.calculateOverallMood(chunkResults);
    const variability = this.calculateEmotionalVariability(chunkResults);

    return {
      overall_mood: overallMood,
      mood_timeline: timeline,
      emotional_variability: variability,
    };
  }

  private calculateOverallMood(
    chunkResults: Array<{ moodResult: MoodAnalysisResult }>,
  ): string {
    const moodScores: Record<string, number> = {};

    for (const chunk of chunkResults) {
      const mood = chunk.moodResult.primary_mood;
      const confidence = chunk.moodResult.confidence;
      moodScores[mood] = (moodScores[mood] || 0) + confidence;
    }

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

  private calculateEmotionalVariability(
    chunkResults: Array<{ moodResult: MoodAnalysisResult }>,
  ): number {
    if (chunkResults.length <= 1) {
      return 0;
    }

    let transitions = 0;
    for (let i = 1; i < chunkResults.length; i++) {
      const prevMood = chunkResults[i - 1].moodResult.primary_mood;
      const currMood = chunkResults[i].moodResult.primary_mood;
      if (prevMood !== currMood) {
        transitions++;
      }
    }

    const maxPossibleTransitions = chunkResults.length - 1;
    return transitions / maxPossibleTransitions;
  }
}





