'use client';

import { useVideoAnalysis } from '@/hooks/useVideoAnalysis';
import { Header } from '@/components/Header';
import { VideoInputForm } from '@/components/VideoInputForm';
import { ErrorAlert } from '@/components/ErrorAlert';
import { AnalysisResults } from '@/components/AnalysisResults';

export default function Home() {
  const { youtubeUrl, setYoutubeUrl, loading, result, error, analyzeVideo, reset, clearError } =
    useVideoAnalysis();

  return (
    <main className="flex justify-center items-start min-h-screen p-8">
      <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-6xl w-full">
        <Header />

        <VideoInputForm
          youtubeUrl={youtubeUrl}
          onUrlChange={setYoutubeUrl}
          onAnalyze={analyzeVideo}
          loading={loading}
        />

        {error && <ErrorAlert message={error} onDismiss={clearError} />}

        {result && <AnalysisResults result={result} />}
      </div>
    </main>
  );
}





