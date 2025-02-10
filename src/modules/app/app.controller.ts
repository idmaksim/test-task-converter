import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import { AppService } from './app.service';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { Response } from 'express';
import { existsSync, unlinkSync } from 'fs';
import { join, basename } from 'path';
import { access, unlink } from 'fs/promises';

@Controller()
@ApiTags('Video Conversion')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly i18n: I18nService,
  ) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        video: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('video', {
      dest: './uploads',
      limits: {
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB
      },
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(mov)$/i)) {
          return callback(
            new BadRequestException('Разрешены только MOV файлы'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    try {
      const outputPath = await this.appService.convertVideo(file);
      const filename = basename(outputPath);
      return { filename };
    } catch (error) {
      unlinkSync(file.path);
      throw new BadRequestException(error.message);
    }
  }

  @Get('download/:filename')
  async downloadFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = join(process.cwd(), 'converted', filename);

    try {
      await access(filePath);
    } catch {
      throw new BadRequestException('Файл не найден');
    }

    res.download(filePath, async () => {
      const uploadPath = join(
        process.cwd(),
        'uploads',
        filename.replace('.mp4', '.mov'),
      );

      await Promise.all(
        [filePath, uploadPath].map(async (path) => {
          try {
            await access(path);
            await unlink(path);
            this.appService['logger'].log(`Удален после скачивания: ${path}`);
          } catch (err) {
            if (err.code !== 'ENOENT') {
              this.appService['logger'].error(
                `Delete error: ${path}`,
                err.stack,
              );
            }
          }
        }),
      );
    });
  }
}
