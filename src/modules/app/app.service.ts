import { Injectable, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import { existsSync, mkdirSync } from 'fs';
import { join, parse } from 'path';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  async upload(file: Express.Multer.File) {
    console.log(file);
  }

  async convertVideo(file: Express.Multer.File): Promise<string> {
    const outputDir = join(process.cwd(), 'converted');
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

    const outputFileName = `${parse(file.originalname).name}.mp4`;
    const outputPath = join(outputDir, outputFileName);

    return new Promise((resolve, reject) => {
      const command = ffmpeg(file.path)
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
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(new Error(err.message)));

      command.run();
    });
  }
}
