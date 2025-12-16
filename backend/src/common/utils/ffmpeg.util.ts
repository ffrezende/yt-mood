import * as ffmpeg from 'fluent-ffmpeg';

// Try to import ffmpeg-installer, but handle if it's not available
let ffmpegInstaller: { path: string } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
} catch {
  // Package not installed, will fall back to system FFmpeg
}

/**
 * Utility to configure FFmpeg to use the bundled binary
 * This allows the app to work without requiring FFmpeg to be installed system-wide
 */
export class FfmpegUtil {
  private static configured = false;

  /**
   * Configure fluent-ffmpeg to use the bundled FFmpeg binary
   * Should be called once during application startup
   */
  static configure(): void {
    if (this.configured) {
      return;
    }

    try {
      // Try to use bundled FFmpeg if available
      const ffmpegPath = ffmpegInstaller?.path;
      if (ffmpegPath) {
        ffmpeg.setFfmpegPath(ffmpegPath);
        this.configured = true;
        console.log(`✅ FFmpeg configured: ${ffmpegPath}`);
      } else {
        console.warn(
          '⚠️  Bundled FFmpeg not found. Using system FFmpeg (if available).',
        );
        this.configured = true; // Mark as configured to avoid repeated warnings
      }
    } catch (error) {
      console.warn(
        '⚠️  Failed to configure bundled FFmpeg. Falling back to system FFmpeg.',
        error,
      );
      // If bundled FFmpeg fails, fluent-ffmpeg will try to use system FFmpeg
      this.configured = true;
    }
  }
}




