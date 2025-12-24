# Build stage for React
FROM node:20-alpine AS builder

# Install Python and build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage with Icecast + Node.js
FROM node:20-alpine AS production

# Install Icecast, supervisor, curl, ffmpeg, and build tools for better-sqlite3
RUN apk add --no-cache icecast supervisor curl ffmpeg python3 make g++

WORKDIR /app

# Copy package files and install production deps
COPY package*.json ./
RUN npm ci --omit=dev && apk del python3 make g++

# Copy built React app
COPY --from=builder /app/dist ./dist

# Copy server code
COPY server ./server

# Create directories
RUN mkdir -p /app/data /var/log/icecast /var/log/supervisor
VOLUME ["/app/data"]

# Copy Icecast config (initial version, will be regenerated dynamically)
COPY icecast.xml /etc/icecast.xml
RUN chmod 666 /etc/icecast.xml

# Fix Icecast permissions
RUN chown -R node:node /var/log/icecast

# Supervisor config to run both Icecast and Node
COPY supervisord.conf /etc/supervisord.conf

# All config hardcoded
ENV NODE_ENV=production
ENV PORT=3000
ENV ICECAST_HOST=127.0.0.1
ENV ICECAST_PORT=8100
ENV ICECAST_PUBLIC_HOST=icecast.supersoul.top
ENV ICECAST_SOURCE_PASSWORD=streamdock_source
ENV DATABASE_PATH=/app/data/stations.db

# Single port - Node.js proxies streams from internal Icecast
EXPOSE 3000
EXPOSE 8100

# Start via startup.sh which generates icecast config BEFORE starting supervisord
# This ensures all mounts (including -fallback) exist when Icecast starts
CMD ["/app/startup.sh"]
