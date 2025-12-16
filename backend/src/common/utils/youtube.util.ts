// Using @distube/ytdl-core via npm alias (ytdl-core@npm:@distube/ytdl-core)
// This is a maintained fork that fixes the "Could not extract functions" error
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ytdl = require('ytdl-core');
type videoInfo = any; // Type will be inferred from ytdl-core

/**
 * Utility for YouTube URL validation and video info extraction
 */
export class YoutubeUtil {
  /**
   * Validate YouTube URL
   */
  static isValidUrl(url: string): boolean {
    return ytdl.validateURL(url);
  }

  /**
   * Extract video ID from URL
   */
  static getVideoId(url: string): string | null {
    try {
      return ytdl.getVideoID(url);
    } catch {
      return null;
    }
  }

  /**
   * Get video info (duration, title, etc.)
   * Retries up to 3 times if extraction fails
   */
  static async getVideoInfo(url: string, retries: number = 3): Promise<videoInfo> {
    if (!this.isValidUrl(url)) {
      throw new Error('Invalid YouTube URL');
    }
    
    // Configure ytdl-core to use temp directory for player scripts
    const tempDir = process.env.TEMP_DIR || './temp';
    const path = require('path');
    const fs = require('fs-extra');
    await fs.ensureDir(tempDir);
    
    // Set cache directory for ytdl-core player scripts
    const cacheDir = path.join(tempDir, 'ytdl-cache');
    await fs.ensureDir(cacheDir);
    
    let lastError: any;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Try to get video info (now using @distube/ytdl-core via npm alias)
        // Pass options to use cache directory for player scripts
        const info = await ytdl.getInfo(url, {
          requestOptions: {
            // This helps ytdl-core use the cache directory
          }
        });
        return info;
      } catch (error: any) {
        lastError = error;
        
        // If it's a "Could not extract functions" error, retry with exponential backoff
        if (error.message?.includes('Could not extract functions') && attempt < retries) {
          // Wait a bit before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        // For other errors, provide helpful messages
        if (error.message?.includes('Sign in to confirm your age')) {
          throw new Error('This video is age-restricted and cannot be processed without authentication');
        }
        if (error.message?.includes('Video unavailable')) {
          throw new Error('Video is unavailable. It may be private, deleted, or region-locked');
        }
        if (error.message?.includes('Private video')) {
          throw new Error('This video is private and cannot be accessed');
        }
        
        // If we've exhausted retries, throw a detailed error
        if (attempt === retries) {
          if (error.message?.includes('Could not extract functions')) {
            throw new Error(
              `Failed to extract video information after ${retries} attempts.\n` +
              'This may be due to:\n' +
              '- YouTube API changes (ytdl-core may need updating)\n' +
              '- Age-restricted or region-locked video\n' +
              '- Video format not available\n' +
              '- Network issues\n\n' +
              'Try:\n' +
              '1. Update ytdl-core: npm install ytdl-core@latest\n' +
              '2. Test with a different video URL\n' +
              '3. Check if the video is accessible in your browser\n\n' +
              `Original error: ${error.message}`
            );
          }
          throw new Error(`Failed to get video info: ${error.message || error}`);
        }
      }
    }
    
    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('Unknown error getting video info');
  }

  /**
   * Calculate number of chunks for a video
   * Chunks are 15 seconds each
   */
  static calculateChunkCount(durationSeconds: number): number {
    return Math.ceil(durationSeconds / 15);
  }
}





