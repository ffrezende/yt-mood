'use client';

interface VideoInputFormProps {
  youtubeUrl: string;
  onUrlChange: (url: string) => void;
  onAnalyze: () => void;
  loading: boolean;
}

export function VideoInputForm({
  youtubeUrl,
  onUrlChange,
  onAnalyze,
  loading,
}: VideoInputFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading && youtubeUrl.trim()) {
      onAnalyze();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 mb-8">
      <input
        type="text"
        placeholder="Enter YouTube URL..."
        value={youtubeUrl}
        onChange={(e) => onUrlChange(e.target.value)}
        className="flex-1 px-4 py-3 text-base border-2 border-gray-200 rounded-lg transition-colors focus:outline-none focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !youtubeUrl.trim()}
        className="px-8 py-3 text-base font-semibold text-white bg-gradient-primary rounded-lg cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
      >
        {loading ? 'Analyzing...' : 'Analyze Video'}
      </button>
    </form>
  );
}

