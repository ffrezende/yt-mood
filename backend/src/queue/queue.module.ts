import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChunkProcessor } from './processors/chunk.processor';
import { FramesModule } from '../frames/frames.module';
import { MoodModule } from '../mood/mood.module';
import { createRedisConfig } from '../common/config/redis.config';
import { AppConstants } from '../common/constants/app.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          connection: createRedisConfig(configService),
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: AppConstants.QUEUE_NAME,
    }),
    FramesModule,
    MoodModule,
  ],
  providers: [ChunkProcessor],
  exports: [BullModule],
})
export class QueueModule {}





