import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  constructor(private readonly messagesService: MessagesService) {}

  @Get('status')
  async getStatus() {
    return await this.messagesService.getStatus();
  }

  @Post('login')
  async login(@Body() body: { phoneNumber?: string }) {
    const result = await this.messagesService.loginToAvito(body.phoneNumber);
    return { success: result };
  }

  @Post('start')
  async startMonitoring() {
    const result = await this.messagesService.startMonitoring();
    return { success: result };
  }

  @Post('stop')
  async stopMonitoring() {
    await this.messagesService.stopMonitoring();
    return { success: true, message: 'Monitoring stopped' };
  }

  @Get('list')
  async getMessages() {
    const messages = this.messagesService.getMessages();
    return { messages };
  }

  @Post('clear')
  async clearMessages() {
    this.messagesService.clearMessages();
    return { success: true, message: 'Messages cleared' };
  }
}