'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MoodTimelineEntry } from '@/types';

interface MoodChartProps {
  data: MoodTimelineEntry[];
}

// Map moods to colors
const moodColors: Record<string, string> = {
  happy: '#4ade80',
  sad: '#60a5fa',
  angry: '#f87171',
  anxious: '#fbbf24',
  excited: '#f472b6',
  calm: '#34d399',
  neutral: '#9ca3af',
};

// Map moods to numeric values for chart
const moodValues: Record<string, number> = {
  happy: 6,
  sad: 1,
  angry: 2,
  anxious: 3,
  excited: 7,
  calm: 5,
  neutral: 4,
};

export function MoodChart({ data }: MoodChartProps) {
  // Transform data for Recharts
  const chartData = data.map((entry) => ({
    time: `${entry.start}s`,
    mood: moodValues[entry.mood] || 4,
    moodLabel: entry.mood,
    confidence: entry.confidence,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="m-0 font-semibold">Time: {data.time}</p>
          <p className="my-1 capitalize">
            Mood:{' '}
            <span
              className="font-semibold"
              style={{ color: moodColors[data.moodLabel] || '#666' }}
            >
              {data.moodLabel}
            </span>
          </p>
          <p className="m-0 text-sm text-gray-600">
            Confidence: {(data.confidence * 100).toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom Y-axis labels
  const yAxisFormatter = (value: number) => {
    const mood = Object.keys(moodValues).find(
      (key) => moodValues[key] === value,
    );
    return mood ? mood.charAt(0).toUpperCase() + mood.slice(1) : '';
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey="time"
          stroke="#666"
          style={{ fontSize: '0.875rem' }}
        />
        <YAxis
          domain={[0, 8]}
          tickFormatter={yAxisFormatter}
          stroke="#666"
          style={{ fontSize: '0.875rem' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span style={{ textTransform: 'capitalize' }}>Mood</span>
          )}
        />
        <Line
          type="monotone"
          dataKey="mood"
          stroke="#667eea"
          strokeWidth={3}
          dot={{ fill: '#667eea', r: 5 }}
          activeDot={{ r: 8 }}
          name="Mood"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}





