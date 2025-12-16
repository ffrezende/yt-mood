import { Controller, Post, Body, Get, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { AnalyzeService } from './analyze.service';
import { CacheService } from '../cache/cache.service';
import { AnalyzeVideoDto } from './dto/analyze-video.dto';
import { InvalidateCacheDto } from './dto/invalidate-cache.dto';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { InvalidYouTubeUrlException } from '../common/exceptions/app.exceptions';
import { YoutubeUtil } from '../common/utils/youtube.util';

@Controller('analyze')
export class AnalyzeController {
  constructor(
    private analyzeService: AnalyzeService,
    private cacheService: CacheService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async analyze(@Body() dto: AnalyzeVideoDto): Promise<ApiResponseDto<any>> {
    if (!YoutubeUtil.isValidUrl(dto.youtubeUrl)) {
      throw new InvalidYouTubeUrlException(dto.youtubeUrl);
    }

    const result = await this.analyzeService.analyzeVideo(dto.youtubeUrl);
    return ApiResponseDto.success(result);
  }

  @Get('cache/stats')
  async getCacheStats(): Promise<ApiResponseDto<any>> {
    const stats = await this.cacheService.getCacheStats();
    return ApiResponseDto.success(stats);
  }

  @Delete('cache/:videoId')
  @HttpCode(HttpStatus.OK)
  async invalidateCache(@Param('videoId') videoId: string): Promise<ApiResponseDto<void>> {
    await this.cacheService.invalidateCache(videoId);
    return ApiResponseDto.successWithoutData(`Cache invalidated for video: ${videoId}`);
  }

  @Delete('cache')
  @HttpCode(HttpStatus.OK)
  async invalidateCacheByUrl(@Body() dto: InvalidateCacheDto): Promise<ApiResponseDto<void>> {
    if (!YoutubeUtil.isValidUrl(dto.youtubeUrl)) {
      throw new InvalidYouTubeUrlException(dto.youtubeUrl);
    }

    const videoId = YoutubeUtil.getVideoId(dto.youtubeUrl);
    if (!videoId) {
      throw new InvalidYouTubeUrlException(dto.youtubeUrl);
    }

    await this.cacheService.invalidateCache(videoId);
    return ApiResponseDto.successWithoutData(`Cache invalidated for video: ${videoId}`);
  }
}





