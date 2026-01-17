#!/bin/bash

set -e

echo "🚀 dChat Go Backend Deployment Script"
echo "======================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
API_PORT=8080
WEBSOCKET_PORT=8081
PROJECT_DIR="/home/ubuntu/dchat/backend-go"

echo -e "${YELLOW}📦 Installing Go...${NC}"
if ! command -v go &> /dev/null; then
    cd /tmp
    wget -q https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
    sudo rm -rf /usr/local/go
    sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
    export PATH=$PATH:/usr/local/go/bin
    echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
fi

go version

echo -e "${YELLOW}📥 Downloading dependencies...${NC}"
cd $PROJECT_DIR
go mod download
go mod tidy

echo -e "${YELLOW}🔨 Building API server...${NC}"
go build -o bin/api cmd/api/main.go

echo -e "${YELLOW}🔨 Building WebSocket server...${NC}"
go build -o bin/websocket cmd/websocket/main.go

echo -e "${GREEN}✅ Build completed!${NC}"

echo -e "${YELLOW}🛑 Stopping old services...${NC}"
sudo systemctl stop dchat-api-go || true
sudo systemctl stop dchat-websocket-go || true

echo -e "${YELLOW}📝 Creating systemd services...${NC}"

# API Service
sudo tee /etc/systemd/system/dchat-api-go.service > /dev/null <<EOF
[Unit]
Description=dChat API Server (Go)
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$PROJECT_DIR
Environment="PATH=/usr/local/go/bin:/usr/bin:/bin"
ExecStart=$PROJECT_DIR/bin/api
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# WebSocket Service
sudo tee /etc/systemd/system/dchat-websocket-go.service > /dev/null <<EOF
[Unit]
Description=dChat WebSocket Server (Go)
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$PROJECT_DIR
Environment="PATH=/usr/local/go/bin:/usr/bin:/bin"
ExecStart=$PROJECT_DIR/bin/websocket
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo -e "${YELLOW}🔄 Reloading systemd...${NC}"
sudo systemctl daemon-reload

echo -e "${YELLOW}🚀 Starting services...${NC}"
sudo systemctl start dchat-api-go
sudo systemctl start dchat-websocket-go

echo -e "${YELLOW}✅ Enabling services to start on boot...${NC}"
sudo systemctl enable dchat-api-go
sudo systemctl enable dchat-websocket-go

echo -e "${GREEN}✅ Services started!${NC}"

echo -e "${YELLOW}📊 Checking service status...${NC}"
sudo systemctl status dchat-api-go --no-pager
sudo systemctl status dchat-websocket-go --no-pager

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo "API Server: http://localhost:$API_PORT"
echo "WebSocket Server: http://localhost:$WEBSOCKET_PORT"
echo ""
echo "View logs:"
echo "  API: sudo journalctl -u dchat-api-go -f"
echo "  WebSocket: sudo journalctl -u dchat-websocket-go -f"
