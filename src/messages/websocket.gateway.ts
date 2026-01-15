import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // На Render используем тот же порт что и HTTP
  namespace: '/ws',
  transports: ['websocket', 'polling'],
})
export class MessagesGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  private readonly logger = new Logger(MessagesGateway.name);
  private clients: Map<string, Socket> = new Map();

  afterInit(server: Server) {
    this.logger.log(`WebSocket Gateway initialized on namespace /ws`);
    
    // Отправляем периодические обновления статуса
    setInterval(() => {
      this.broadcastMessage('status', {
        timestamp: new Date().toISOString(),
        connectedClients: this.getConnectedClients(),
        status: 'online'
      });
    }, 30000); // Каждые 30 секунд
  }

  handleConnection(client: Socket) {
    const clientId = client.id;
    this.clients.set(clientId, client);
    this.logger.log(`Client connected: ${clientId}`);
    
    // Отправляем приветственное сообщение
    this.server.to(clientId).emit('connected', { 
      status: 'connected',
      message: 'Connected to Avito Messages Monitor',
      clientId,
      timestamp: new Date().toISOString()
    });
    
    // Отправляем начальный статус
    this.broadcastMessage('connection_update', {
      clientId,
      action: 'connected',
      totalClients: this.getConnectedClients()
    });
  }

  handleDisconnect(client: Socket) {
    const clientId = client.id;
    this.clients.delete(clientId);
    this.logger.log(`Client disconnected: ${clientId}`);
    
    this.broadcastMessage('connection_update', {
      clientId,
      action: 'disconnected',
      totalClients: this.getConnectedClients()
    });
  }

  broadcastMessage(event: string, data: any) {
    this.server.emit(event, data);
  }

  sendToClient(clientId: string, event: string, data: any) {
    const client = this.clients.get(clientId);
    if (client) {
      client.emit(event, data);
    }
  }

  getConnectedClients(): number {
    return this.clients.size;
  }

  // Метод для отправки уведомлений о новых сообщениях
  notifyNewMessage(message: any) {
    this.broadcastMessage('new_message', {
      ...message,
      timestamp: new Date().toISOString()
    });
  }

  // Метод для отправки статуса авторизации
  notifyAuthStatus(status: any) {
    this.broadcastMessage('auth_status', {
      ...status,
      timestamp: new Date().toISOString()
    });
  }

  // Метод для отправки статуса мониторинга
  notifyMonitoringStatus(status: any) {
    this.broadcastMessage('monitoring_status', {
      ...status,
      timestamp: new Date().toISOString()
    });
  }
}
