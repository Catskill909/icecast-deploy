# Build stage for React
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage with Icecast + Node.js
FROM node:20-alpine AS production

# Install Icecast and supervisor to run multiple processes
RUN apk add --no-cache icecast supervisor

WORKDIR /app

# Copy package files and install production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built React app
COPY --from=builder /app/dist ./dist

# Copy server code
COPY server ./server

# Create directories
RUN mkdir -p /app/data /var/log/icecast /var/log/supervisor

# Copy Icecast config
COPY icecast.xml /etc/icecast.xml

# Fix Icecast permissions
RUN chown -R node:node /var/log/icecast

# Supervisor config to run both Icecast and Node
COPY supervisord.conf /etc/supervisord.conf

# All config hardcoded
ENV NODE_ENV=production
ENV PORT=3000
ENV ICECAST_HOST=localhost
ENV ICECAST_PORT=8000
ENV ICECAST_PUBLIC_HOST=icecast.supersoul.top
ENV ICECAST_SOURCE_PASSWORD=streamdock_source
ENV DATABASE_PATH=/app/data/stations.db

# Single port - Node.js proxies streams from internal Icecast
EXPOSE 3000

# Start supervisor (runs both icecast and node)
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
