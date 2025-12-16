import * as ffmpeg from 'fluent-ffmpeg';

let ffmpegInstaller: { path: string } | null = null;
try {
  ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
} catch {
}

export class FfmpegUtil {
  private static configured = false;

  static configure(): void {
    if (this.configured) {
      return;
    }

    try {
      const ffmpegPath = ffmpegInstaller?.path;
      if (ffmpegPath) {
        ffmpeg.setFfmpegPath(ffmpegPath);
        this.configured = true;
        console.log(`✅ FFmpeg configured: ${ffmpegPath}`);
      } else {
        console.warn(
          '⚠️  Bundled FFmpeg not found. Using system FFmpeg (if available).',
        );
        this.configured = true;
      }
    } catch (error) {
      console.warn(
        '⚠️  Failed to configure bundled FFmpeg. Falling back to system FFmpeg.',
        error,
      );
      this.configured = true;
    }
  }
}




