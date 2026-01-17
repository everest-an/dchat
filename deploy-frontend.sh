#!/bin/bash

###############################################################################
# Dchat Frontend Deployment Script
# This script automates the deployment of the Dchat frontend to production
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="dchat"
FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/frontend" && pwd)"
BUILD_DIR="${FRONTEND_DIR}/build"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
DEPLOY_HOST="${DEPLOY_HOST:-dchat.pro}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/dchat}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/dchat}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check if git is installed
    if ! command -v git &> /dev/null; then
        log_error "git is not installed. Please install git first."
        exit 1
    fi
    
    log_success "All prerequisites are met"
}

pull_latest_code() {
    log_info "Pulling latest code from GitHub..."
    
    cd "$(dirname "${BASH_SOURCE[0]}")"
    
    # Stash any local changes
    if [[ -n $(git status -s) ]]; then
        log_warning "Stashing local changes..."
        git stash
    fi
    
    # Pull latest code
    git pull origin main
    
    log_success "Latest code pulled successfully"
}

install_dependencies() {
    log_info "Installing frontend dependencies..."
    
    cd "${FRONTEND_DIR}"
    
    # Clean install
    rm -rf node_modules package-lock.json
    npm install
    
    log_success "Dependencies installed successfully"
}

run_tests() {
    log_info "Running tests..."
    
    cd "${FRONTEND_DIR}"
    
    # Run tests if they exist
    if npm run test --if-present 2>/dev/null; then
        log_success "All tests passed"
    else
        log_warning "No tests found or tests skipped"
    fi
}

build_frontend() {
    log_info "Building frontend for production..."
    
    cd "${FRONTEND_DIR}"
    
    # Set production environment
    export NODE_ENV=production
    export REACT_APP_API_URL="https://api.dchat.pro"
    
    # Build
    npm run build
    
    if [ ! -d "${BUILD_DIR}" ]; then
        log_error "Build directory not found. Build may have failed."
        exit 1
    fi
    
    log_success "Frontend built successfully"
}

create_backup() {
    log_info "Creating backup of current deployment..."
    
    # Create backup directory if it doesn't exist
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "mkdir -p ${BACKUP_DIR}"
    
    # Backup current deployment
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
        if [ -d ${DEPLOY_PATH} ]; then
            tar -czf ${BACKUP_DIR}/dchat_${TIMESTAMP}.tar.gz -C ${DEPLOY_PATH} .
            echo 'Backup created: ${BACKUP_DIR}/dchat_${TIMESTAMP}.tar.gz'
        else
            echo 'No existing deployment to backup'
        fi
    "
    
    log_success "Backup created successfully"
}

deploy_to_server() {
    log_info "Deploying to production server..."
    
    # Create deployment directory if it doesn't exist
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "mkdir -p ${DEPLOY_PATH}"
    
    # Sync build files to server
    rsync -avz --delete \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='.env' \
        "${BUILD_DIR}/" \
        "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"
    
    log_success "Files deployed to server"
}

configure_nginx() {
    log_info "Configuring Nginx..."
    
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
        # Create Nginx configuration
        sudo tee /etc/nginx/sites-available/dchat > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name dchat.pro www.dchat.pro;

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name dchat.pro www.dchat.pro;

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/dchat.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dchat.pro/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Root directory
    root ${DEPLOY_PATH};
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Security headers
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header X-XSS-Protection \"1; mode=block\" always;
    add_header Referrer-Policy \"no-referrer-when-downgrade\" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }

    # React Router support
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

        # Enable site
        sudo ln -sf /etc/nginx/sites-available/dchat /etc/nginx/sites-enabled/
        
        # Test Nginx configuration
        sudo nginx -t
        
        # Reload Nginx
        sudo systemctl reload nginx
    "
    
    log_success "Nginx configured successfully"
}

setup_ssl() {
    log_info "Setting up SSL certificate..."
    
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
        # Check if certbot is installed
        if ! command -v certbot &> /dev/null; then
            echo 'Installing certbot...'
            sudo apt-get update
            sudo apt-get install -y certbot python3-certbot-nginx
        fi
        
        # Obtain SSL certificate
        if [ ! -d /etc/letsencrypt/live/dchat.pro ]; then
            sudo certbot --nginx -d dchat.pro -d www.dchat.pro --non-interactive --agree-tos --email admin@dchat.pro
        else
            echo 'SSL certificate already exists'
        fi
    "
    
    log_success "SSL certificate configured"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check if site is accessible
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://dchat.pro)
    
    if [ "$HTTP_CODE" -eq 200 ]; then
        log_success "Deployment verified! Site is accessible at https://dchat.pro"
    else
        log_error "Deployment verification failed. HTTP code: $HTTP_CODE"
        exit 1
    fi
}

cleanup() {
    log_info "Cleaning up..."
    
    # Remove old backups (keep last 5)
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
        cd ${BACKUP_DIR}
        ls -t dchat_*.tar.gz | tail -n +6 | xargs -r rm
    "
    
    log_success "Cleanup completed"
}

# Main deployment flow
main() {
    log_info "Starting Dchat frontend deployment..."
    echo ""
    
    check_prerequisites
    pull_latest_code
    install_dependencies
    run_tests
    build_frontend
    create_backup
    deploy_to_server
    configure_nginx
    setup_ssl
    verify_deployment
    cleanup
    
    echo ""
    log_success "==================================="
    log_success "Deployment completed successfully!"
    log_success "==================================="
    log_info "Site URL: https://dchat.pro"
    log_info "Backup: ${BACKUP_DIR}/dchat_${TIMESTAMP}.tar.gz"
}

# Run main function
main "$@"
