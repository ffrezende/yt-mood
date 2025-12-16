'use client';

import { AnalysisResult } from '@/types';
import { SummaryCards } from './SummaryCards';
import { MoodChart } from './MoodChart';
import { FrameGallery } from './FrameGallery';
import { DetailedTimeline } from './DetailedTimeline';

interface AnalysisResultsProps {
  result: AnalysisResult;
}

export function AnalysisResults({ result }: AnalysisResultsProps) {
  return (
    <div className="mt-8 space-y-8">
      <section>
        <h2 className="text-2xl mb-4 text-gray-900">Analysis Results</h2>
        <SummaryCards result={result} />
      </section>

      <section>
        <h2 className="text-2xl mb-4 text-gray-900">Mood Timeline</h2>
        <MoodChart data={result.mood_timeline} />
      </section>

      <section>
        <h2 className="text-2xl mb-2 text-gray-900">Video Frames</h2>
        <p className="text-gray-600 mb-4">
          Representative frames extracted from the analyzed video segments
        </p>
        <FrameGallery timeline={result.mood_timeline} />
      </section>

      <DetailedTimeline timeline={result.mood_timeline} />
    </div>
  );
}

