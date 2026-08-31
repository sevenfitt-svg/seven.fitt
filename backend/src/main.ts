import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      try {
        const url = new URL(origin);
        const ok = url.hostname === 'sevenfitt.com' ||
          url.hostname === 'www.sevenfitt.com' ||
          url.hostname.endsWith('.sevenfitt.com') ||
          url.hostname === 'sevenfitt-svg.github.io' ||
          url.hostname === 'localhost' || url.hostname === '127.0.0.1';
        callback(ok ? null : new Error('CORS_BLOCKED'), ok);
      } catch {
        callback(new Error('CORS_BLOCKED'), false);
      }
    },
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = Number(config.get('PORT') || 3000);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
