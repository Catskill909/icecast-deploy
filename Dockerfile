# Build stage for React
FROM node:20-alpine AS builder

# Install Python and build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage - Use Liquidsoap as base, add Icecast + Node.js
FROM savonet/liquidsoap:v2.2.5 AS production

# The Liquidsoap image is Debian-based
# Install Node.js, Icecast, and supervisor
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    icecast2 \
    supervisor \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built React app
COPY --from=builder /app/dist ./dist

# Copy server code
COPY server ./server

# Create directories
RUN mkdir -p /app/data /var/log/icecast2 /var/log/supervisor
VOLUME ["/app/data"]

# Copy Icecast config
COPY icecast.xml /etc/icecast2/icecast.xml
RUN chmod 666 /etc/icecast2/icecast.xml

# Fix Icecast permissions
RUN chown -R liquidsoap:liquidsoap /var/log/icecast2

# Supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/streamdock.conf

# Liquidsoap config
COPY radio.liq /app/radio.liq

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV ICECAST_HOST=127.0.0.1
ENV ICECAST_PORT=8100
ENV ICECAST_PUBLIC_HOST=icecast.supersoul.top
ENV ICECAST_SOURCE_PASSWORD=streamdock_source
ENV DATABASE_PATH=/app/data/stations.db

# Ports
EXPOSE 3000
EXPOSE 8100
EXPOSE 8001

# Start supervisor
CMD ["supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
