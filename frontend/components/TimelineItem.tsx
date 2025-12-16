import { MoodTimelineEntry } from '@/types';

interface TimelineItemProps {
  entry: MoodTimelineEntry;
  index: number;
}

export function TimelineItem({ entry, index }: TimelineItemProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-gray-50 rounded-lg border-l-4 border-primary-500 transition-all hover:shadow-md hover:-translate-y-0.5">
      {entry.frameImage && (
        <div className="flex-shrink-0 w-full sm:w-48 h-auto sm:h-28 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
          <img
            src={`data:image/jpeg;base64,${entry.frameImage}`}
            alt={`Frame at ${entry.start}s`}
            className="w-full h-full object-cover rounded-lg shadow-md transition-transform hover:scale-105"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="font-semibold text-gray-600 text-sm">
            {entry.start}s - {entry.end}s
          </div>
          <div className="font-semibold text-gray-900 capitalize text-lg px-3 py-1 bg-gradient-primary text-white rounded-md inline-block w-fit">
            {entry.mood}
          </div>
          <div className="text-gray-600 text-sm">
            Confidence: {(entry.confidence * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}

