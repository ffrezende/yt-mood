import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class TempFileUtil {
  private static tempDir: string = process.env.TEMP_DIR || './temp';
  private static activeFiles: Set<string> = new Set();

  static async initialize(): Promise<void> {
    await fs.ensureDir(this.tempDir);
  }

  static createTempPath(extension: string = ''): string {
    const filename = `${uuidv4()}${extension ? `.${extension}` : ''}`;
    const filepath = path.join(this.tempDir, filename);
    this.activeFiles.add(filepath);
    return filepath;
  }

  static createTempDir(): string {
    const dirname = uuidv4();
    const dirpath = path.join(this.tempDir, dirname);
    this.activeFiles.add(dirpath);
    return dirpath;
  }

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
      console.warn(`Failed to cleanup ${filepath}:`, error?.message || error);
    }
  }

  static async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.activeFiles).map((filepath) =>
      this.cleanup(filepath).catch((err) => {
        console.warn(`Failed to cleanup ${filepath}:`, err.message);
      }),
    );
    await Promise.all(cleanupPromises);
    this.activeFiles.clear();
  }

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

