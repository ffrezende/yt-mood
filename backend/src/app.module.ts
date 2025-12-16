import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyzeModule } from './analyze/analyze.module';
import { VideoModule } from './video/video.module';
import { FramesModule } from './frames/frames.module';
import { AudioModule } from './audio/audio.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { MoodModule } from './mood/mood.module';
import { AggregationModule } from './aggregation/aggregation.module';
import { QueueModule } from './queue/queue.module';
import { configValidationSchema } from './common/config/config.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: configValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    QueueModule,
    VideoModule,
    FramesModule,
    AudioModule,
    TranscriptionModule,
    MoodModule,
    AggregationModule,
    AnalyzeModule,
  ],
})
export class AppModule {}





