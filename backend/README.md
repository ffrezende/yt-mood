# YouTube Mood Analyzer - Backend

Production-ready NestJS backend for analyzing emotional mood from YouTube videos.

## Features

- Downloads YouTube videos using `ytdl-core`
- Chunks videos into 15-second segments using `ffmpeg`
- Extracts frames (2-3 per chunk) for visual analysis
- Transcribes audio using OpenAI Whisper
- Analyzes mood using GPT-4 Vision (multimodal LLM)
- Processes chunks asynchronously using BullMQ + Redis
- **Redis caching** - Avoids re-processing the same videos
- Aggregates results into timeline and summary
- Cleans up all temporary files automatically
- **Professional architecture** - DTOs, interfaces, interceptors, custom exceptions
- **Comprehensive error handling** - Global exception filters and custom error classes

## Prerequisites

- Node.js 18+
- Redis (for BullMQ queue)
- FFmpeg is **bundled** in the package - no need to install separately! 🎉

> **Note:** The application uses `@ffmpeg-installer/ffmpeg` which automatically provides FFmpeg binaries for your platform. If you prefer to use a system-installed FFmpeg, you can remove the package and ensure FFmpeg is in your PATH.

## Installation

```bash
cd backend
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `.env` with your settings:
```env
PORT=3001
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
OPENAI_API_KEY=your_openai_api_key_here
TEMP_DIR=./temp
```

## Running Redis

Make sure Redis is running before starting the backend:

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally and run
redis-server
```

## Running the Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoints

### POST /analyze

Analyze mood from a YouTube video.

**Request:**
```json
{
  "youtubeUrl": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overall_mood": "happy",
    "mood_timeline": [
      {
        "start": 0,
        "end": 15,
        "mood": "happy",
        "confidence": 0.85,
        "frameImage": "base64_encoded_image..."
      }
    ],
    "emotional_variability": 0.2
  }
}
```

### GET /analyze/cache/stats

Get cache statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "available": true,
    "keys": 5
  }
}
```

### DELETE /analyze/cache/:videoId

Invalidate cache for a specific video by ID.

### DELETE /analyze/cache

Invalidate cache by YouTube URL.

## Architecture

- **Video Service**: Downloads and chunks videos
- **Frames Service**: Extracts representative frames
- **Audio Service**: Handles audio file operations
- **Transcription Service**: Whisper integration
- **Mood Service**: GPT-4 Vision multimodal analysis
- **Aggregation Service**: Combines chunk results
- **Queue Processor**: Async chunk processing with BullMQ
- **Cache Service**: Redis-based caching for analysis results

### Code Organization

- **DTOs**: Data Transfer Objects with validation (`analyze/dto/`)
- **Interfaces**: Service contracts (`common/interfaces/`)
- **Interceptors**: Logging and response transformation
- **Exception Filters**: Global error handling
- **Constants**: Centralized configuration values
- **Configuration**: Environment variable validation with Joi

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## Temporary Files

All temporary files are stored in `./temp` (configurable via `TEMP_DIR` env var) and are automatically cleaned up after processing.


