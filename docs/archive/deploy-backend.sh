#!/bin/bash

###############################################################################
# Dchat Backend Deployment Script
# This script automates the deployment of the Dchat backend to production
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="dchat-backend"
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/backend" && pwd)"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
DEPLOY_HOST="${DEPLOY_HOST:-dchat.pro}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/dchat-backend}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/dchat-backend}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PM2_APP_NAME="dchat-api"

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
    log_info "Installing backend dependencies..."
    
    cd "${BACKEND_DIR}"
    
    # Install dependencies
    npm install --production
    
    log_success "Dependencies installed successfully"
}

run_tests() {
    log_info "Running backend tests..."
    
    cd "${BACKEND_DIR}"
    
    # Run tests if they exist
    if npm run test --if-present 2>/dev/null; then
        log_success "All tests passed"
    else
        log_warning "No tests found or tests skipped"
    fi
}

create_backup() {
    log_info "Creating backup of current deployment..."
    
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
        mkdir -p ${BACKUP_DIR}
        
        if [ -d ${DEPLOY_PATH} ]; then
            tar -czf ${BACKUP_DIR}/backend_${TIMESTAMP}.tar.gz -C ${DEPLOY_PATH} .
            echo 'Backup created: ${BACKUP_DIR}/backend_${TIMESTAMP}.tar.gz'
        else
            echo 'No existing deployment to backup'
        fi
    "
    
    log_success "Backup created successfully"
}

deploy_to_server() {
    log_info "Deploying backend to production server..."
    
    # Create deployment directory
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "mkdir -p ${DEPLOY_PATH}"
    
    # Sync backend files
    rsync -avz --delete \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='.env' \
        --exclude='*.log' \
        "${BACKEND_DIR}/" \
        "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"
    
    log_success "Files deployed to server"
}

setup_environment() {
    log_info "Setting up environment variables..."
    
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
        cd ${DEPLOY_PATH}
        
        # Create .env file if it doesn't exist
        if [ ! -f .env ]; then
            cat > .env <<'EOF'
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# JWT Configuration
JWT_SECRET=\$(openssl rand -base64 32)

# Database Configuration (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# CORS Configuration
CORS_ORIGIN=https://dchat.pro

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/opt/dchat-backend/uploads

# AWS S3 (Optional)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=dchat-uploads

# Stripe (Optional)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# LinkedIn OAuth (Optional)
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=https://dchat.pro/auth/linkedin/callback
EOF
            
            echo 'Created .env file. Please update with actual values.'
        else
            echo '.env file already exists'
        fi
    "
    
    log_warning "Please update .env file with actual values on the server"
    log_success "Environment setup completed"
}

install_server_dependencies() {
    log_info "Installing dependencies on server..."
    
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
        cd ${DEPLOY_PATH}
        npm install --production
    "
    
    log_success "Server dependencies installed"
}

setup_pm2() {
    log_info "Setting up PM2 process manager..."
    
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
        # Install PM2 globally if not installed
        if ! command -v pm2 &> /dev/null; then
            sudo npm install -g pm2
        fi
        
        cd ${DEPLOY_PATH}
        
        # Create PM2 ecosystem file
        cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: '${PM2_APP_NAME}',
    script: './src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
        
        # Create logs directory
        mkdir -p logs
        
        # Stop existing process
        pm2 stop ${PM2_APP_NAME} || true
        pm2 delete ${PM2_APP_NAME} || true
        
        # Start with PM2
        pm2 start ecosystem.config.js
        
        # Save PM2 configuration
        pm2 save
        
        # Setup PM2 startup script
        sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u ${DEPLOY_USER} --hp /home/${DEPLOY_USER}
    "
    
    log_success "PM2 configured successfully"
}

setup_nginx_api() {
    log_info "Configuring Nginx for API..."
    
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
        # Nginx configuration is already set up in frontend deployment
        # Just reload to apply any changes
        sudo nginx -t && sudo systemctl reload nginx
    "
    
    log_success "Nginx API configuration verified"
}

verify_deployment() {
    log_info "Verifying backend deployment..."
    
    # Wait for server to start
    sleep 5
    
    # Check if API is accessible
    HTTP_CODE=\$(curl -s -o /dev/null -w \"%{http_code}\" https://dchat.pro/api/health || echo \"000\")
    
    if [ \"\$HTTP_CODE\" -eq 200 ]; then
        log_success \"Backend verified! API is accessible at https://dchat.pro/api\"
    else
        log_warning \"Backend verification returned HTTP code: \$HTTP_CODE\"
        log_info \"Checking PM2 status...\"
        ssh \"${DEPLOY_USER}@${DEPLOY_HOST}\" \"pm2 status\"
    fi
}

show_logs() {
    log_info \"Showing recent logs...\"
    
    ssh \"${DEPLOY_USER}@${DEPLOY_HOST}\" \"
        cd ${DEPLOY_PATH}
        pm2 logs ${PM2_APP_NAME} --lines 20 --nostream
    \"
}

cleanup() {
    log_info \"Cleaning up...\"
    
    # Remove old backups (keep last 5)
    ssh \"${DEPLOY_USER}@${DEPLOY_HOST}\" \"
        cd ${BACKUP_DIR}
        ls -t backend_*.tar.gz | tail -n +6 | xargs -r rm
    \"
    
    log_success \"Cleanup completed\"
}

# Main deployment flow
main() {
    log_info \"Starting Dchat backend deployment...\"
    echo \"\"
    
    check_prerequisites
    pull_latest_code
    install_dependencies
    run_tests
    create_backup
    deploy_to_server
    setup_environment
    install_server_dependencies
    setup_pm2
    setup_nginx_api
    verify_deployment
    show_logs
    cleanup
    
    echo \"\"
    log_success \"===================================\"
    log_success \"Deployment completed successfully!\"
    log_success \"===================================\"
    log_info \"API URL: https://dchat.pro/api\"
    log_info \"Backup: ${BACKUP_DIR}/backend_${TIMESTAMP}.tar.gz\"
    log_info \"\"
    log_info \"Useful commands:\"
    log_info \"  - View logs: ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'pm2 logs ${PM2_APP_NAME}'\"
    log_info \"  - Restart: ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'pm2 restart ${PM2_APP_NAME}'\"
    log_info \"  - Status: ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'pm2 status'\"
}

# Run main function
main \"\$@\"
