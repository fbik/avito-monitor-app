import { Module } from '@nestjs/common';
import { MessagesModule } from './messages/messages.module';
import { AppController } from './app.controller';
import { FallbackController } from './fallback.controller';

@Module({
  imports: [
    MessagesModule,
  ],
  controllers: [AppController, FallbackController], // FallbackController последний!
})
export class AppModule {}
