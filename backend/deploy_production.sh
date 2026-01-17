#!/bin/bash

# Production Deployment Script for Dchat.pro
# This script deploys the application to production with all security features enabled
# Author: Manus AI
# Date: 2025-11-05

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Dchat.pro Production Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}ERROR: Do not run this script as root${NC}"
   exit 1
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}ERROR: .env.production file not found${NC}"
    echo -e "${YELLOW}Please copy .env.production.example to .env.production and configure it${NC}"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Verify critical environment variables
echo -e "${YELLOW}[1/10] Verifying environment configuration...${NC}"
REQUIRED_VARS=("SECRET_KEY" "DATABASE_URL" "WEB3_PROVIDER_URI" "WALLET_ENCRYPTION_KEY")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}ERROR: Required environment variable $var is not set${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ Environment configuration verified${NC}"
echo ""

# Check Python version
echo -e "${YELLOW}[2/10] Checking Python version...${NC}"
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "Python version: $PYTHON_VERSION"
if ! python3 -c 'import sys; assert sys.version_info >= (3, 9)' 2>/dev/null; then
    echo -e "${RED}ERROR: Python 3.9 or higher is required${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python version OK${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}[3/10] Installing Python dependencies...${NC}"
pip3 install -r requirements.txt --quiet
pip3 install gunicorn gevent psycopg2-binary redis --quiet
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Run database migrations
echo -e "${YELLOW}[4/10] Running database migrations...${NC}"
if [ -d "migrations" ]; then
    for migration in migrations/*.sql; do
        if [ -f "$migration" ]; then
            echo "Running migration: $migration"
            psql $DATABASE_URL < "$migration" || echo "Migration already applied or failed: $migration"
        fi
    done
fi
echo -e "${GREEN}✓ Database migrations completed${NC}"
echo ""

# Initialize database tables
echo -e "${YELLOW}[5/10] Initializing database tables...${NC}"
python3 << EOF
import sys
sys.path.insert(0, '.')
from src.main import app, db
with app.app_context():
    db.create_all()
    print("Database tables created successfully")
EOF
echo -e "${GREEN}✓ Database initialized${NC}"
echo ""

# Run security checks
echo -e "${YELLOW}[6/10] Running security checks...${NC}"

# Check if DEBUG is disabled
if [ "$DEBUG" = "True" ]; then
    echo -e "${RED}WARNING: DEBUG mode is enabled in production!${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if rate limiting is enabled
if [ "$RATE_LIMIT_ENABLED" != "True" ]; then
    echo -e "${RED}WARNING: Rate limiting is disabled!${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if withdrawal limits are enabled
if [ "$WITHDRAWAL_LIMITS_ENABLED" != "True" ]; then
    echo -e "${RED}WARNING: Withdrawal limits are disabled!${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✓ Security checks passed${NC}"
echo ""

# Run tests
echo -e "${YELLOW}[7/10] Running tests...${NC}"
if [ -d "tests" ]; then
    python3 -m pytest tests/ -v --tb=short || {
        echo -e "${RED}ERROR: Tests failed${NC}"
        read -p "Deploy anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    }
fi
echo -e "${GREEN}✓ Tests passed${NC}"
echo ""

# Create log directories
echo -e "${YELLOW}[8/10] Creating log directories...${NC}"
sudo mkdir -p /var/log/dchat
sudo chown $USER:$USER /var/log/dchat
echo -e "${GREEN}✓ Log directories created${NC}"
echo ""

# Stop existing service
echo -e "${YELLOW}[9/10] Stopping existing service...${NC}"
if systemctl is-active --quiet dchat; then
    sudo systemctl stop dchat
    echo "Stopped dchat service"
fi
echo -e "${GREEN}✓ Service stopped${NC}"
echo ""

# Start production server
echo -e "${YELLOW}[10/10] Starting production server...${NC}"

# Create systemd service file
sudo tee /etc/systemd/system/dchat.service > /dev/null << EOL
[Unit]
Description=Dchat.pro API Server
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=$USER
WorkingDirectory=$(pwd)
Environment="PATH=$(pwd)/venv/bin"
EnvironmentFile=$(pwd)/.env.production
ExecStart=$(which gunicorn) --bind 0.0.0.0:5000 \\
    --workers ${WORKERS:-4} \\
    --worker-class ${WORKER_CLASS:-gevent} \\
    --worker-connections ${WORKER_CONNECTIONS:-1000} \\
    --timeout ${WORKER_TIMEOUT:-30} \\
    --access-logfile /var/log/dchat/access.log \\
    --error-logfile /var/log/dchat/error.log \\
    --log-level info \\
    src.main:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOL

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable dchat
sudo systemctl start dchat

# Wait for service to start
sleep 5

# Check if service is running
if systemctl is-active --quiet dchat; then
    echo -e "${GREEN}✓ Production server started successfully${NC}"
else
    echo -e "${RED}ERROR: Failed to start production server${NC}"
    echo -e "${YELLOW}Check logs: sudo journalctl -u dchat -n 50${NC}"
    exit 1
fi
echo ""

# Health check
echo -e "${YELLOW}Performing health check...${NC}"
sleep 2
HEALTH_RESPONSE=$(curl -s http://localhost:5000/api/health || echo "FAILED")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}WARNING: Health check failed${NC}"
    echo "Response: $HEALTH_RESPONSE"
fi
echo ""

# Display deployment summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Status: Running"
echo "Service: dchat.service"
echo "Port: 5000"
echo "Workers: ${WORKERS:-4}"
echo "Database: ${DATABASE_URL%%@*}@***"
echo "Web3 Provider: ${WEB3_PROVIDER_URI%%/v3/*}/v3/***"
echo ""
echo -e "${GREEN}Useful Commands:${NC}"
echo "  View logs:    sudo journalctl -u dchat -f"
echo "  Restart:      sudo systemctl restart dchat"
echo "  Stop:         sudo systemctl stop dchat"
echo "  Status:       sudo systemctl status dchat"
echo ""
echo -e "${GREEN}Security Features Enabled:${NC}"
echo "  ✓ Rate limiting: ${RATE_LIMIT_ENABLED:-False}"
echo "  ✓ Withdrawal limits: ${WITHDRAWAL_LIMITS_ENABLED:-False}"
echo "  ✓ Audit logging: ${LOGGING_ENABLED:-False}"
echo "  ✓ Production mode: ${PRODUCTION_MODE:-False}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
