import { IsString, IsUrl, IsNotEmpty } from 'class-validator';

/**
 * DTO for cache invalidation request
 */
export class InvalidateCacheDto {
  @IsString()
  @IsNotEmpty({ message: 'YouTube URL is required' })
  @IsUrl({}, { message: 'Must be a valid URL' })
  youtubeUrl: string;
}

