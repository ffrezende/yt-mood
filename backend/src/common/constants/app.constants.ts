export class AppConstants {
  static readonly CHUNK_DURATION_SECONDS = 15;
  static readonly FRAME_EXTRACTION_INTERVAL_SECONDS = 7.5;
  static readonly FRAME_EXTRACTION_TIMESTAMPS = [0, 7.5];
  static readonly MAX_FRAME_WIDTH_PX = 512;
  static readonly FRAME_JPEG_QUALITY = 5;
  static readonly AUDIO_SAMPLE_RATE = 16000;
  static readonly AUDIO_CHANNELS = 1;

  static readonly VIDEO_QUALITY_PREFERRED = '22';
  static readonly VIDEO_QUALITY_FALLBACK = 'lowestvideo';

  static readonly OPENAI_MODEL_PRIMARY = 'gpt-4o';
  static readonly OPENAI_MODEL_FALLBACK = 'gpt-4-vision-preview';
  static readonly OPENAI_MAX_TOKENS = 800;
  static readonly OPENAI_TEMPERATURE = 0.3;
  static readonly OPENAI_WHISPER_MODEL = 'whisper-1';

  static readonly CACHE_PREFIX = 'video:analysis:';
  static readonly CACHE_DEFAULT_TTL_SECONDS = 24 * 60 * 60;
  static readonly CACHE_KEY_SEPARATOR = ':';

  static readonly REDIS_DEFAULT_HOST = 'localhost';
  static readonly REDIS_DEFAULT_PORT = 6379;
  static readonly REDIS_CONNECTION_TIMEOUT_MS = 5000;
  static readonly REDIS_RETRY_DELAY_MS = 50;
  static readonly REDIS_MAX_RETRY_DELAY_MS = 2000;
  static readonly REDIS_MAX_RETRIES = 3;

  static readonly DEFAULT_PORT = 3001;
  static readonly DEFAULT_FRONTEND_URL = 'http://localhost:3000';

  static readonly QUEUE_NAME = 'chunk-processing';
  static readonly JOB_POLL_INTERVAL_MS = 500;
  static readonly JOB_TIMEOUT_MS = 5 * 60 * 1000;

  static readonly TEMP_DIR = './temp';
  static readonly VIDEO_FILE_NAME = 'video.mp4';
  static readonly CHUNK_VIDEO_PREFIX = 'chunk_';
  static readonly CHUNK_AUDIO_PREFIX = 'chunk_';
  static readonly CHUNK_VIDEO_SUFFIX = '_video.mp4';
  static readonly CHUNK_AUDIO_SUFFIX = '_audio.wav';
  static readonly FRAME_PREFIX = 'frame_';
  static readonly FRAME_SUFFIX = 's.jpg';

  static readonly VALID_MOODS = [
    'happy',
    'sad',
    'angry',
    'anxious',
    'excited',
    'calm',
    'neutral',
  ] as const;

  static readonly MOOD_INTENSITY_MIN = 0.0;
  static readonly MOOD_INTENSITY_MAX = 1.0;
  static readonly MOOD_CONFIDENCE_MIN = 0.0;
  static readonly MOOD_CONFIDENCE_MAX = 1.0;

  static readonly YOUTUBE_INFO_RETRY_ATTEMPTS = 3;
  static readonly YOUTUBE_RETRY_DELAY_MS = 1000;
}

export type ValidMood = typeof AppConstants.VALID_MOODS[number];

