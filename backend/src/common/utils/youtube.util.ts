const ytdl = require('ytdl-core');
type videoInfo = any;

export class YoutubeUtil {
  static isValidUrl(url: string): boolean {
    return ytdl.validateURL(url);
  }

  static getVideoId(url: string): string | null {
    try {
      return ytdl.getVideoID(url);
    } catch {
      return null;
    }
  }

  static async getVideoInfo(url: string, retries: number = 3): Promise<videoInfo> {
    if (!this.isValidUrl(url)) {
      throw new Error('Invalid YouTube URL');
    }
    
    const tempDir = process.env.TEMP_DIR || './temp';
    const path = require('path');
    const fs = require('fs-extra');
    await fs.ensureDir(tempDir);
    
    const cacheDir = path.join(tempDir, 'ytdl-cache');
    await fs.ensureDir(cacheDir);
    
    let lastError: any;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const info = await ytdl.getInfo(url, {
          requestOptions: {}
        });
        return info;
      } catch (error: any) {
        lastError = error;
        
        if (error.message?.includes('Could not extract functions') && attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        if (error.message?.includes('Sign in to confirm your age')) {
          throw new Error('This video is age-restricted and cannot be processed without authentication');
        }
        if (error.message?.includes('Video unavailable')) {
          throw new Error('Video is unavailable. It may be private, deleted, or region-locked');
        }
        if (error.message?.includes('Private video')) {
          throw new Error('This video is private and cannot be accessed');
        }
        
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
    
    throw lastError || new Error('Unknown error getting video info');
  }

  static calculateChunkCount(durationSeconds: number): number {
    return Math.ceil(durationSeconds / 15);
  }
}





