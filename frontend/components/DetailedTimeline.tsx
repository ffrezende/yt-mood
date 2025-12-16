import { MoodTimelineEntry } from '@/types';
import { TimelineItem } from './TimelineItem';

interface DetailedTimelineProps {
  timeline: MoodTimelineEntry[];
}

export function DetailedTimeline({ timeline }: DetailedTimelineProps) {
  return (
    <div className="mt-8">
      <h2 className="text-2xl mb-4 text-gray-900">Detailed Timeline</h2>
      <div className="flex flex-col gap-3">
        {timeline.map((entry, index) => (
          <TimelineItem key={index} entry={entry} index={index} />
        ))}
      </div>
    </div>
  );
}

