import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly code?: string,
  ) {
    super({ message, code }, status);
  }
}

export class VideoProcessingException extends AppException {
  constructor(message: string, code?: string) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, code || 'VIDEO_PROCESSING_ERROR');
  }
}

export class VideoDownloadException extends VideoProcessingException {
  constructor(message: string) {
    super(message, 'VIDEO_DOWNLOAD_ERROR');
  }
}

export class VideoChunkingException extends VideoProcessingException {
  constructor(message: string) {
    super(message, 'VIDEO_CHUNKING_ERROR');
  }
}

export class FrameExtractionException extends VideoProcessingException {
  constructor(message: string) {
    super(message, 'FRAME_EXTRACTION_ERROR');
  }
}

export class YouTubeException extends AppException {
  constructor(message: string, code?: string) {
    super(message, HttpStatus.BAD_REQUEST, code || 'YOUTUBE_ERROR');
  }
}

export class InvalidYouTubeUrlException extends YouTubeException {
  constructor(url: string) {
    super(`Invalid YouTube URL: ${url}`, 'INVALID_YOUTUBE_URL');
  }
}

export class YouTubeVideoUnavailableException extends YouTubeException {
  constructor(reason: string) {
    super(`Video unavailable: ${reason}`, 'YOUTUBE_VIDEO_UNAVAILABLE');
  }
}

export class YouTubeAgeRestrictedException extends YouTubeException {
  constructor() {
    super('Video is age-restricted and cannot be processed without authentication', 'YOUTUBE_AGE_RESTRICTED');
  }
}

export class OpenAIException extends AppException {
  constructor(message: string, code?: string) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, code || 'OPENAI_ERROR');
  }
}

export class OpenAIQuotaExceededException extends OpenAIException {
  constructor(message: string) {
    super(message, 'OPENAI_QUOTA_EXCEEDED');
  }
}

export class OpenAIRateLimitException extends OpenAIException {
  constructor(message: string) {
    super(message, 'OPENAI_RATE_LIMIT');
  }
}

export class OpenAIAuthenticationException extends OpenAIException {
  constructor(message: string) {
    super(message, 'OPENAI_AUTH_ERROR');
  }
}

export class OpenAIContentModerationException extends OpenAIException {
  constructor(message: string) {
    super(message, 'OPENAI_CONTENT_MODERATION');
  }
}

export class CacheException extends AppException {
  constructor(message: string, code?: string) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, code || 'CACHE_ERROR');
  }
}

export class ValidationException extends AppException {
  constructor(message: string, code?: string) {
    super(message, HttpStatus.BAD_REQUEST, code || 'VALIDATION_ERROR');
  }
}

