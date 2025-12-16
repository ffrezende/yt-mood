# Setup Instructions

## Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Redis** - Required for BullMQ queue
3. **FFmpeg** - ✅ **Bundled in the package!** No installation needed.
4. **OpenAI API Key** - Required for Whisper and GPT-4 Vision

> **FFmpeg Note:** The application uses `@ffmpeg-installer/ffmpeg` which automatically provides FFmpeg binaries for your platform. The binaries are installed when you run `npm install`. No manual installation required!

### Installing Redis

**Using Docker (Recommended):**
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

**Or install locally:**
- Windows: Download from [Redis for Windows](https://github.com/microsoftarchive/redis/releases)
- macOS: `brew install redis && brew services start redis`
- Linux: `sudo apt-get install redis-server && sudo systemctl start redis`

## Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Edit `.env` and add your configuration:
```env
PORT=3001
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
OPENAI_API_KEY=your_openai_api_key_here
TEMP_DIR=./temp
```

5. Start Redis (if not already running):
```bash
# Using Docker
docker start redis

# Or if installed locally, ensure Redis is running
```

6. Start the backend:
```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The backend will be available at `http://localhost:3001`

## Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` (optional, defaults to localhost:3001):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

5. Install dependencies (including Tailwind CSS):
```bash
npm install
```

6. Start the frontend:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

> **Note:** Tailwind CSS is included in the dependencies. If you see errors about missing Tailwind, run `npm install` to ensure all dependencies are installed.

## Testing the Application

1. Make sure both backend and frontend are running
2. Open `http://localhost:3000` in your browser
3. Enter a YouTube URL (e.g., `https://www.youtube.com/watch?v=VIDEO_ID`)
4. Click "Analyze Video"
5. Wait for the analysis to complete (this may take a few minutes depending on video length)
6. View the mood analysis results

## Troubleshooting

### Backend won't start
- Ensure Redis is running: `redis-cli ping` should return `PONG`
- Verify FFmpeg package is installed: Check `node_modules/@ffmpeg-installer/ffmpeg`
- Verify OpenAI API key is set in `.env`

### Frontend can't connect to backend
- Check that backend is running on port 3001
- Verify `NEXT_PUBLIC_API_URL` in `.env.local` matches backend URL
- Check CORS settings in `backend/src/main.ts`

### Tailwind CSS errors
- Ensure all dependencies are installed: `npm install`
- Verify `tailwind.config.js` and `postcss.config.js` exist
- Clear `.next` directory and restart: `Remove-Item -Recurse -Force .next` then `npm run dev`

### Video processing fails
- Ensure `@ffmpeg-installer/ffmpeg` package is installed (run `npm install`)
- Check that YouTube URL is valid and accessible
- Verify sufficient disk space for temporary files
- Check backend logs for detailed error messages

### Queue jobs not processing
- Verify Redis is running and accessible
- Check Redis connection settings in `.env`
- Ensure `ChunkProcessor` is properly registered in `QueueModule`

## Production Deployment

### Backend
1. Set `NODE_ENV=production`
2. Build: `npm run build`
3. Start: `npm run start:prod`
4. Use a process manager like PM2: `pm2 start dist/main.js`

### Frontend
1. Build: `npm run build`
2. Start: `npm run start`
3. Or deploy to Vercel/Netlify

### Environment Variables
- Ensure all environment variables are set in production
- Use secure secret management (AWS Secrets Manager, etc.)
- Set appropriate `TEMP_DIR` with sufficient disk space
- Configure Redis for production (password, persistence, etc.)


