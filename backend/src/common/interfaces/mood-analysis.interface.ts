export interface IMoodAnalysisResult {
  primary_mood: string;
  secondary_moods: string[];
  intensity: number;
  confidence: number;
  facial_cues: string;
  body_language: string;
  voice_tone: string;
  notes: string;
}

export interface IMoodTimelineEntry {
  start: number;
  end: number;
  mood: string;
  confidence: number;
  frameImage?: string;
}

export interface IAggregatedResult {
  overall_mood: string;
  mood_timeline: IMoodTimelineEntry[];
  emotional_variability: number;
}

export interface IMoodService {
  analyzeMood(
    frames: Array<{ timestamp: number; filePath: string }>,
    transcript: string,
    voiceTone: string,
  ): Promise<IMoodAnalysisResult>;
}

