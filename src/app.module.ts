import { Module } from '@nestjs/common';
import { MessagesModule } from './messages/messages.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [MessagesModule, WebsocketModule],
})
export class AppModule {}