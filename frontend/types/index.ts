export interface MoodTimelineEntry {
  start: number;
  end: number;
  mood: string;
  confidence: number;
  frameImage?: string; // Base64 encoded frame image
}

export interface AnalysisResult {
  overall_mood: string;
  mood_timeline: MoodTimelineEntry[];
  emotional_variability: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

