import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { MessagesGateway } from '../websocket/websocket.gateway';

export interface AvitoMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
  isNew: boolean;
  avatar?: string;
}

@Injectable()
export class MessagesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagesService.name);
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isAuthenticated = false;
  private isMonitoring = false;
  private messages: AvitoMessage[] = [];
  private readonly targetNames = ['Рушан Натфуллин', 'Рушан'];

  constructor(private readonly messagesGateway: MessagesGateway) {}

  async onModuleInit() {
    this.logger.log('MessagesService initialized');
  }

  async onModuleDestroy() {
    await this.stopMonitoring();
    await this.closeBrowser();
  }

  private async initializeBrowser() {
    try {
      this.logger.log('Launching browser...');
      
      // Проверяем наличие Chrome
      const executablePath = await this.getChromePath();
      
      this.browser = await puppeteer.launch({
        headless: false, // Изменено на false для визуальной отладки
        executablePath: executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1280,800'
        ],
        defaultViewport: null,
      });

      this.page = await this.browser.newPage();
      
      // Настройка пользовательского агента
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Перехватываем консоль браузера
      this.page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error') {
          this.logger.error(`Browser console error: ${text}`);
        } else if (type === 'warning') {
          this.logger.warn(`Browser console warning: ${text}`);
        } else {
          this.logger.debug(`Browser console: ${text}`);
        }
      });

      // Перехватываем ошибки страницы
      this.page.on('pageerror', error => {
        this.logger.error(`Page error: ${error.message}`);
      });

      this.logger.log('Browser initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize browser:', error);
      return false;
    }
  }

  private async getChromePath(): Promise<string | undefined> {
    try {
      // Пробуем найти Chrome в стандартных путях
      const possiblePaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium'
      ];

      for (const path of possiblePaths) {
        try {
          const fs = require('fs');
          if (fs.existsSync(path)) {
            this.logger.log(`Found Chrome at: ${path}`);
            return path;
          }
        } catch (e) {
          continue;
        }
      }

      // Если не нашли, используем chrome который идет с puppeteer
      this.logger.log('Using bundled Chrome from puppeteer');
      return undefined;
    } catch (error) {
      this.logger.warn('Error finding Chrome path:', error);
      return undefined;
    }
  }

  private async closeBrowser() {
    if (this.browser) {
      try {
        await this.browser.close();
        this.logger.log('Browser closed successfully');
      } catch (error) {
        this.logger.error('Error closing browser:', error);
      }
      this.browser = null;
      this.page = null;
      this.isAuthenticated = false;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async loginToAvito(phoneNumber?: string): Promise<boolean> {
    try {
      if (!this.browser || !this.page) {
        const initialized = await this.initializeBrowser();
        if (!initialized) {
          throw new Error('Failed to initialize browser');
        }
      }

      this.logger.log('Navigating to Avito...');
      
      // Сначала идем на главную страницу
      await this.page.goto('https://www.avito.ru/', {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });

      // Проверяем авторизацию
      await this.delay(3000);
      const isLoggedIn = await this.checkIfLoggedIn();
      
      if (isLoggedIn) {
        this.isAuthenticated = true;
        this.logger.log('Already logged in to Avito');
        this.messagesGateway.broadcastMessage('auth-status', { 
          status: 'authenticated',
          message: 'Already logged in'
        });
        return true;
      }

      this.logger.log('Not logged in. Please log in manually...');
      this.messagesGateway.broadcastMessage('auth-status', { 
        status: 'manual_login_required',
        message: 'Please log in to Avito in the opened browser window'
      });

      // Показываем инструкцию пользователю
      console.log('\n========================================');
      console.log('🚨 ВНИМАНИЕ: Откроется окно браузера');
      console.log('🔑 Пожалуйста, выполните вход в Avito');
      console.log('📝 После входа, НЕ ЗАКРЫВАЙТЕ окно браузера');
      console.log('========================================\n');

      // Даем время пользователю для входа
      await this.delay(30000); // 30 секунд на вход

      // Проверяем снова
      this.isAuthenticated = await this.checkIfLoggedIn();
      
      if (this.isAuthenticated) {
        this.logger.log('Successfully logged in to Avito');
        this.messagesGateway.broadcastMessage('auth-status', { 
          status: 'authenticated',
          message: 'Login successful'
        });
        return true;
      } else {
        this.logger.error('Login timeout or failed');
        this.messagesGateway.broadcastMessage('auth-status', { 
          status: 'failed',
          message: 'Login timeout or failed'
        });
        return false;
      }
    } catch (error) {
      this.logger.error('Login error:', error);
      this.messagesGateway.broadcastMessage('auth-status', { 
        status: 'error', 
        error: error.message 
      });
      return false;
    }
  }

  private async checkIfLoggedIn(): Promise<boolean> {
    if (!this.page) return false;

    try {
      // Проверяем несколько признаков авторизации
      const checks = [
        this.page.$('[data-marker="header/notification-button"]'),
        this.page.$('[data-marker="profile-menu"]'),
        this.page.$('[href*="/profile"]'),
        this.page.$('a[href*="logout"]')
      ];

      const results = await Promise.all(checks);
      return results.some(el => el !== null);
    } catch (error) {
      return false;
    }
  }

  async startMonitoring(): Promise<boolean> {
    if (!this.isAuthenticated || !this.page) {
      this.logger.error('Not authenticated. Please login first.');
      this.messagesGateway.broadcastMessage('monitor-status', { 
        status: 'not_authenticated',
        message: 'Please login first'
      });
      return false;
    }

    if (this.isMonitoring) {
      this.logger.warn('Monitoring is already running');
      return true;
    }

    this.isMonitoring = true;
    this.logger.log('Starting message monitoring...');
    this.messagesGateway.broadcastMessage('monitor-status', { 
      status: 'started',
      message: 'Monitoring started'
    });

    // Запускаем мониторинг в фоне
    this.monitorMessages().catch(error => {
      this.logger.error('Monitoring error:', error);
      this.isMonitoring = false;
      this.messagesGateway.broadcastMessage('monitor-status', { 
        status: 'error',
        message: 'Monitoring error: ' + error.message
      });
    });
    
    return true;
  }

  private async monitorMessages() {
    let errorCount = 0;
    const maxErrors = 5;

    while (this.isMonitoring && this.page && errorCount < maxErrors) {
      try {
        await this.checkForNewMessages();
        errorCount = 0; // Сбрасываем счетчик ошибок при успехе
        await this.delay(10000); // Проверяем каждые 10 секунд
      } catch (error) {
        errorCount++;
        this.logger.error(`Error during monitoring (${errorCount}/${maxErrors}):`, error);
        
        if (errorCount >= maxErrors) {
          this.logger.error('Too many errors, stopping monitoring');
          await this.stopMonitoring();
          this.messagesGateway.broadcastMessage('monitor-status', { 
            status: 'stopped',
            message: 'Too many errors, monitoring stopped'
          });
          break;
        }
        
        await this.delay(15000); // Ждем 15 секунд при ошибке
      }
    }
  }

  private async checkForNewMessages() {
    if (!this.page) return;

    try {
      // Переходим в сообщения
      await this.page.goto('https://www.avito.ru/profile/messages', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Ждем загрузки списка сообщений
      try {
        await this.page.waitForSelector('[data-marker*="message"]', { 
          timeout: 10000 
        });
      } catch {
        this.logger.debug('No messages found or timeout');
        return;
      }

      // Получаем сообщения
      const newMessages = await this.page.evaluate((targetNames) => {
        const messages: any[] = [];
        const messageElements = document.querySelectorAll('[data-marker*="message"], .message-item, .chat-preview');

        messageElements.forEach((element, index) => {
          try {
            // Пробуем разные селекторы для надежности
            const textElement = element.querySelector(
              '[data-marker="message-text"], .message-text, .item-description'
            );
            const senderElement = element.querySelector(
              '[data-marker="message-sender"], .message-sender, .item-title'
            );
            const timeElement = element.querySelector(
              '[data-marker="message-date"], .message-date, .date-text'
            );
            const unreadIndicator = element.querySelector(
              '[data-marker="unread"], .unread, .new-message'
            );

            if (textElement && senderElement) {
              const sender = senderElement.textContent?.trim() || 'Unknown';
              const text = textElement.textContent?.trim() || '';
              
              // Проверяем на целевые имена
              const isTargetMessage = targetNames.some(name => 
                sender.toLowerCase().includes(name.toLowerCase())
              );

              if (isTargetMessage && text) {
                const messageId = `${sender}-${text.substring(0, 20)}-${index}`;
                
                messages.push({
                  id: messageId,
                  sender,
                  text,
                  timestamp: timeElement?.textContent?.trim() || new Date().toLocaleTimeString(),
                  isNew: !!unreadIndicator,
                  raw: {
                    senderHtml: senderElement.outerHTML,
                    textHtml: textElement.outerHTML
                  }
                });
              }
            }
          } catch (e) {
            console.error('Error parsing message element:', e);
          }
        });

        return messages;
      }, this.targetNames);

      // Обрабатываем новые сообщения
      for (const newMsg of newMessages) {
        const existingMsg = this.messages.find(msg => 
          msg.id === newMsg.id || 
          (msg.sender === newMsg.sender && msg.text === newMsg.text)
        );

        if (!existingMsg) {
          const messageWithDate: AvitoMessage = {
            ...newMsg,
            timestamp: new Date(),
          };
          
          this.messages.push(messageWithDate);
          
          // Отправляем через WebSocket
          this.messagesGateway.broadcastMessage('new-message', messageWithDate);
          
          this.logger.log(`📨 New message from ${newMsg.sender}: ${newMsg.text.substring(0, 50)}...`);
          
          // Также логируем в консоль
          console.log('\n' + '='.repeat(50));
          console.log(`📨 НОВОЕ СООБЩЕНИЕ от ${newMsg.sender}`);
          console.log(`📝 ${newMsg.text}`);
          console.log(`⏰ ${messageWithDate.timestamp.toLocaleTimeString()}`);
          console.log('='.repeat(50) + '\n');
        }
      }

      // Ограничиваем историю
      if (this.messages.length > 100) {
        this.messages = this.messages.slice(-100);
      }

      // Обновляем статус
      this.messagesGateway.broadcastMessage('monitor-update', {
        messageCount: this.messages.length,
        lastCheck: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Error checking messages:', error);
      throw error;
    }
  }

  async stopMonitoring() {
    if (this.isMonitoring) {
      this.isMonitoring = false;
      this.logger.log('Message monitoring stopped');
      this.messagesGateway.broadcastMessage('monitor-status', { 
        status: 'stopped',
        message: 'Monitoring stopped'
      });
    }
  }

  async getStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      isMonitoring: this.isMonitoring,
      connectedClients: this.messagesGateway.getConnectedClients(),
      messageCount: this.messages.length,
      lastMessages: this.messages.slice(-5).reverse(), // Последние 5 сообщений
      browserStatus: this.browser ? 'running' : 'stopped',
      pageStatus: this.page ? 'active' : 'inactive',
      timestamp: new Date().toISOString()
    };
  }

  getMessages(): AvitoMessage[] {
    return [...this.messages].reverse(); // Новые сверху
  }

  clearMessages() {
    this.messages = [];
    this.logger.log('Messages cleared');
    this.messagesGateway.broadcastMessage('messages-cleared', { 
      message: 'All messages cleared' 
    });
  }
}
