'use client';

import { MoodTimelineEntry } from '@/types';

interface FrameGalleryProps {
  timeline: MoodTimelineEntry[];
}

export function FrameGallery({ timeline }: FrameGalleryProps) {
  const framesWithImages = timeline.filter((entry) => entry.frameImage);

  if (framesWithImages.length === 0) {
    return (
      <div className="p-8 text-center text-gray-600 bg-gray-50 rounded-lg">
        No frame images available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
      {framesWithImages.map((entry, index) => (
        <div
          key={index}
          className="relative rounded-lg overflow-hidden shadow-md transition-all duration-200 cursor-pointer hover:shadow-xl hover:-translate-y-1"
        >
          {entry.frameImage && (
            <img
              src={`data:image/jpeg;base64,${entry.frameImage}`}
              alt={`Frame at ${entry.start}s`}
              className="w-full h-auto block"
              loading="lazy"
            />
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white p-3">
            <div className="font-semibold text-sm">
              {entry.start}s - {entry.end}s
            </div>
            <div className="text-xs capitalize opacity-90">
              {entry.mood} ({(entry.confidence * 100).toFixed(0)}%)
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

