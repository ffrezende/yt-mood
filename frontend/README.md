# YouTube Mood Analyzer - Frontend

Next.js 14 frontend for the YouTube Mood Analyzer application.

## Features

- Modern, responsive UI with **Tailwind CSS**
- Real-time mood analysis visualization
- Interactive mood timeline chart
- Detailed segment breakdown with frame images
- **Modular component architecture** - Clean, maintainable code
- **Custom React hooks** - Reusable business logic
- **TypeScript** - Full type safety

## Installation

```bash
cd frontend
npm install
```

## Configuration

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Update `.env.local` with your backend URL:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Running the Application

```bash
# Development
npm run dev

# Production
npm run build
npm run start
```

The application will be available at `http://localhost:3000`.

## Usage

1. Enter a YouTube URL in the input field
2. Click "Analyze Video"
3. View the mood analysis results including:
   - Overall mood
   - Emotional variability
   - Interactive mood timeline chart
   - Video frame gallery
   - Detailed segment breakdown with frame images

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles (Tailwind)
├── components/             # React components
│   ├── Header.tsx
│   ├── VideoInputForm.tsx
│   ├── ErrorAlert.tsx
│   ├── SummaryCards.tsx
│   ├── MoodChart.tsx
│   ├── FrameGallery.tsx
│   ├── TimelineItem.tsx
│   ├── DetailedTimeline.tsx
│   └── AnalysisResults.tsx
├── hooks/                  # Custom React hooks
│   └── useVideoAnalysis.ts
└── types/                  # TypeScript types
    └── index.ts
```

## Technologies

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Chart visualization
- **Axios** - HTTP client





