import { Module } from '@nestjs/common';
import { MessagesGateway } from './websocket.gateway';

@Module({
  providers: [MessagesGateway],
  exports: [MessagesGateway],
})
export class WebsocketModule {}
