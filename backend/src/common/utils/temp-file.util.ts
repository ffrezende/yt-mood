import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Utility for managing temporary files
 * Ensures all temp files are cleaned up after processing
 */
export class TempFileUtil {
  private static tempDir: string = process.env.TEMP_DIR || './temp';
  private static activeFiles: Set<string> = new Set();

  /**
   * Initialize temp directory
   */
  static async initialize(): Promise<void> {
    await fs.ensureDir(this.tempDir);
  }

  /**
   * Create a temporary file path
   */
  static createTempPath(extension: string = ''): string {
    const filename = `${uuidv4()}${extension ? `.${extension}` : ''}`;
    const filepath = path.join(this.tempDir, filename);
    this.activeFiles.add(filepath);
    return filepath;
  }

  /**
   * Create a temporary directory
   */
  static createTempDir(): string {
    const dirname = uuidv4();
    const dirpath = path.join(this.tempDir, dirname);
    this.activeFiles.add(dirpath);
    return dirpath;
  }

  /**
   * Clean up a specific file or directory
   */
  static async cleanup(filepath: string): Promise<void> {
    try {
      const stats = await fs.stat(filepath);
      if (stats.isDirectory()) {
        await fs.remove(filepath);
      } else {
        await fs.unlink(filepath);
      }
      this.activeFiles.delete(filepath);
    } catch (error: any) {
      // File might already be deleted, ignore
      console.warn(`Failed to cleanup ${filepath}:`, error?.message || error);
    }
  }

  /**
   * Clean up all active temporary files
   */
  static async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.activeFiles).map((filepath) =>
      this.cleanup(filepath).catch((err) => {
        console.warn(`Failed to cleanup ${filepath}:`, err.message);
      }),
    );
    await Promise.all(cleanupPromises);
    this.activeFiles.clear();
  }

  /**
   * Clean up files matching a pattern (e.g., all chunks for a video)
   */
  static async cleanupPattern(pattern: string): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const matchingFiles = files.filter((file) => file.includes(pattern));
      await Promise.all(
        matchingFiles.map((file) =>
          fs.remove(path.join(this.tempDir, file)).catch(() => {}),
        ),
      );
    } catch (error: any) {
      console.warn(`Failed to cleanup pattern ${pattern}:`, error?.message || error);
    }
  }
}

