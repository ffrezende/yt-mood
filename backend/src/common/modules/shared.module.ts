import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '../../cache/cache.module';

/**
 * Shared module for common functionality
 * Global module that can be imported anywhere
 */
@Global()
@Module({
  imports: [ConfigModule, CacheModule],
  exports: [CacheModule],
})
export class SharedModule {}

