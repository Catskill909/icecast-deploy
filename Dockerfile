# Build stage for React
FROM node:20-alpine AS builder

# Install Python and build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Get Liquidsoap from official image
FROM savonet/liquidsoap:v2.2.5 AS liquidsoap

# Production stage with Icecast + Node.js + Liquidsoap
FROM node:20-slim AS production

# Install Icecast, supervisor, curl, ffmpeg, and build tools for better-sqlite3
# Also install libs that Liquidsoap needs
RUN apt-get update && apt-get install -y --no-install-recommends \
    icecast2 \
    supervisor \
    curl \
    ffmpeg \
    python3 \
    make \
    g++ \
    libao4 \
    libmad0 \
    libmp3lame0 \
    libogg0 \
    libvorbis0a \
    libvorbisenc2 \
    libflac12 \
    libsamplerate0 \
    libpcre3 \
    && rm -rf /var/lib/apt/lists/*

# Copy Liquidsoap binary from official image
COPY --from=liquidsoap /usr/bin/liquidsoap /usr/bin/liquidsoap
COPY --from=liquidsoap /usr/lib/liquidsoap /usr/lib/liquidsoap

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

# Copy Icecast config
COPY icecast.xml /etc/icecast2/icecast.xml
RUN chmod 666 /etc/icecast2/icecast.xml

# Fix Icecast permissions
RUN chown -R node:node /var/log/icecast2

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
