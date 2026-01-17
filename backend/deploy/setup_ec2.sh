#!/bin/bash
# EC2 Setup Script for Socket.IO Server
# Run this script on a fresh Ubuntu 22.04 EC2 instance

set -e

echo "========================================="
echo "Dchat Socket.IO Server - EC2 Setup"
echo "========================================="

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Python 3.11
echo "🐍 Installing Python 3.11..."
sudo apt-get install -y python3.11 python3.11-venv python3-pip

# Install Git
echo "📚 Installing Git..."
sudo apt-get install -y git

# Clone repository
echo "📥 Cloning Dchat repository..."
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
echo "📦 Installing Python dependencies..."
cd backend
pip3 install -r requirements.txt

# Create systemd service
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/dchat-socket.service > /dev/null <<EOF
[Unit]
Description=Dchat Socket.IO Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/dchat/backend/src
ExecStart=/usr/bin/python3 socket_app.py
Restart=always
RestartSec=10
StandardOutput=append:/var/log/dchat-socket.log
StandardError=append:/var/log/dchat-socket-error.log

[Install]
WantedBy=multi-user.target
EOF

# Create log files
echo "📝 Creating log files..."
sudo touch /var/log/dchat-socket.log
sudo touch /var/log/dchat-socket-error.log
sudo chown ubuntu:ubuntu /var/log/dchat-socket.log
sudo chown ubuntu:ubuntu /var/log/dchat-socket-error.log

# Enable and start service
echo "🚀 Starting Socket.IO service..."
sudo systemctl daemon-reload
sudo systemctl enable dchat-socket
sudo systemctl start dchat-socket

# Check status
echo "✅ Checking service status..."
sudo systemctl status dchat-socket --no-pager

# Configure firewall (if ufw is enabled)
if sudo ufw status | grep -q "Status: active"; then
    echo "🔥 Configuring firewall..."
    sudo ufw allow 8001/tcp
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
fi

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

echo ""
echo "========================================="
echo "✅ Setup Complete!"
echo "========================================="
echo ""
echo "Socket.IO Server is running on:"
echo "  http://$PUBLIC_IP:8001"
echo ""
echo "Health check:"
echo "  curl http://$PUBLIC_IP:8001/health"
echo ""
echo "View logs:"
echo "  sudo journalctl -u dchat-socket -f"
echo "  tail -f /var/log/dchat-socket.log"
echo ""
echo "Service commands:"
echo "  sudo systemctl status dchat-socket"
echo "  sudo systemctl restart dchat-socket"
echo "  sudo systemctl stop dchat-socket"
echo ""
echo "Update frontend .env.production with:"
echo "  VITE_SOCKET_URL=http://$PUBLIC_IP:8001"
echo ""
echo "========================================="
