#!/usr/bin/env python3
"""
Vercel Deployment Trigger Script

This script triggers a deployment on Vercel using the Vercel API.
It can be used to manually trigger deployments or integrate with CI/CD pipelines.

Usage:
    python3 trigger_deployment.py [environment] [branch]
    
    environment: 'preview' or 'production' (default: 'preview')
    branch: git branch to deploy (default: current branch)

Environment Variables:
    VERCEL_TOKEN: Vercel API token (required)
    VERCEL_ORG_ID: Vercel organization ID (required)
    VERCEL_PROJECT_ID: Vercel project ID (required)
"""

import os
import sys
import json
import time
import requests
import subprocess
from typing import Optional, Dict, Any
from datetime import datetime

# Configuration
VERCEL_API_BASE = "https://api.vercel.com"
VERCEL_TOKEN = os.getenv("VERCEL_TOKEN")
VERCEL_ORG_ID = os.getenv("VERCEL_ORG_ID")
VERCEL_PROJECT_ID = os.getenv("VERCEL_PROJECT_ID")

# Colors for output
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'

def log_error(message: str):
    print(f"{Colors.RED}❌ {message}{Colors.NC}")

def log_success(message: str):
    print(f"{Colors.GREEN}✅ {message}{Colors.NC}")

def log_info(message: str):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.NC}")

def log_warning(message: str):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.NC}")

def validate_environment() -> bool:
    """Validate required environment variables"""
    if not VERCEL_TOKEN:
        log_error("VERCEL_TOKEN is not set")
        return False
    
    if not VERCEL_ORG_ID:
        log_error("VERCEL_ORG_ID is not set")
        return False
    
    if not VERCEL_PROJECT_ID:
        log_error("VERCEL_PROJECT_ID is not set")
        return False
    
    return True

def get_git_info() -> Dict[str, str]:
    """Get current git information"""
    try:
        commit_sha = subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            text=True
        ).strip()
        
        commit_message = subprocess.check_output(
            ["git", "log", "-1", "--pretty=%B"],
            text=True
        ).strip()
        
        branch = subprocess.check_output(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            text=True
        ).strip()
        
        return {
            "commit_sha": commit_sha,
            "commit_message": commit_message,
            "branch": branch
        }
    except subprocess.CalledProcessError as e:
        log_error(f"Failed to get git information: {e}")
        return {}

def trigger_deployment(
    environment: str = "preview",
    branch: Optional[str] = None
) -> Optional[str]:
    """Trigger a deployment on Vercel"""
    
    if not validate_environment():
        return None
    
    git_info = get_git_info()
    if not git_info:
        return None
    
    if not branch:
        branch = git_info["branch"]
    
    log_info(f"Triggering {environment} deployment...")
    log_info(f"Branch: {branch}")
    log_info(f"Commit: {git_info['commit_sha'][:8]}")
    log_info(f"Message: {git_info['commit_message'][:50]}...")
    
    # Prepare deployment payload
    payload = {
        "name": "dchat-backend",
        "ref": branch,
        "productionDeployment": environment == "production"
    }
    
    # Send deployment request
    headers = {
        "Authorization": f"Bearer {VERCEL_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{VERCEL_API_BASE}/v13/deployments",
            json=payload,
            headers=headers,
            timeout=30
        )
        
        if response.status_code != 200:
            log_error(f"Failed to trigger deployment: {response.status_code}")
            log_error(f"Response: {response.text}")
            return None
        
        data = response.json()
        deployment_id = data.get("id")
        deployment_url = data.get("url")
        
        if not deployment_id:
            log_error("No deployment ID in response")
            return None
        
        log_success(f"Deployment triggered successfully!")
        log_info(f"Deployment ID: {deployment_id}")
        log_info(f"URL: https://{deployment_url}")
        
        return deployment_id
    
    except requests.RequestException as e:
        log_error(f"Request failed: {e}")
        return None

def wait_for_deployment(deployment_id: str, max_attempts: int = 60) -> bool:
    """Wait for deployment to complete"""
    
    headers = {
        "Authorization": f"Bearer {VERCEL_TOKEN}",
        "Content-Type": "application/json"
    }
    
    log_info("Waiting for deployment to complete...")
    
    for attempt in range(max_attempts):
        try:
            response = requests.get(
                f"{VERCEL_API_BASE}/v13/deployments/{deployment_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code != 200:
                log_error(f"Failed to check deployment status: {response.status_code}")
                return False
            
            data = response.json()
            state = data.get("state")
            
            if state == "READY":
                log_success("Deployment completed successfully!")
                return True
            elif state == "ERROR":
                log_error("Deployment failed!")
                return False
            
            log_info(f"Status: {state} (attempt {attempt + 1}/{max_attempts})")
            time.sleep(10)
        
        except requests.RequestException as e:
            log_error(f"Request failed: {e}")
            return False
    
    log_error("Deployment timeout!")
    return False

def main():
    """Main entry point"""
    
    # Parse command line arguments
    environment = sys.argv[1] if len(sys.argv) > 1 else "preview"
    branch = sys.argv[2] if len(sys.argv) > 2 else None
    
    if environment not in ["preview", "production"]:
        log_error(f"Invalid environment: {environment}")
        sys.exit(1)
    
    log_info(f"Starting deployment process...")
    log_info(f"Timestamp: {datetime.now().isoformat()}")
    
    # Trigger deployment
    deployment_id = trigger_deployment(environment, branch)
    if not deployment_id:
        sys.exit(1)
    
    # Wait for deployment to complete
    if wait_for_deployment(deployment_id):
        log_success("Deployment process completed!")
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
