import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return { 
      message: 'Avito Monitor API',
      endpoints: {
        health: '/health',
        status: '/status'
      }
    };
  }
}
