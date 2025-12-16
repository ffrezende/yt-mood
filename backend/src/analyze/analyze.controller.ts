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

  /**
   * Analyze video mood
   * @param dto - Video analysis request DTO
   * @returns Analysis results
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async analyze(@Body() dto: AnalyzeVideoDto): Promise<ApiResponseDto<any>> {
    // Additional validation (DTO validation happens automatically via ValidationPipe)
    if (!YoutubeUtil.isValidUrl(dto.youtubeUrl)) {
      throw new InvalidYouTubeUrlException(dto.youtubeUrl);
    }

    const result = await this.analyzeService.analyzeVideo(dto.youtubeUrl);
    return ApiResponseDto.success(result);
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  @Get('cache/stats')
  async getCacheStats(): Promise<ApiResponseDto<any>> {
    const stats = await this.cacheService.getCacheStats();
    return ApiResponseDto.success(stats);
  }

  /**
   * Invalidate cache for a specific video by ID
   * @param videoId - YouTube video ID
   * @returns Success message
   */
  @Delete('cache/:videoId')
  @HttpCode(HttpStatus.OK)
  async invalidateCache(@Param('videoId') videoId: string): Promise<ApiResponseDto<never>> {
    await this.cacheService.invalidateCache(videoId);
    return ApiResponseDto.success(undefined, `Cache invalidated for video: ${videoId}`);
  }

  /**
   * Invalidate cache by YouTube URL
   * @param dto - Cache invalidation request DTO
   * @returns Success message
   */
  @Delete('cache')
  @HttpCode(HttpStatus.OK)
  async invalidateCacheByUrl(@Body() dto: InvalidateCacheDto): Promise<ApiResponseDto<never>> {
    if (!YoutubeUtil.isValidUrl(dto.youtubeUrl)) {
      throw new InvalidYouTubeUrlException(dto.youtubeUrl);
    }

    const videoId = YoutubeUtil.getVideoId(dto.youtubeUrl);
    if (!videoId) {
      throw new InvalidYouTubeUrlException(dto.youtubeUrl);
    }

    await this.cacheService.invalidateCache(videoId);
    return ApiResponseDto.success(undefined, `Cache invalidated for video: ${videoId}`);
  }
}





