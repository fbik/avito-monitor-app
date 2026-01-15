# ===========================================
# BUILD STAGE
# ===========================================
FROM node:18-alpine AS builder

# Install Chromium for puppeteer and system dependencies
RUN apk add --no-cache \
    chromium \
    ca-certificates \
    tzdata \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript application
RUN npm run build

# ===========================================
# PRODUCTION STAGE
# ===========================================
FROM node:18-alpine

# Install Chromium and system dependencies
RUN apk add --no-cache \
    chromium \
    ca-certificates \
    tzdata \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-privileged user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Verify that public directory was copied
RUN echo "=== Checking public directory ===" && \
    if [ -d "public" ]; then \
      echo "✅ Public directory exists" && \
      ls -la public/; \
    else \
      echo "❌ Public directory not found" && \
      echo "Current directory contents:" && \
      ls -la; \
    fi

# Environment variables for Puppeteer and application
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production
ENV TZ=Europe/Moscow
ENV PORT=3000
ENV WS_PORT=3001

# Create directories for data and logs
RUN mkdir -p /app/data /app/logs && chown -R nodejs:nodejs /app/data /app/logs

# Switch to non-privileged user
USER nodejs

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Expose ports
EXPOSE 3000 3001

# Start the application
CMD ["node", "dist/main.js"]
