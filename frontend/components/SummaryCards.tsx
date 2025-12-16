import { AnalysisResult } from '@/types';

interface SummaryCardsProps {
  result: AnalysisResult;
}

export function SummaryCards({ result }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Overall Mood',
      value: result.overall_mood,
      format: (val: string) => val.charAt(0).toUpperCase() + val.slice(1),
    },
    {
      label: 'Emotional Variability',
      value: result.emotional_variability,
      format: (val: number) => `${(val * 100).toFixed(1)}%`,
    },
    {
      label: 'Timeline Segments',
      value: result.mood_timeline.length,
      format: (val: number) => val.toString(),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-gradient-primary text-white p-6 rounded-xl text-center transition-transform hover:scale-105"
        >
          <div className="text-sm opacity-90 mb-2 uppercase tracking-wide">{card.label}</div>
          <div className="text-3xl font-bold">{card.format(card.value as any)}</div>
        </div>
      ))}
    </div>
  );
}

