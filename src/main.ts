import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // ========== ОБЯЗАТЕЛЬНАЯ ИНИЦИАЛИЗАЦИЯ PUBLIC ДИРЕКТОРИИ ==========
  const publicDir = join(__dirname, '..', 'public');
  const indexPath = join(publicDir, 'index.html');
  
  console.log('=== Initializing static file serving ===');
  console.log('Current working directory:', process.cwd());
  console.log('__dirname:', __dirname);
  console.log('Public directory path:', publicDir);
  
  // Создаем public директорию если её нет
  if (!fs.existsSync(publicDir)) {
    console.log(`📁 Creating public directory: ${publicDir}`);
    try {
      fs.mkdirSync(publicDir, { recursive: true });
      console.log('✅ Public directory created');
    } catch (err) {
      console.error('❌ Failed to create public directory:', err.message);
    }
  }
  
  // Создаем index.html если его нет
  if (!fs.existsSync(indexPath)) {
    console.log(`📄 Creating index.html: ${indexPath}`);
    try {
      const basicHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Avito Monitor</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
        h1 { color: #333; }
        .status { color: green; font-weight: bold; font-size: 1.2em; }
        .info { margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>🚀 Avito Monitor</h1>
    <p class="status">✅ Backend is running successfully</p>
    <p>Static files are being served from: ${publicDir}</p>
    <div class="info">
        <p><a href="/health">/health</a> - Проверка состояния сервиса</p>
        <p><a href="/messages">/messages</a> - API сообщений</p>
    </div>
    <script>
        console.log('Avito Monitor interface loaded');
        fetch('/health').then(r => r.json()).then(data => {
            console.log('Service status:', data);
        });
    </script>
</body>
</html>`;
      fs.writeFileSync(indexPath, basicHtml);
      console.log('✅ index.html created');
    } catch (err) {
      console.error('❌ Failed to create index.html:', err.message);
    }
  } else {
    console.log(`✅ index.html already exists at: ${indexPath}`);
  }
  
  // Обслуживаем статические файлы
  console.log(`📁 Serving static files from: ${publicDir}`);
  app.use(express.static(publicDir));
  
  // Fallback для SPA (все остальные маршруты ведут на index.html)
  app.use((req, res, next) => {
    // Пропускаем API маршруты
    if (req.path.startsWith('/api') || 
        req.path.startsWith('/messages') ||
        req.path === '/health' ||
        req.path.includes('.')) {
      return next();
    }
    // Все остальные маршруты ведут на index.html
    res.sendFile(indexPath);
  });
  
  // Включаем CORS
  app.enableCors();
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`✅ Interface: http://localhost:${port}`);
  console.log(`📁 Static files served from: ${publicDir}`);
  
  // Проверяем доступность файлов
  console.log('=== File System Check ===');
  console.log('index.html exists:', fs.existsSync(indexPath));
  console.log('public dir exists:', fs.existsSync(publicDir));
}

bootstrap();
