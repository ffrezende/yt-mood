import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

export class RedisUtil {
  private static readonly logger = new Logger(RedisUtil.name);

  static async testConnection(
    host: string = 'localhost',
    port: number = 6379,
    password?: string,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const config: any = {
        host,
        port,
        retryStrategy: () => null,
        connectTimeout: 5000,
        lazyConnect: true,
        maxRetriesPerRequest: null,
      };

      if (password && password.trim() !== '') {
        config.password = password;
      }

      const client = new Redis(config);
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          try {
            if (client.status === 'ready' || client.status === 'connecting') {
              client.disconnect();
            }
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      };

      client.on('ready', () => {
        this.logger.log(`✅ Redis connection successful: ${host}:${port}`);
        cleanup();
        resolve(true);
      });

      client.on('error', (error) => {
        if (!resolved) {
          this.logger.error(`❌ Redis connection failed: ${error.message}`);
          cleanup();
          resolve(false);
        }
      });

      client.connect().catch((error: any) => {
        if (!resolved) {
          this.logger.error(`❌ Redis connection failed: ${error?.message || error}`);
          cleanup();
          resolve(false);
        }
      });

      setTimeout(() => {
        if (!resolved) {
          this.logger.error('❌ Redis connection timeout');
          cleanup();
          resolve(false);
        }
      }, 5000);
    });
  }
}

