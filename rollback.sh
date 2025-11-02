#!/bin/bash

###############################################################################
# Dchat Rollback Script
# This script rolls back the application to a previous version
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
DEPLOY_HOST="${DEPLOY_HOST:-dchat.pro}"
FRONTEND_PATH="${FRONTEND_PATH:-/var/www/dchat}"
BACKEND_PATH="${BACKEND_PATH:-/opt/dchat-backend}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups}"
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

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Rollback Dchat application to a previous version.

OPTIONS:
    -t, --target <timestamp>    Rollback to specific backup timestamp
    -f, --frontend-only         Rollback frontend only
    -b, --backend-only          Rollback backend only
    -l, --list                  List available backups
    -h, --help                  Show this help message

EXAMPLES:
    # List available backups
    $0 --list

    # Rollback to specific timestamp
    $0 --target 20251103_120000

    # Rollback frontend only
    $0 --frontend-only --target 20251103_120000

    # Rollback backend only
    $0 --backend-only --target 20251103_120000

EOF
}

list_backups() {
    log_info "Listing available backups..."
    
    echo ""
    echo "Frontend Backups:"
    echo "=================="
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
        if [ -d ${BACKUP_DIR}/dchat ]; then
            ls -lh ${BACKUP_DIR}/dchat/*.tar.gz | awk '{print \$9, \$5, \$6, \$7, \$8}' | sort -r
        else
            echo 'No frontend backups found'
        fi
    "
    
    echo ""
    echo "Backend Backups:"
    echo "================"
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
        if [ -d ${BACKUP_DIR}/dchat-backend ]; then
            ls -lh ${BACKUP_DIR}/dchat-backend/*.tar.gz | awk '{print \$9, \$5, \$6, \$7, \$8}' | sort -r
        else
            echo 'No backend backups found'
        fi
    "
    
    echo ""
}

get_latest_backup() {
    local backup_type=$1
    local backup_path=""
    
    if [ "$backup_type" == "frontend" ]; then
        backup_path="${BACKUP_DIR}/dchat"
    else
        backup_path="${BACKUP_DIR}/dchat-backend"
    fi
    
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
        ls -t ${backup_path}/*.tar.gz 2>/dev/null | head -1
    "
}

verify_backup_exists() {
    local backup_file=$1
    
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
        if [ -f ${backup_file} ]; then
            echo 'exists'
        else
            echo 'not_found'
        fi
    "
}

create_pre_rollback_backup() {
    log_info "Creating pre-rollback backup..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
        # Backup frontend
        if [ -d ${FRONTEND_PATH} ]; then
            mkdir -p ${BACKUP_DIR}/dchat
            tar -czf ${BACKUP_DIR}/dchat/pre_rollback_${timestamp}.tar.gz -C ${FRONTEND_PATH} .
        fi
        
        # Backup backend
        if [ -d ${BACKEND_PATH} ]; then
            mkdir -p ${BACKUP_DIR}/dchat-backend
            tar -czf ${BACKUP_DIR}/dchat-backend/pre_rollback_${timestamp}.tar.gz -C ${BACKEND_PATH} .
        fi
    "
    
    log_success "Pre-rollback backup created: pre_rollback_${timestamp}.tar.gz"
}

rollback_frontend() {
    local backup_file=$1
    
    log_info "Rolling back frontend..."
    
    # Verify backup exists
    local exists=$(verify_backup_exists "$backup_file")
    if [ "$exists" != "exists" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    # Stop Nginx temporarily
    log_info "Stopping Nginx..."
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "sudo systemctl stop nginx"
    
    # Extract backup
    log_info "Extracting backup..."
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
        rm -rf ${FRONTEND_PATH}/*
        tar -xzf ${backup_file} -C ${FRONTEND_PATH}
    "
    
    # Restart Nginx
    log_info "Starting Nginx..."
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "sudo systemctl start nginx"
    
    # Verify
    sleep 2
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" https://dchat.pro)
    if [ "$http_code" -eq 200 ]; then
        log_success "Frontend rollback completed successfully"
    else
        log_error "Frontend verification failed. HTTP code: $http_code"
        exit 1
    fi
}

rollback_backend() {
    local backup_file=$1
    
    log_info "Rolling back backend..."
    
    # Verify backup exists
    local exists=$(verify_backup_exists "$backup_file")
    if [ "$exists" != "exists" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    # Stop backend
    log_info "Stopping backend..."
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "pm2 stop ${PM2_APP_NAME} || true"
    
    # Extract backup
    log_info "Extracting backup..."
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
        rm -rf ${BACKEND_PATH}/*
        tar -xzf ${backup_file} -C ${BACKEND_PATH}
    "
    
    # Install dependencies
    log_info "Installing dependencies..."
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "
        cd ${BACKEND_PATH}
        npm install --production
    "
    
    # Start backend
    log_info "Starting backend..."
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "pm2 start ${PM2_APP_NAME}"
    
    # Verify
    sleep 5
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" https://dchat.pro/api/health || echo "000")
    if [ "$http_code" -eq 200 ]; then
        log_success "Backend rollback completed successfully"
    else
        log_warning "Backend verification returned HTTP code: $http_code"
        log_info "Check PM2 logs for details"
    fi
}

show_logs() {
    log_info "Showing recent logs..."
    
    echo ""
    echo "Nginx Error Log:"
    echo "================"
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "sudo tail -20 /var/log/nginx/error.log"
    
    echo ""
    echo "Backend PM2 Log:"
    echo "================"
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "pm2 logs ${PM2_APP_NAME} --lines 20 --nostream"
}

# Main rollback flow
main() {
    local target_timestamp=""
    local frontend_only=false
    local backend_only=false
    local list_only=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--target)
                target_timestamp="$2"
                shift 2
                ;;
            -f|--frontend-only)
                frontend_only=true
                shift
                ;;
            -b|--backend-only)
                backend_only=true
                shift
                ;;
            -l|--list)
                list_only=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # List backups and exit if requested
    if [ "$list_only" = true ]; then
        list_backups
        exit 0
    fi
    
    # Determine backup files
    local frontend_backup=""
    local backend_backup=""
    
    if [ -n "$target_timestamp" ]; then
        frontend_backup="${BACKUP_DIR}/dchat/dchat_${target_timestamp}.tar.gz"
        backend_backup="${BACKUP_DIR}/dchat-backend/backend_${target_timestamp}.tar.gz"
    else
        log_info "No timestamp specified, using latest backups..."
        frontend_backup=$(get_latest_backup "frontend")
        backend_backup=$(get_latest_backup "backend")
    fi
    
    # Confirm rollback
    log_warning "================================"
    log_warning "ROLLBACK CONFIRMATION"
    log_warning "================================"
    log_info "Frontend backup: $frontend_backup"
    log_info "Backend backup: $backend_backup"
    echo ""
    read -p "Are you sure you want to proceed with rollback? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Rollback cancelled"
        exit 0
    fi
    
    # Create pre-rollback backup
    create_pre_rollback_backup
    
    # Perform rollback
    if [ "$backend_only" = true ]; then
        rollback_backend "$backend_backup"
    elif [ "$frontend_only" = true ]; then
        rollback_frontend "$frontend_backup"
    else
        rollback_frontend "$frontend_backup"
        rollback_backend "$backend_backup"
    fi
    
    # Show logs
    show_logs
    
    echo ""
    log_success "==================================="
    log_success "Rollback completed!"
    log_success "==================================="
    log_info "Frontend: $frontend_backup"
    log_info "Backend: $backend_backup"
    log_info ""
    log_info "If issues persist, check logs:"
    log_info "  - Nginx: ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'sudo tail -f /var/log/nginx/error.log'"
    log_info "  - Backend: ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'pm2 logs ${PM2_APP_NAME}'"
}

# Run main function
main "$@"
