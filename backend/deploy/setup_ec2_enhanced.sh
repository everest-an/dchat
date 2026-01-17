#!/bin/bash
# Enhanced EC2 Setup Script for Socket.IO Server
# Includes Nginx, SSL support, and monitoring
# Run this script on a fresh Ubuntu 22.04 EC2 instance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Dchat Socket.IO Server - Enhanced Setup"
echo "========================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ Please do not run this script as root${NC}"
    exit 1
fi

# Prompt for configuration
read -p "Enter your domain name (e.g., socket.dchat.pro) or press Enter to skip SSL setup: " DOMAIN_NAME
read -p "Enter your email for Let's Encrypt (or press Enter to skip): " SSL_EMAIL

USE_SSL=false
if [ ! -z "$DOMAIN_NAME" ] && [ ! -z "$SSL_EMAIL" ]; then
    USE_SSL=true
    echo -e "${GREEN}✓ SSL will be configured for $DOMAIN_NAME${NC}"
else
    echo -e "${YELLOW}⚠ Skipping SSL configuration${NC}"
fi

# Update system
echo -e "${GREEN}📦 Updating system packages...${NC}"
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
echo -e "${GREEN}📦 Installing required packages...${NC}"
sudo apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw \
    htop \
    curl \
    wget

# Clone repository
echo -e "${GREEN}📥 Cloning Dchat repository...${NC}"
cd /home/ubuntu
if [ -d "dchat" ]; then
    echo "Repository already exists, pulling latest..."
    cd dchat
    git pull origin main
else
    git clone https://github.com/everest-an/dchat.git
    cd dchat
fi

# Install backend dependencies
echo -e "${GREEN}📦 Installing Python dependencies...${NC}"
cd backend
pip3 install -r requirements.txt

# Create environment file
echo -e "${GREEN}⚙️  Creating environment configuration...${NC}"
cd /home/ubuntu/dchat/backend/src
if [ ! -f ".env.production" ]; then
    cp ../deploy/.env.production.example .env.production
    echo -e "${YELLOW}⚠ Please edit .env.production with your configuration${NC}"
fi

# Create systemd service (using enhanced app)
echo -e "${GREEN}⚙️  Creating systemd service...${NC}"
sudo tee /etc/systemd/system/dchat-socket.service > /dev/null <<EOF
[Unit]
Description=Dchat Socket.IO Server (Enhanced)
After=network.target
Documentation=https://github.com/everest-an/dchat

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/dchat/backend/src
Environment="PATH=/usr/bin:/usr/local/bin"
Environment="PYTHONUNBUFFERED=1"
EnvironmentFile=/home/ubuntu/dchat/backend/src/.env.production
ExecStart=/usr/bin/python3 socket_app_enhanced.py
Restart=always
RestartSec=10
StandardOutput=append:/var/log/dchat-socket.log
StandardError=append:/var/log/dchat-socket-error.log

# Security
NoNewPrivileges=true
PrivateTmp=true

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

# Create log files
echo -e "${GREEN}📝 Creating log files...${NC}"
sudo touch /var/log/dchat-socket.log
sudo touch /var/log/dchat-socket-error.log
sudo chown ubuntu:ubuntu /var/log/dchat-socket.log
sudo chown ubuntu:ubuntu /var/log/dchat-socket-error.log

# Configure log rotation
sudo tee /etc/logrotate.d/dchat-socket > /dev/null <<EOF
/var/log/dchat-socket.log /var/log/dchat-socket-error.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 ubuntu ubuntu
    sharedscripts
    postrotate
        systemctl reload dchat-socket > /dev/null 2>&1 || true
    endscript
}
EOF

# Configure Nginx
echo -e "${GREEN}🌐 Configuring Nginx...${NC}"

if [ "$USE_SSL" = true ]; then
    # Copy Nginx config
    sudo cp /home/ubuntu/dchat/backend/deploy/nginx_socket_io.conf /etc/nginx/sites-available/dchat-socket
    
    # Update domain name in config
    sudo sed -i "s/socket.dchat.pro/$DOMAIN_NAME/g" /etc/nginx/sites-available/dchat-socket
    
    # Enable site (temporarily without SSL)
    sudo ln -sf /etc/nginx/sites-available/dchat-socket /etc/nginx/sites-enabled/
    
    # Test Nginx config
    sudo nginx -t
    
    # Reload Nginx
    sudo systemctl reload nginx
    
    # Get SSL certificate
    echo -e "${GREEN}🔒 Obtaining SSL certificate...${NC}"
    sudo certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email $SSL_EMAIL
    
    echo -e "${GREEN}✓ SSL certificate obtained${NC}"
else
    # Simple Nginx config without SSL
    sudo tee /etc/nginx/sites-available/dchat-socket > /dev/null <<EOF
upstream socket_io_backend {
    server 127.0.0.1:8001;
}

server {
    listen 80;
    server_name _;
    
    location /socket.io/ {
        proxy_pass http://socket_io_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_buffering off;
    }
    
    location / {
        proxy_pass http://socket_io_backend/;
        proxy_set_header Host \$host;
    }
}
EOF
    
    sudo ln -sf /etc/nginx/sites-available/dchat-socket /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
fi

# Configure firewall
echo -e "${GREEN}🔥 Configuring firewall...${NC}"
sudo ufw --force enable
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 8001/tcp # Socket.IO (direct access)
sudo ufw status

# Enable and start services
echo -e "${GREEN}🚀 Starting services...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable dchat-socket
sudo systemctl enable nginx
sudo systemctl start dchat-socket
sudo systemctl start nginx

# Wait for service to start
sleep 3

# Check service status
echo -e "${GREEN}✅ Checking service status...${NC}"
sudo systemctl status dchat-socket --no-pager || true

# Test health endpoint
echo -e "${GREEN}🏥 Testing health endpoint...${NC}"
sleep 2
curl -f http://localhost:8001/health || echo -e "${RED}❌ Health check failed${NC}"

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "Unable to get IP")

# Create deployment info file
cat > /home/ubuntu/dchat-deployment-info.txt <<EOF
Dchat Socket.IO Server Deployment Information
==============================================

Deployed: $(date)
Public IP: $PUBLIC_IP
Domain: ${DOMAIN_NAME:-Not configured}
SSL: ${USE_SSL}

Service Status:
  sudo systemctl status dchat-socket

View Logs:
  sudo journalctl -u dchat-socket -f
  tail -f /var/log/dchat-socket.log

Service Commands:
  sudo systemctl start dchat-socket
  sudo systemctl stop dchat-socket
  sudo systemctl restart dchat-socket
  sudo systemctl reload dchat-socket

Nginx Commands:
  sudo systemctl status nginx
  sudo systemctl reload nginx
  sudo nginx -t

Health Check:
  curl http://localhost:8001/health
  curl http://$PUBLIC_IP:8001/health

Metrics:
  curl http://localhost:8001/metrics

Update Application:
  cd /home/ubuntu/dchat
  git pull origin main
  cd backend
  pip3 install -r requirements.txt
  sudo systemctl restart dchat-socket

SSL Certificate Renewal (if configured):
  sudo certbot renew --dry-run
  sudo certbot renew

Frontend Configuration:
  VITE_SOCKET_URL=${USE_SSL:+https://$DOMAIN_NAME}${USE_SSL:-http://$PUBLIC_IP:8001}

Monitoring:
  htop
  sudo journalctl -u dchat-socket --since "1 hour ago"
  tail -100 /var/log/dchat-socket.log

Firewall:
  sudo ufw status
  sudo ufw allow <port>/tcp
EOF

# Display summary
echo ""
echo "========================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Socket.IO Server is running!"
echo ""
if [ "$USE_SSL" = true ]; then
    echo "🔒 HTTPS URL: https://$DOMAIN_NAME"
    echo "   Frontend config: VITE_SOCKET_URL=https://$DOMAIN_NAME"
else
    echo "🌐 HTTP URL: http://$PUBLIC_IP:8001"
    echo "   Frontend config: VITE_SOCKET_URL=http://$PUBLIC_IP:8001"
fi
echo ""
echo "📊 Health Check:"
echo "   curl http://localhost:8001/health"
echo ""
echo "📝 View Logs:"
echo "   sudo journalctl -u dchat-socket -f"
echo ""
echo "📄 Deployment info saved to:"
echo "   /home/ubuntu/dchat-deployment-info.txt"
echo ""
echo "========================================="
