import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import { existsSync } from 'fs';
import { join, parse } from 'path';
import { mkdir, unlink, access, readdir, stat } from 'fs/promises';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);
  private cleanupInterval: NodeJS.Timeout;

  async upload(file: Express.Multer.File) {
    console.log(file);
  }

  async convertVideo(file: Express.Multer.File): Promise<string> {
    const outputDir = join(process.cwd(), 'converted');

    try {
      await access(outputDir);
    } catch {
      await mkdir(outputDir, { recursive: true });
    }

    const uploadsDir = join(process.cwd(), 'uploads');
    try {
      await access(uploadsDir);
    } catch {
      await mkdir(uploadsDir, { recursive: true });
    }

    const outputFileName = `${parse(file.originalname).name}.mp4`;
    const outputPath = join(outputDir, outputFileName);

    return new Promise((resolve, reject) => {
      ffmpeg(file.path)
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          '-c:a aac',
          '-b:a 128k',
        ])
        .output(outputPath)
        .on('progress', (progress) => {
          this.logger.log(`Processing: ${Math.round(progress.percent)}% done`);
        })
        .on('end', async () => {
          await this.deleteFile(file.path);
          this.scheduleCleanup(outputPath, 3600000);
          resolve(outputPath);
        })
        .on('error', async (err) => {
          await this.cleanupFiles(file.path, outputPath);
          reject(new Error(err.message));
        })
        .run();
    });
  }

  private async deleteFile(path: string): Promise<void> {
    try {
      await unlink(path);
      this.logger.log(`File deleted: ${path}`);
    } catch (err) {
      this.logger.error(`Error deleting file: ${path}`, err.stack);
    }
  }

  private scheduleCleanup(filePath: string, delay: number) {
    setTimeout(async () => {
      try {
        await access(filePath);
        await unlink(filePath);
        this.logger.log(`Cleaned up file: ${filePath}`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          this.logger.error(`Cleanup error: ${filePath}`, err.stack);
        }
      }
    }, delay);
  }

  private async cleanupFiles(...paths: string[]): Promise<void> {
    await Promise.all(
      paths.map(async (path) => {
        try {
          await access(path);
          await unlink(path);
          this.logger.warn(`Cleaned up failed conversion file: ${path}`);
        } catch (err) {
          if (err.code !== 'ENOENT') {
            this.logger.error(`Cleanup error: ${path}`, err.stack);
          }
        }
      }),
    );
  }

  async onModuleInit() {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupOldFiles(join(process.cwd(), 'uploads'), 3600000);
      await this.cleanupOldFiles(join(process.cwd(), 'converted'), 3600000);
    }, 3600000);
  }

  private async cleanupOldFiles(
    directory: string,
    maxAge: number,
  ): Promise<void> {
    try {
      await access(directory);
      const files = await readdir(directory);
      const now = Date.now();

      await Promise.all(
        files.map(async (file) => {
          const filePath = join(directory, file);
          const stats = await stat(filePath);

          if (now - stats.ctimeMs > maxAge) {
            await unlink(filePath);
            this.logger.log(`Auto-cleaned old file: ${filePath}`);
          }
        }),
      );
    } catch (err) {
      if (err.code !== 'ENOENT') {
        this.logger.error(`Cleanup directory error: ${directory}`, err.stack);
      }
    }
  }
}
