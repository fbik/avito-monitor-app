import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');
  
  // Включаем CORS
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  
  // Настройка статических файлов
  app.useStaticAssets(join(__dirname, '..', 'public'));
  
  // Основной маршрут - используем Express напрямую
  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance.get('/', (req, res) => {
    res.sendFile(join(__dirname, '..', 'public', 'index.html'));
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📁 Static files served from: ${join(__dirname, '..', 'public')}`);
}

bootstrap();
