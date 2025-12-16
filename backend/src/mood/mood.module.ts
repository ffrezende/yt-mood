import { Module } from '@nestjs/common';
import { MoodService } from './mood.service';
import { FramesModule } from '../frames/frames.module';

@Module({
  imports: [FramesModule],
  providers: [MoodService],
  exports: [MoodService],
})
export class MoodModule {}





