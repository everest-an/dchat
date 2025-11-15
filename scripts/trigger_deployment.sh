#!/bin/bash

# Vercel Deployment Trigger Script
# This script triggers a deployment on Vercel using the Vercel API

set -e

# Configuration
VERCEL_TOKEN=${VERCEL_TOKEN:-""}
VERCEL_ORG_ID=${VERCEL_ORG_ID:-""}
VERCEL_PROJECT_ID=${VERCEL_PROJECT_ID:-""}
GITHUB_TOKEN=${GITHUB_TOKEN:-""}
ENVIRONMENT=${1:-"preview"}  # preview or production

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check required environment variables
if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${RED}Error: VERCEL_TOKEN is not set${NC}"
    exit 1
fi

if [ -z "$VERCEL_ORG_ID" ]; then
    echo -e "${RED}Error: VERCEL_ORG_ID is not set${NC}"
    exit 1
fi

if [ -z "$VERCEL_PROJECT_ID" ]; then
    echo -e "${RED}Error: VERCEL_PROJECT_ID is not set${NC}"
    exit 1
fi

echo -e "${YELLOW}Triggering Vercel deployment...${NC}"
echo "Environment: $ENVIRONMENT"
echo "Project ID: $VERCEL_PROJECT_ID"

# Get the latest commit information
COMMIT_SHA=$(git rev-parse HEAD)
COMMIT_MESSAGE=$(git log -1 --pretty=%B)
BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo -e "${YELLOW}Commit: $COMMIT_SHA${NC}"
echo -e "${YELLOW}Branch: $BRANCH${NC}"
echo -e "${YELLOW}Message: $COMMIT_MESSAGE${NC}"

# Trigger deployment via Vercel API
DEPLOYMENT_PAYLOAD=$(cat <<EOF
{
  "name": "dchat-backend",
  "ref": "$BRANCH",
  "productionDeployment": $([ "$ENVIRONMENT" = "production" ] && echo "true" || echo "false")
}
EOF
)

echo -e "${YELLOW}Sending deployment request...${NC}"

RESPONSE=$(curl -s -X POST \
  "https://api.vercel.com/v13/deployments" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$DEPLOYMENT_PAYLOAD")

# Check if deployment was successful
if echo "$RESPONSE" | grep -q '"id"'; then
    DEPLOYMENT_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    DEPLOYMENT_URL=$(echo "$RESPONSE" | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    
    echo -e "${GREEN}✅ Deployment triggered successfully!${NC}"
    echo "Deployment ID: $DEPLOYMENT_ID"
    echo "URL: https://$DEPLOYMENT_URL"
    
    # Wait for deployment to complete (optional)
    echo -e "${YELLOW}Waiting for deployment to complete...${NC}"
    
    MAX_ATTEMPTS=60
    ATTEMPT=0
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        STATUS_RESPONSE=$(curl -s -X GET \
          "https://api.vercel.com/v13/deployments/$DEPLOYMENT_ID" \
          -H "Authorization: Bearer $VERCEL_TOKEN")
        
        STATE=$(echo "$STATUS_RESPONSE" | grep -o '"state":"[^"]*' | cut -d'"' -f4)
        
        if [ "$STATE" = "READY" ]; then
            echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
            break
        elif [ "$STATE" = "ERROR" ]; then
            echo -e "${RED}❌ Deployment failed!${NC}"
            exit 1
        fi
        
        echo "Status: $STATE (attempt $((ATTEMPT+1))/$MAX_ATTEMPTS)"
        sleep 10
        ATTEMPT=$((ATTEMPT+1))
    done
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi
