import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class MessagesGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  private readonly logger = new Logger(MessagesGateway.name);
  private clients: Map<string, Socket> = new Map();

  afterInit(server: Server) {
    this.logger.log('✅ WebSocket Gateway initialized');
    
    // Периодически отправляем статус
    setInterval(() => {
      this.broadcastMessage('status', {
        timestamp: new Date().toISOString(),
        connectedClients: this.clients.size,
        status: 'online',
        serverTime: new Date().toLocaleTimeString('ru-RU')
      });
    }, 30000);
  }

  handleConnection(client: Socket) {
    const clientId = client.id;
    this.clients.set(clientId, client);
    this.logger.log(`✅ Client connected: ${clientId}`);
    
    // Приветственное сообщение
    client.emit('connected', { 
      status: 'connected',
      message: 'Connected to Avito Messages Monitor',
      clientId,
      timestamp: new Date().toISOString()
    });
    
    // Начальный статус
    client.emit('status', {
      timestamp: new Date().toISOString(),
      connectedClients: this.clients.size,
      status: 'online'
    });
  }

  handleDisconnect(client: Socket) {
    const clientId = client.id;
    this.clients.delete(clientId);
    this.logger.log(`❌ Client disconnected: ${clientId}`);
  }

  @SubscribeMessage('get_status')
  handleGetStatus(client: Socket) {
    this.logger.log(`📊 Status request from ${client.id}`);
    
    client.emit('status', {
      timestamp: new Date().toISOString(),
      connectedClients: this.clients.size,
      status: 'online',
      serverUptime: process.uptime()
    });
  }

  @SubscribeMessage('auth_request')
  handleAuthRequest(client: Socket, data: any) {
    this.logger.log(`🔑 Auth request from ${client.id}: ${data.username}`);
    
    // Тестовая авторизация
    setTimeout(() => {
      client.emit('auth_status', {
        isAuthenticated: true,
        username: data.username,
        message: 'Авторизация успешна (тестовый режим)',
        timestamp: new Date().toISOString()
      });
    }, 1000);
  }

  @SubscribeMessage('start_monitoring')
  handleStartMonitoring(client: Socket) {
    this.logger.log(`▶️ Start monitoring requested by ${client.id}`);
    
    client.emit('monitoring_status', {
      isMonitoring: true,
      message: 'Мониторинг запущен в тестовом режиме',
      timestamp: new Date().toISOString()
    });
    
    // Тестовые сообщения
    const messages = [
      'Привет! Как дела?',
      'Есть новое предложение',
      'Можем обсудить завтра?',
      'Отправляю документы',
      'Что думаешь о проекте?'
    ];
    
    let messageCount = 0;
    const sendTestMessage = () => {
      if (messageCount < messages.length) {
        client.emit('new_message', {
          sender: 'Рушан Натфуллин',
          content: messages[messageCount],
          timestamp: new Date().toISOString(),
          id: `msg_${Date.now()}_${messageCount}`
        });
        messageCount++;
        setTimeout(sendTestMessage, 3000);
      }
    };
    
    sendTestMessage();
  }

  @SubscribeMessage('stop_monitoring')
  handleStopMonitoring(client: Socket) {
    this.logger.log(`⏹️ Stop monitoring requested by ${client.id}`);
    
    client.emit('monitoring_status', {
      isMonitoring: false,
      message: 'Мониторинг остановлен',
      timestamp: new Date().toISOString()
    });
  }

  @SubscribeMessage('clear_messages')
  handleClearMessages(client: Socket) {
    this.logger.log(`🗑️ Clear messages requested by ${client.id}`);
    
    client.emit('messages_cleared', {
      message: 'История сообщений очищена',
      timestamp: new Date().toISOString()
    });
  }

  broadcastMessage(event: string, data: any) {
    this.server.emit(event, data);
  }

  getConnectedClients(): number {
    return this.clients.size;
  }
}
