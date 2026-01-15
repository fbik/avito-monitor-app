import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // ВАЖНО: Express static middleware ДО NestJS маршрутов
  const publicPath = join(__dirname, '..', 'public');
  app.use(express.static(publicPath));
  
  // Fallback middleware для SPA
  app.use((req, res, next) => {
    // Если запрос к API - пропускаем
    if (req.path.startsWith('/api') || 
        req.path.startsWith('/messages') ||
        req.path === '/health' ||
        req.path.includes('.')) { // файлы с расширениями
      return next();
    }
    
    // Иначе отдаем index.html
    res.sendFile(join(publicPath, 'index.html'));
  });
  
  app.enableCors();
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Приложение запущено на порту ${port}`);
  console.log(`📁 Статические файлы: ${publicPath}`);
  console.log(`✅ Интерфейс: http://localhost:${port}`);
}
bootstrap();
