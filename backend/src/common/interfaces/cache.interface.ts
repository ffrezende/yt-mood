import { IAggregatedResult } from './mood-analysis.interface';

export interface ICacheService {
  getCachedResult(videoId: string): Promise<IAggregatedResult | null>;
  setCachedResult(videoId: string, result: IAggregatedResult, ttl?: number): Promise<void>;
  invalidateCache(videoId: string): Promise<void>;
  isCacheAvailable(): boolean;
  getCacheStats(): Promise<{ available: boolean; keys: number }>;
}

