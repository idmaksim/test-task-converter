import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import { SwaggerModule } from '@nestjs/swagger';
import { DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useBodyParser('json', { limit: '2gb' });

  const config = new DocumentBuilder()
    .setTitle('Video Converter API')
    .setDescription('API for converting MOV videos to MP4 format')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}

bootstrap();
