import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '../../cache/cache.module';

@Global()
@Module({
  imports: [ConfigModule, CacheModule],
  exports: [CacheModule],
})
export class SharedModule {}

