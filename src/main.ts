import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Разрешаем CORS
  app.enableCors();
  
  // Обслуживаем статические файлы из папки public
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/',
  });
  
  // Настройка WebSocket
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Приложение запущено на порту ${port}`);
  console.log(`📁 Статические файлы из: ${join(__dirname, '..', 'public')}`);
}
bootstrap();
