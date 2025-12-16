import { IsString, IsUrl, IsNotEmpty } from 'class-validator';

/**
 * DTO for video analysis request
 */
export class AnalyzeVideoDto {
  @IsString()
  @IsNotEmpty({ message: 'YouTube URL is required' })
  @IsUrl({}, { message: 'Must be a valid URL' })
  youtubeUrl: string;
}

