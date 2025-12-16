import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChunkProcessor } from './processors/chunk.processor';
import { VideoModule } from '../video/video.module';
import { FramesModule } from '../frames/frames.module';
import { AudioModule } from '../audio/audio.module';
import { TranscriptionModule } from '../transcription/transcription.module';
import { MoodModule } from '../mood/mood.module';
import { createRedisConfig } from '../common/config/redis.config';

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
      name: 'chunk-processing',
    }),
    VideoModule,
    FramesModule,
    AudioModule,
    TranscriptionModule,
    MoodModule,
  ],
  providers: [ChunkProcessor],
  exports: [BullModule],
})
export class QueueModule {}





