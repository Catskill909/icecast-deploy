# Build stage for React (Alpine is fine here)
FROM node:20-alpine AS builder

# Install Python and build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage with Icecast + Node.js + Liquidsoap
# Using Debian Slim because Liquidsoap binaries require glibc (Alpine uses musl)
FROM node:20-slim AS production

# Install Icecast, supervisor, curl, ffmpeg, and build tools for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    icecast2 \
    supervisor \
    curl \
    ffmpeg \
    python3 \
    make \
    g++ \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Liquidsoap from official APT repository
RUN curl -fsSL https://apt.liquidsoap.info/liquidsoap.asc | gpg --dearmor -o /usr/share/keyrings/liquidsoap.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/liquidsoap.gpg] https://apt.liquidsoap.info/debian bookworm main" > /etc/apt/sources.list.d/liquidsoap.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends liquidsoap && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install production deps
COPY package*.json ./
RUN npm ci --omit=dev && apt-get purge -y python3 make g++ && apt-get autoremove -y

# Copy built React app
COPY --from=builder /app/dist ./dist

# Copy server code
COPY server ./server

# Create directories
RUN mkdir -p /app/data /var/log/icecast2 /var/log/supervisor
VOLUME ["/app/data"]

# Copy Icecast config (initial version, will be regenerated dynamically)
# Note: Debian uses /etc/icecast2/icecast.xml by default
COPY icecast.xml /etc/icecast2/icecast.xml
RUN chmod 666 /etc/icecast2/icecast.xml

# Fix Icecast permissions
RUN chown -R node:node /var/log/icecast2

# Supervisor config to run Icecast, Node, and Liquidsoap
COPY supervisord.conf /etc/supervisor/conf.d/streamdock.conf

# Liquidsoap config
COPY radio.liq /app/radio.liq

# All config hardcoded
ENV NODE_ENV=production
ENV PORT=3000
ENV ICECAST_HOST=127.0.0.1
ENV ICECAST_PORT=8100
ENV ICECAST_PUBLIC_HOST=icecast.supersoul.top
ENV ICECAST_SOURCE_PASSWORD=streamdock_source
ENV DATABASE_PATH=/app/data/stations.db

# Ports:
# 3000 - Node.js API/Web UI
# 8100 - Icecast (listener output)
# 8001 - Liquidsoap harbor (encoder input)
EXPOSE 3000
EXPOSE 8100
EXPOSE 8001

# Start supervisor (runs Icecast, Node, and Liquidsoap)
CMD ["supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
