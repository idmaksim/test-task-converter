import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import { existsSync, mkdirSync } from 'fs';
import { join, parse } from 'path';

@Injectable()
export class AppService {
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
      ffmpeg(file.path)
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          '-c:a aac',
          '-b:a 128k',
        ])
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(new Error(err.message)))
        .run();
    });
  }
}
