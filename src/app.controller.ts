import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return { 
      service: 'Avito Messages Monitor',
      status: 'running',
      endpoints: {
        health: '/health',
        status: '/messages/status',
        messages: '/messages/list',
        start: '/messages/start',
        stop: '/messages/stop',
        login: '/messages/login'
      },
      documentation: 'WebSocket available at ws://' + process.env.RENDER_EXTERNAL_HOSTNAME
    };
  }
  
  @Get('health')
  getHealth() {
    return { 
      status: 'ok',
      service: 'avito-monitor',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };
  }
}
