import { useState, useCallback } from 'react';
import { AnalysisResult } from '@/types';
import { apiService } from '@/services';

export function useVideoAnalysis() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeVideo = useCallback(async () => {
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const analysisResult = await apiService.analyzeVideo(youtubeUrl);
      setResult(analysisResult);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze video');
    } finally {
      setLoading(false);
    }
  }, [youtubeUrl]);

  const reset = useCallback(() => {
    setYoutubeUrl('');
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    youtubeUrl,
    setYoutubeUrl,
    loading,
    result,
    error,
    analyzeVideo,
    reset,
    clearError,
  };
}

