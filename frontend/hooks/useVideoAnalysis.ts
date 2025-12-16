import { useState } from 'react';
import axios from 'axios';
import { AnalysisResult } from '@/types';

/**
 * Custom hook for video analysis
 * Handles API calls and state management
 */
export function useVideoAnalysis() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeVideo = async () => {
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await axios.post<{ success: boolean; data?: AnalysisResult; error?: any }>(
        `${apiUrl}/analyze`,
        {
          youtubeUrl: youtubeUrl.trim(),
        },
      );

      if (response.data.success && response.data.data) {
        setResult(response.data.data);
      } else {
        // Handle error from API response
        const errorMsg = response.data.error?.message || response.data.error || 'Analysis failed';
        setError(errorMsg);
      }
    } catch (err: any) {
      // Handle network errors or HTTP errors
      let errorMessage = 'Failed to analyze video';
      
      if (err.response?.data) {
        // Backend returned an error response
        const errorData = err.response.data;
        errorMessage = errorData.error?.message || errorData.message || errorData.error || errorMessage;
      } else if (err.message) {
        // Network or other error
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setYoutubeUrl('');
    setResult(null);
    setError(null);
    setLoading(false);
  };

  return {
    youtubeUrl,
    setYoutubeUrl,
    loading,
    result,
    error,
    analyzeVideo,
    reset,
  };
}

