class AvitoMonitor {
    constructor() {
        this.socket = null;
        this.status = {
            ws: 'disconnected',
            auth: false,
            monitoring: false,
            messages: 0,
            lastCheck: null
        };
        
        this.init();
    }

    init() {
        this.connectSocket();
        this.bindEvents();
        this.updateUI();
        this.fetchInitialStatus();
    }

    connectSocket() {
        console.log('Подключаемся к серверу...');
        
        // Используем Socket.io если доступен, иначе WebSocket
        if (typeof io !== 'undefined') {
            this.connectSocketIO();
        } else {
            console.log('Socket.io не найден, используем WebSocket');
            this.connectWebSocket();
        }
    }

    connectSocketIO() {
        console.log('Используем Socket.io подключение');
        
        const connectionOptions = {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        };
        
        this.socket = io(window.location.origin, connectionOptions);
        
        this.socket.on('connect', () => {
            console.log('✅ Socket.io подключен');
            this.updateStatus('ws', 'connected');
            this.updateUI();
        });
        
        this.socket.on('connected', (data) => {
            console.log('Сервер подтвердил подключение:', data);
            this.showNotification('Подключено к серверу', 'success');
        });
        
        this.socket.on('status', (data) => {
            console.log('Получен статус:', data);
            this.updateStatus('lastCheck', new Date().toLocaleTimeString());
            this.updateUI();
        });
        
        this.socket.on('auth_status', (data) => {
            console.log('Статус авторизации:', data);
            this.updateStatus('auth', data.isAuthenticated || false);
            this.showNotification(`Авторизация: ${data.message || data.status}`);
            this.updateUI();
        });
        
        this.socket.on('monitoring_status', (data) => {
            console.log('Статус мониторинга:', data);
            this.updateStatus('monitoring', data.isMonitoring || false);
            this.showNotification(`Мониторинг: ${data.message || data.status}`);
            this.updateUI();
        });
        
        this.socket.on('new_message', (data) => {
            console.log('Новое сообщение:', data);
            this.addMessage(data);
            this.updateStatus('messages', this.status.messages + 1);
            this.showNotification(`Новое сообщение от ${data.sender || 'неизвестного'}`);
            this.updateUI();
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('❌ Socket.io отключен:', reason);
            this.updateStatus('ws', 'disconnected');
            this.updateUI();
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Ошибка подключения Socket.io:', error);
            this.updateStatus('ws', 'error');
            this.updateUI();
            
            // Пробуем через 5 секунд
            setTimeout(() => {
                if (this.status.ws !== 'connected') {
                    console.log('Пробуем переподключиться...');
                    this.connectSocket();
                }
            }, 5000);
        });
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        console.log('Используем WebSocket подключение:', wsUrl);
        
        try {
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => {
                console.log('✅ WebSocket подключен');
                this.updateStatus('ws', 'connected');
                this.updateUI();
            };
            
            this.socket.onclose = () => {
                console.log('WebSocket отключен');
                this.updateStatus('ws', 'disconnected');
                this.updateUI();
                
                // Переподключение через 5 секунд
                setTimeout(() => {
                    if (this.status.ws !== 'connected') {
                        console.log('Пробуем переподключиться...');
                        this.connectSocket();
                    }
                }, 5000);
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket ошибка:', error);
                this.updateStatus('ws', 'error');
                this.updateUI();
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Ошибка парсинга сообщения:', error, event.data);
                }
            };
        } catch (error) {
            console.error('Ошибка создания WebSocket:', error);
            this.updateStatus('ws', 'error');
            this.updateUI();
        }
    }

    handleMessage(data) {
        console.log('Получено сообщение:', data);
        
        if (data.type) {
            // Старый формат сообщений
            switch(data.type) {
                case 'auth-status':
                    this.updateStatus('auth', data.status === 'authenticated');
                    this.showNotification(`Авторизация: ${data.message}`);
                    break;
                    
                case 'monitor-status':
                    this.updateStatus('monitoring', data.status === 'started');
                    this.showNotification(`Мониторинг: ${data.message}`);
                    break;
                    
                case 'new-message':
                    this.addMessage(data);
                    this.updateStatus('messages', this.status.messages + 1);
                    this.showNotification(`Новое сообщение от ${data.sender}`);
                    break;
                    
                case 'monitor-update':
                    this.updateStatus('lastCheck', new Date(data.lastCheck).toLocaleTimeString());
                    break;
                    
                case 'messages-cleared':
                    this.clearMessages();
                    this.showNotification('История сообщений очищена');
                    break;
            }
        } else {
            // Новый формат (Socket.io события)
            console.log('Неизвестный формат сообщения:', data);
        }
        
        this.updateUI();
    }

    bindEvents() {
        const btnLogin = document.getElementById('btn-login');
        const btnStart = document.getElementById('btn-start');
        const btnStop = document.getElementById('btn-stop');
        const btnClear = document.getElementById('btn-clear');
        const btnRefresh = document.getElementById('btn-refresh');
        
        if (btnLogin) btnLogin.addEventListener('click', () => this.login());
        if (btnStart) btnStart.addEventListener('click', () => this.startMonitoring());
        if (btnStop) btnStop.addEventListener('click', () => this.stopMonitoring());
        if (btnClear) btnClear.addEventListener('click', () => this.clearHistory());
        if (btnRefresh) btnRefresh.addEventListener('click', () => this.fetchInitialStatus());
    }

    login() {
        if (!this.isConnected()) {
            this.showNotification('Сначала подключитесь к серверу', 'error');
            return;
        }
        
        const username = prompt('Введите логин Avito:');
        const password = prompt('Введите пароль Avito:');
        
        if (username && password) {
            this.sendMessage({
                type: 'auth',
                username: username,
                password: password
            });
            this.showNotification('Авторизация выполняется...', 'info');
        }
    }

    startMonitoring() {
        if (!this.isConnected()) {
            this.showNotification('Сначала подключитесь к серверу', 'error');
            return;
        }
        
        this.sendMessage({ type: 'start-monitoring' });
        this.showNotification('Запуск мониторинга...', 'info');
    }

    stopMonitoring() {
        if (!this.isConnected()) {
            this.showNotification('Сначала подключитесь к серверу', 'error');
            return;
        }
        
        this.sendMessage({ type: 'stop-monitoring' });
        this.showNotification('Остановка мониторинга...', 'info');
    }

    clearHistory() {
        this.sendMessage({ type: 'clear-messages' });
        this.status.messages = 0;
        this.clearMessages();
        this.updateUI();
        this.showNotification('История очищена', 'info');
    }

    fetchInitialStatus() {
        if (this.isConnected()) {
            this.sendMessage({ type: 'get-status' });
            this.showNotification('Обновление статуса...', 'info');
        } else {
            this.showNotification('Не подключено к серверу', 'error');
        }
    }

    sendMessage(data) {
        if (!this.isConnected()) {
            console.error('Не подключено к серверу');
            return;
        }
        
        if (this.socket instanceof WebSocket) {
            this.socket.send(JSON.stringify(data));
        } else if (this.socket && this.socket.emit) {
            // Socket.io
            if (data.type === 'auth') {
                this.socket.emit('auth_request', { username: data.username, password: data.password });
            } else if (data.type === 'start-monitoring') {
                this.socket.emit('start_monitoring');
            } else if (data.type === 'stop-monitoring') {
                this.socket.emit('stop_monitoring');
            } else if (data.type === 'clear-messages') {
                this.socket.emit('clear_messages');
            } else if (data.type === 'get-status') {
                this.socket.emit('get_status');
            } else {
                this.socket.emit('message', data);
            }
        }
    }

    isConnected() {
        if (this.socket instanceof WebSocket) {
            return this.socket.readyState === WebSocket.OPEN;
        } else if (this.socket && this.socket.connected) {
            return this.socket.connected;
        }
        return false;
    }

    addMessage(message) {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message-item';
        
        const time = new Date(message.timestamp || new Date()).toLocaleTimeString('ru-RU');
        const date = new Date(message.timestamp || new Date()).toLocaleDateString('ru-RU');
        
        messageElement.innerHTML = `
            <div class="message-header">
                <span>📨 ${message.sender || 'Неизвестный отправитель'}</span>
                <span>${date} ${time}</span>
            </div>
            <div class="message-content">
                ${message.content || 'Нет текста сообщения'}
            </div>
        `;
        
        messagesList.insertBefore(messageElement, messagesList.firstChild);
        
        // Ограничиваем количество сообщений
        const maxMessages = 50;
        if (messagesList.children.length > maxMessages) {
            messagesList.removeChild(messagesList.lastChild);
        }
    }

    clearMessages() {
        const messagesList = document.getElementById('messagesList');
        if (messagesList) {
            messagesList.innerHTML = '';
        }
    }

    updateStatus(key, value) {
        this.status[key] = value;
    }

    updateUI() {
        // Обновляем статус WebSocket
        const wsStatusElement = document.getElementById('wsStatus');
        const wsStatusText = document.getElementById('wsStatusText');
        if (wsStatusElement) {
            wsStatusElement.textContent = this.status.ws === 'connected' ? 'Подключен' : 'Отключен';
            wsStatusElement.className = this.status.ws === 'connected' ? 'status-online' : 'status-offline';
            if (wsStatusText) {
                wsStatusText.textContent = this.status.ws === 'connected' ? 'WebSocket: Подключен' : 'WebSocket: Отключен';
            }
        }
        
        // Обновляем статус авторизации
        const authStatus = document.getElementById('authStatus');
        if (authStatus) {
            authStatus.textContent = this.status.auth ? 'Авторизован' : 'Не авторизован';
            authStatus.className = this.status.auth ? 'status-online' : 'status-offline';
        }
        
        // Обновляем статус мониторинга
        const monitoringStatus = document.getElementById('monitoringStatus');
        if (monitoringStatus) {
            monitoringStatus.textContent = this.status.monitoring ? 'Активен' : 'Не активен';
            monitoringStatus.className = this.status.monitoring ? 'status-online' : 'status-offline';
        }
        
        // Обновляем счетчик сообщений
        const totalMessages = document.getElementById('totalMessages');
        if (totalMessages) {
            totalMessages.textContent = this.status.messages;
        }
        
        // Обновляем время последней проверки
        const lastCheck = document.getElementById('lastCheck');
        if (lastCheck && this.status.lastCheck) {
            lastCheck.textContent = this.status.lastCheck;
        }
        
        // Обновляем состояние кнопок
        const btnStart = document.getElementById('btn-start');
        const btnStop = document.getElementById('btn-stop');
        if (btnStart) btnStart.disabled = this.status.monitoring || !this.isConnected();
        if (btnStop) btnStop.disabled = !this.status.monitoring || !this.isConnected();
    }

    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Простая реализация уведомления
        try {
            alert(`[${type.toUpperCase()}] ${message}`);
        } catch (e) {
            console.log('Не удалось показать уведомление:', e);
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('AvitoMonitor инициализация...');
    window.monitor = new AvitoMonitor();
});
