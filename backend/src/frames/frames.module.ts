import { Module } from '@nestjs/common';
import { FramesService } from './frames.service';

@Module({
  providers: [FramesService],
  exports: [FramesService],
})
export class FramesModule {}





