import { ConfigService } from '@nestjs/config';
import { AppConstants } from '../constants/app.constants';

/**
 * Redis configuration factory
 * Centralizes Redis connection configuration
 */
export function createRedisConfig(configService: ConfigService) {
  const redisConfig: any = {
    host: configService.get<string>('REDIS_HOST', AppConstants.REDIS_DEFAULT_HOST),
    port: configService.get<number>('REDIS_PORT', AppConstants.REDIS_DEFAULT_PORT),
    retryStrategy: (times: number) => {
      const delay = Math.min(times * AppConstants.REDIS_RETRY_DELAY_MS, AppConstants.REDIS_MAX_RETRY_DELAY_MS);
      return delay;
    },
    maxRetriesPerRequest: AppConstants.REDIS_MAX_RETRIES,
    connectTimeout: AppConstants.REDIS_CONNECTION_TIMEOUT_MS,
  };

  // Only add password if it's set (not empty string)
  const password = configService.get<string>('REDIS_PASSWORD');
  if (password && password.trim() !== '') {
    redisConfig.password = password;
  }

  return redisConfig;
}

