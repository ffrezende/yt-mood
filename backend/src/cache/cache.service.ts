import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AggregatedResult } from '../aggregation/aggregation.service';

/**
 * Cache service for storing video analysis results in Redis
 * Uses video ID as the cache key to avoid re-downloading and re-processing
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private readonly cachePrefix = 'video:analysis:';
  private readonly defaultTtl = 24 * 60 * 60; // 24 hours in seconds

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      const redisConfig: any = {
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      };

      const password = this.configService.get<string>('REDIS_PASSWORD');
      if (password && password.trim() !== '') {
        redisConfig.password = password;
      }

      this.redis = new Redis(redisConfig);

      this.redis.on('connect', () => {
        this.logger.log('Redis cache connected');
      });

      this.redis.on('error', (error) => {
        this.logger.error('Redis cache error:', error.message);
      });

      // Test connection
      await this.redis.ping();
      this.logger.log('Redis cache service initialized');
    } catch (error: any) {
      this.logger.warn(`Failed to initialize Redis cache: ${error.message}`);
      this.logger.warn('Cache will be disabled. Analysis will always process from scratch.');
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis cache connection closed');
    }
  }

  /**
   * Get cache key for a video ID
   */
  private getCacheKey(videoId: string): string {
    return `${this.cachePrefix}${videoId}`;
  }

  /**
   * Get cached analysis result for a video
   * @param videoId YouTube video ID
   * @returns Cached result or null if not found
   */
  async getCachedResult(videoId: string): Promise<AggregatedResult | null> {
    if (!this.redis) {
      return null;
    }

    try {
      const cacheKey = this.getCacheKey(videoId);
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        this.logger.log(`Cache HIT for video: ${videoId}`);
        const result = JSON.parse(cached) as AggregatedResult;
        return result;
      }

      this.logger.debug(`Cache MISS for video: ${videoId}`);
      return null;
    } catch (error: any) {
      this.logger.error(`Error reading from cache for video ${videoId}: ${error.message}`);
      return null; // Return null on error to allow processing to continue
    }
  }

  /**
   * Store analysis result in cache
   * @param videoId YouTube video ID
   * @param result Analysis result to cache
   * @param ttl Time to live in seconds (default: 24 hours)
   */
  async setCachedResult(
    videoId: string,
    result: AggregatedResult,
    ttl: number = this.defaultTtl,
  ): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const cacheKey = this.getCacheKey(videoId);
      const serialized = JSON.stringify(result);

      await this.redis.setex(cacheKey, ttl, serialized);
      this.logger.log(`Cached result for video: ${videoId} (TTL: ${ttl}s)`);
    } catch (error: any) {
      this.logger.error(`Error writing to cache for video ${videoId}: ${error.message}`);
      // Don't throw - caching failure shouldn't break the analysis
    }
  }

  /**
   * Invalidate cache for a video
   * @param videoId YouTube video ID
   */
  async invalidateCache(videoId: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const cacheKey = this.getCacheKey(videoId);
      await this.redis.del(cacheKey);
      this.logger.log(`Cache invalidated for video: ${videoId}`);
    } catch (error: any) {
      this.logger.error(`Error invalidating cache for video ${videoId}: ${error.message}`);
    }
  }

  /**
   * Check if cache is available
   */
  isCacheAvailable(): boolean {
    return this.redis !== null && this.redis.status === 'ready';
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ available: boolean; keys: number }> {
    if (!this.redis || this.redis.status !== 'ready') {
      return { available: false, keys: 0 };
    }

    try {
      const keys = await this.redis.keys(`${this.cachePrefix}*`);
      return { available: true, keys: keys.length };
    } catch (error: any) {
      this.logger.error(`Error getting cache stats: ${error.message}`);
      return { available: false, keys: 0 };
    }
  }
}

