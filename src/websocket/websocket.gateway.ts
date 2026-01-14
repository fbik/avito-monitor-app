import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  private readonly logger = new Logger(MessagesGateway.name);
  private clients: Map<string, Socket> = new Map();

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    const clientId = client.id;
    this.clients.set(clientId, client);
    this.logger.log(`Client connected: ${clientId}`);
    
    // Отправляем приветственное сообщение
    this.server.to(clientId).emit('connected', { 
      status: 'connected',
      message: 'Connected to Avito Messages Monitor',
      clientId
    });
  }

  handleDisconnect(client: Socket) {
    const clientId = client.id;
    this.clients.delete(clientId);
    this.logger.log(`Client disconnected: ${clientId}`);
  }

  broadcastMessage(event: string, data: any) {
    this.server.emit(event, data);
  }

  getConnectedClients(): number {
    return this.clients.size;
  }
}
