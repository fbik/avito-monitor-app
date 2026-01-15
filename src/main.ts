import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Разрешаем CORS
  app.enableCors();
  
  // ВАЖНО: Обслуживаем статические файлы ДО маршрутов API
  app.use(express.static(join(__dirname, '..', 'public')));
  
  // Настройка WebSocket
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Приложение запущено на порту ${port}`);
  console.log(`📁 Статические файлы из: ${join(__dirname, '..', 'public')}`);
  console.log(`🌐 Интерфейс доступен по: http://localhost:${port}`);
}
bootstrap();
