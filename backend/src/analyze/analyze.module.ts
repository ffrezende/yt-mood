import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyzeController } from './analyze.controller';
import { AnalyzeService } from './analyze.service';
import { VideoModule } from '../video/video.module';
import { AggregationModule } from '../aggregation/aggregation.module';
import { QueueModule } from '../queue/queue.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [ConfigModule, VideoModule, AggregationModule, QueueModule, CacheModule],
  controllers: [AnalyzeController],
  providers: [AnalyzeService],
})
export class AnalyzeModule {}





