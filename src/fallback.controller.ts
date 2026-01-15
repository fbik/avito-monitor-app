import { Controller, Get, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { join } from 'path';

@Controller()
export class FallbackController {
  @Get('*')
  serveApp(@Res() res: Response, @Req() req: Request) {
    // Пропускаем API маршруты и статические файлы
    if (req.path.startsWith('/api/') || 
        req.path.startsWith('/messages/') ||
        req.path.startsWith('/health') ||
        req.path.includes('.')) { // файлы с расширениями (.js, .css, .html)
      return res.status(404).json({ message: 'Not found' });
    }
    
    // Для всех остальных путей отдаем index.html
    res.sendFile(join(__dirname, '..', 'public', 'index.html'));
  }
}
