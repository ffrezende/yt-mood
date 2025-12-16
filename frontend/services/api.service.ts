import axios, { AxiosInstance, AxiosError } from 'axios';
import { AnalysisResult, ApiResponse } from '@/types';

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 300000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => config,
      (error) => Promise.reject(error),
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data as any;

          if (status === 400) {
            return Promise.reject(new Error(data.error?.message || data.message || 'Invalid request'));
          } else if (status === 404) {
            return Promise.reject(new Error('Endpoint not found'));
          } else if (status === 500) {
            return Promise.reject(new Error(data.error?.message || 'Server error occurred'));
          }
        } else if (error.request) {
          return Promise.reject(new Error('Network error: Could not connect to server'));
        }

        return Promise.reject(error);
      },
    );
  }

  async analyzeVideo(youtubeUrl: string): Promise<AnalysisResult> {
    try {
      const response = await this.client.post<ApiResponse<AnalysisResult>>('/analyze', {
        youtubeUrl: youtubeUrl.trim(),
      });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.error?.message || 'Analysis failed');
    } catch (error: any) {
      if (error.response?.data) {
        const errorData = error.response.data;
        throw new Error(
          errorData.error?.message || errorData.message || error.message || 'Failed to analyze video',
        );
      }
      throw error;
    }
  }

  async getCacheStats(): Promise<{ available: boolean; keys: number }> {
    try {
      const response = await this.client.get<ApiResponse<{ available: boolean; keys: number }>>(
        '/analyze/cache/stats',
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error('Failed to get cache statistics');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get cache statistics');
    }
  }

  async invalidateCache(videoId: string): Promise<void> {
    try {
      await this.client.delete<ApiResponse<void>>(`/analyze/cache/${videoId}`);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to invalidate cache');
    }
  }

  async invalidateCacheByUrl(youtubeUrl: string): Promise<void> {
    try {
      await this.client.delete<ApiResponse<void>>('/analyze/cache', {
        data: { youtubeUrl: youtubeUrl.trim() },
      });
    } catch (error: any) {
      throw new Error(error.message || 'Failed to invalidate cache');
    }
  }
}

export const apiService = new ApiService();

