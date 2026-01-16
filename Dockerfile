# Build stage for Go backend
FROM golang:1.21-alpine AS backend-builder

WORKDIR /build

# Install build dependencies
RUN apk add --no-cache gcc musl-dev

# Copy source code
COPY backend/ ./

# Download dependencies and build
RUN go mod tidy && CGO_ENABLED=1 GOOS=linux go build -o ztp-server .

# Build stage for React frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# Copy package files first for caching
COPY frontend/package*.json ./
RUN npm install

# Copy source files
COPY frontend/ ./

# Copy shared core (symlink doesn't work in Docker, so copy directly)
COPY shared/core/ ./src/core/

RUN npm run build

# Final runtime image
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache \
    dnsmasq \
    ca-certificates \
    tzdata

# Create directories
RUN mkdir -p /app/frontend /data /tftp /backups /dnsmasq /configs/templates /var/lib/misc

# Copy backend binary
COPY --from=backend-builder /build/ztp-server /app/

# Copy frontend build
COPY --from=frontend-builder /build/dist/ /app/frontend/

# Copy default templates
COPY configs/templates/ /configs/templates/

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Environment defaults
ENV DB_PATH=/data/ztp.db
ENV DNSMASQ_CONFIG=/dnsmasq/dnsmasq.conf
ENV TFTP_DIR=/tftp
ENV TEMPLATES_DIR=/configs/templates
ENV BACKUP_DIR=/backups
ENV LEASE_PATH=/var/lib/misc/dnsmasq.leases
ENV DNSMASQ_PID=/var/run/dnsmasq.pid
ENV LISTEN_ADDR=:8080

# Expose ports
EXPOSE 8080
EXPOSE 67/udp
EXPOSE 69/udp

# Volumes
VOLUME ["/data", "/tftp", "/backups", "/configs/templates"]

ENTRYPOINT ["/entrypoint.sh"]
