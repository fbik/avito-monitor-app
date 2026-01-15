import { Module } from '@nestjs/common';
import { MessagesModule } from './messages/messages.module';
import { AppController } from './app.controller';

@Module({
  imports: [MessagesModule],
  controllers: [AppController],
})
export class AppModule {}
