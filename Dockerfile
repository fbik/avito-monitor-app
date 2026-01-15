# ===========================================
# BUILD STAGE
# ===========================================
FROM node:18-alpine AS builder

# Устанавливаем Chromium для puppeteer и системные зависимости
RUN apk add --no-cache \
    chromium \
    ca-certificates \
    tzdata \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем TypeScript приложение
RUN npm run build

# ===========================================
# PRODUCTION STAGE
# ===========================================
FROM node:18-alpine

# Устанавливаем Chromium и системные зависимости
RUN apk add --no-cache \
    chromium \
    ca-certificates \
    tzdata \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Создаем непривилегированного пользователя для безопасности
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем собранное приложение из builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Настройки окружения для Puppeteer и приложения
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production
ENV TZ=Europe/Moscow
ENV PORT=3000
ENV WS_PORT=3001

# Создаем директории для данных и логов
RUN mkdir -p /app/data /app/logs && chown -R nodejs:nodejs /app/data /app/logs

# Переключаемся на непривилегированного пользователя
USER nodejs

# Используем dumb-init для корректной обработки сигналов
ENTRYPOINT ["dumb-init", "--"]

# Открываем порты
EXPOSE 3000 3001

# Запускаем приложение
CMD ["node", "dist/main.js"]
