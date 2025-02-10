import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import { join } from 'path';

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      fallbacks: {
        'ru-*': 'ru',
        'en-*': 'en',
      },
      loaderOptions: {
        path: join(__dirname, '../../i18n/'),
        watch: true,
      },
      resolvers: [AcceptLanguageResolver],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
