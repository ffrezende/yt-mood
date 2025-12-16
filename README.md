# YouTube Mood Analyzer

A production-ready application that analyzes the emotional mood of people appearing in YouTube videos using multimodal AI analysis.

## Architecture

- **Frontend**: Next.js 14 (App Router, TypeScript) - UI for submitting videos and viewing results
- **Backend**: NestJS (TypeScript) - Handles all video processing and analysis
- **Video Processing**: FFmpeg for chunking and frame extraction
- **YouTube Ingestion**: ytdl-core for downloading videos
- **Queue System**: BullMQ + Redis for async chunk processing
- **Speech-to-Text**: OpenAI Whisper
- **Multimodal LLM**: GPT-4 Vision (GPT-4o) for mood analysis

## Features

- Downloads YouTube videos and splits them into 15-second chunks
- Extracts 2-3 representative frames per chunk
- Transcribes audio using Whisper
- Analyzes mood using multimodal LLM (visual + audio + text cues)
- Processes chunks asynchronously in parallel
- Aggregates results into timeline and summary
- **Redis caching** - Avoids re-processing the same videos
- Automatically cleans up all temporary files
- Beautiful, responsive frontend with interactive charts
- **Modular component architecture** - Clean, maintainable code
- **Tailwind CSS** - Modern, utility-first styling

## Prerequisites

- Node.js 18+
- Redis (for BullMQ queue)
- FFmpeg is **bundled** in the package - no need to install separately! 🎉
- OpenAI API key

> **Note:** The application uses `@ffmpeg-installer/ffmpeg` which automatically provides FFmpeg binaries for your platform. If you prefer to use a system-installed FFmpeg, you can remove the package and ensure FFmpeg is in your PATH.

## Quick Start

### 1. Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
npm run start:dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local if backend is not on localhost:3001
npm run dev
```

### 4. Use the Application

1. Open `http://localhost:3000` in your browser
2. Enter a YouTube URL
3. Click "Analyze Video"
4. View the mood analysis results

## Project Structure

```
.
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── analyze/        # Main orchestration
│   │   │   └── dto/        # Request/response DTOs
│   │   ├── video/          # Video download & chunking
│   │   ├── frames/         # Frame extraction
│   │   ├── audio/          # Audio handling
│   │   ├── transcription/  # Whisper integration
│   │   ├── mood/           # LLM mood analysis
│   │   ├── aggregation/    # Result aggregation
│   │   ├── cache/          # Redis caching
│   │   ├── queue/          # BullMQ processors
│   │   └── common/         # Shared utilities, DTOs, interfaces
│   └── package.json
│
└── frontend/               # Next.js frontend
    ├── app/                # App Router pages
    ├── components/         # React components (modular)
    ├── hooks/              # Custom React hooks
    ├── types/              # TypeScript type definitions
    └── package.json
```

## API Documentation

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
      },
      {
        "start": 15,
        "end": 30,
        "mood": "calm",
        "confidence": 0.72,
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

Invalidate cache for a specific video.

### DELETE /analyze/cache

Invalidate cache by YouTube URL.

## Processing Flow

1. User submits YouTube URL from Next.js frontend
2. Next.js sends POST request to NestJS `/analyze` endpoint
3. NestJS downloads video stream using ytdl-core
4. Video is split into 15-second chunks using FFmpeg
5. Each chunk is processed asynchronously:
   - Extract 2-3 representative frames (every ~5 seconds)
   - Extract audio as 16kHz WAV
   - Transcribe speech using Whisper
   - Analyze mood using GPT-4 Vision (frames + transcript + audio cues)
6. Results are aggregated into timeline and summary
7. Final JSON result is returned to frontend
8. All temporary files are cleaned up

## Configuration

### Backend Environment Variables

```env
PORT=3001
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
OPENAI_API_KEY=your_openai_api_key_here
TEMP_DIR=./temp
```

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Key Design Decisions

- **No permanent storage**: All videos are processed in memory/temp files and cleaned up immediately
- **Chunk-based processing**: 15-second chunks allow for parallel processing and better scalability
- **Multimodal analysis**: Combines visual (frames), audio (transcription), and text cues for accurate mood detection
- **Async processing**: BullMQ queue allows processing multiple chunks in parallel without blocking
- **Structured JSON**: All LLM responses are structured JSON for reliable parsing
- **Error handling**: Comprehensive error handling with cleanup on failures

## License

MIT


