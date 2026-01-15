import { Injectable } from '@nestjs/common';

@Injectable()
export class MessagesService {
  private messages: any[] = [];
  private monitoring = {
    isActive: false,
    lastCheck: null,
    checksCount: 0
  };
  private auth = {
    isAuthenticated: false,
    username: null
  };

  getStatus() {
    return {
      status: 'ok',
      monitoring: this.monitoring,
      auth: this.auth,
      messagesCount: this.messages.length,
      timestamp: new Date().toISOString()
    };
  }

  loginToAvito(phoneNumber?: string) {
    // Тестовая авторизация
    this.auth = {
      isAuthenticated: true,
      username: phoneNumber || 'test_user'
    };
    
    return true;
  }

  startMonitoring() {
    this.monitoring = {
      isActive: true,
      lastCheck: new Date().toISOString(),
      checksCount: 0
    };
    
    return true;
  }

  stopMonitoring() {
    this.monitoring.isActive = false;
  }

  getMessages() {
    return [...this.messages];
  }

  clearMessages() {
    this.messages = [];
  }

  addMessage(message: any) {
    const newMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
    
    this.messages.unshift(newMessage);
    
    // Ограничиваем количество сообщений
    if (this.messages.length > 100) {
      this.messages = this.messages.slice(0, 100);
    }
    
    return newMessage;
  }
}
