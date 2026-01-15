import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  // ТОЛЬКО health, НЕ корневой путь!
  @Get('health')
  getHealth() {
    return { 
      status: 'ok',
      service: 'avito-monitor',
      timestamp: new Date().toISOString()
    };
  }
}
