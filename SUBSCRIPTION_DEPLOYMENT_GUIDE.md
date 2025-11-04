# Subscription System Deployment Guide

**Version**: 1.0.0  
**Date**: 2025-11-05  
**Author**: Manus AI

This guide provides step-by-step instructions for deploying and integrating the subscription system into dchat.pro.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Smart Contract Configuration](#smart-contract-configuration)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Python**: 3.8+
- **Node.js**: 16+
- **npm/pnpm**: Latest version
- **Redis**: 5.0+ (for caching)
- **PostgreSQL**: 12+ (for production)

### Required Accounts

- **Infura/Alchemy**: Ethereum node provider account
- **MetaMask**: For testing crypto payments
- **Sepolia ETH**: For testing (get from faucet)

### Environment Variables

Create a `.env` file in the backend directory:

```bash
# Web3 Configuration
WEB3_PROVIDER_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
CONTRACT_SUBSCRIPTION_MANAGER=0x5d154C1A6DE2B10aFcCd139A4aBa3bbCfd8A31c8
CONTRACT_NFT_AVATAR_MANAGER=0xF91E0E6afF5A93831F67838539245a44Ca384187

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dchat

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Flask
SECRET_KEY=your-secret-key-here
DEBUG=False

# CORS
CORS_ORIGINS=https://dchat.pro,http://localhost:3000
```

---

## Backend Setup

### Step 1: Install Dependencies

```bash
cd backend

# Install Python dependencies
pip3 install -r requirements.txt
pip3 install -r requirements.subscription.txt

# Verify installation
python3 -c "import web3; print(web3.__version__)"
```

### Step 2: Initialize Database

```bash
# Run database migrations
cd backend/src
python3 -c "from main import app, db; app.app_context().push(); db.create_all()"
```

### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.web3.subscription.example .env

# Edit .env and fill in your values
nano .env
```

### Step 4: Start Backend Server

```bash
# Development mode
cd backend/src
python3 main.py

# Production mode with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 main:app
```

### Step 5: Verify Backend

```bash
# Test health check
curl http://localhost:5000/api/health

# Test subscription plans
curl http://localhost:5000/api/subscriptions/plans
```

---

## Frontend Setup

### Step 1: Install Dependencies

```bash
cd frontend

# Install npm packages
npm install ethers@5.7.2
# or
pnpm add ethers@5.7.2
```

### Step 2: Configure Environment

Create `.env.local` in frontend directory:

```bash
REACT_APP_API_URL=http://localhost:5000
REACT_APP_NETWORK_NAME=sepolia
REACT_APP_CHAIN_ID=11155111
REACT_APP_SUBSCRIPTION_CONTRACT=0x5d154C1A6DE2B10aFcCd139A4aBa3bbCfd8A31c8
REACT_APP_NFT_AVATAR_CONTRACT=0xF91E0E6afF5A93831F67838539245a44Ca384187
```

### Step 3: Import Components

Add the following imports to your main App.js or routing file:

```javascript
// Import subscription components
import Web3SubscriptionPlans from './components/Web3SubscriptionPlans'
import NFTAvatarSelector from './components/NFTAvatarSelector'

// Import services
import { web3SubscriptionService } from './services/Web3SubscriptionService'
import { nftAvatarService } from './services/NFTAvatarService'

// Add routes
<Route path="/subscription" element={<Web3SubscriptionPlans />} />
<Route path="/settings/avatar" element={<NFTAvatarSelector />} />
```

### Step 4: Initialize Web3 Services

In your Web3 context or provider:

```javascript
import { web3SubscriptionService } from './services/Web3SubscriptionService'
import { nftAvatarService } from './services/NFTAvatarService'

// Initialize services when wallet connects
const handleWalletConnect = async (provider) => {
  await web3SubscriptionService.initialize(provider)
  await nftAvatarService.initialize(provider)
}
```

### Step 5: Start Frontend

```bash
cd frontend

# Development mode
npm start
# or
pnpm dev

# Production build
npm run build
```

---

## Smart Contract Configuration

### Contract Addresses (Sepolia Testnet)

- **SubscriptionManager**: `0x5d154C1A6DE2B10aFcCd139A4aBa3bbCfd8A31c8`
- **NFTAvatarManager**: `0xF91E0E6afF5A93831F67838539245a44Ca384187`

### Verify Contracts

```bash
# View on Etherscan
https://sepolia.etherscan.io/address/0x5d154C1A6DE2B10aFcCd139A4aBa3bbCfd8A31c8
https://sepolia.etherscan.io/address/0xF91E0E6afF5A93831F67838539245a44Ca384187
```

### Update Pricing (Contract Owner Only)

If you need to update subscription pricing:

```javascript
// Using Web3.js
const subscriptionContract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS)

// Update PRO tier pricing
await subscriptionContract.methods.updatePricing(
  1, // PRO tier
  web3.utils.toWei('0.0025', 'ether'), // Monthly
  web3.utils.toWei('0.025', 'ether'),  // Yearly
  web3.utils.toWei('0.1', 'ether')     // NFT
).send({ from: ownerAddress })
```

---

## Testing

### Backend API Tests

```bash
cd backend

# Run test suite
python3 test_subscription_api.py

# Expected output:
# ================================================================================
#   Test Summary
# ================================================================================
# Total Tests: 20
# Passed: 18 ✅
# Failed: 2 ❌
# Success Rate: 90.0%
```

### Manual Testing Checklist

#### Subscription Flow

- [ ] View subscription plans
- [ ] Connect wallet
- [ ] Select plan (Pro/Enterprise)
- [ ] Choose payment method (ETH/USDT/USDC)
- [ ] Complete payment
- [ ] Verify subscription activated
- [ ] Check subscription status
- [ ] View subscription history

#### NFT Avatar Flow

- [ ] Connect wallet with Pro/Enterprise subscription
- [ ] View NFT avatar page
- [ ] Enter NFT contract and token ID
- [ ] Set NFT as avatar
- [ ] Verify ownership
- [ ] View avatar history
- [ ] Remove avatar

#### Edge Cases

- [ ] Try to set NFT avatar without subscription
- [ ] Try to set NFT you don't own
- [ ] Cancel subscription
- [ ] Renew expired subscription
- [ ] Switch payment methods

---

## Deployment

### Backend Deployment (Production)

#### Option 1: Traditional Server

```bash
# Install production dependencies
pip3 install gunicorn psycopg2-binary

# Set environment variables
export DATABASE_URL="postgresql://..."
export WEB3_PROVIDER_URL="https://mainnet.infura.io/v3/..."
export DEBUG=False

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 --timeout 120 main:app

# Or use systemd service
sudo systemctl start dchat-backend
```

#### Option 2: Docker

```bash
# Build Docker image
docker build -t dchat-backend:latest .

# Run container
docker run -d \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://..." \
  -e WEB3_PROVIDER_URL="https://mainnet.infura.io/v3/..." \
  --name dchat-backend \
  dchat-backend:latest
```

#### Option 3: Cloud Platform (Heroku/Railway/Render)

```bash
# Example: Heroku
heroku create dchat-backend
heroku addons:create heroku-postgresql:hobby-dev
heroku addons:create heroku-redis:hobby-dev
heroku config:set WEB3_PROVIDER_URL="https://mainnet.infura.io/v3/..."
git push heroku main
```

### Frontend Deployment

#### Build for Production

```bash
cd frontend

# Build
npm run build

# Output will be in frontend/build/
```

#### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

#### Deploy to Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
cd frontend
netlify deploy --prod --dir=build
```

#### Deploy to Traditional Server (Nginx)

```bash
# Copy build files
scp -r frontend/build/* user@server:/var/www/dchat.pro/

# Nginx configuration
server {
    listen 443 ssl http2;
    server_name dchat.pro;
    
    root /var/www/dchat.pro;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Database Migration (SQLite to PostgreSQL)

```bash
# Export SQLite data
sqlite3 backend/src/database/app.db .dump > dump.sql

# Import to PostgreSQL
psql -U postgres -d dchat < dump.sql
```

### Redis Setup (Production)

```bash
# Install Redis
sudo apt-get install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: maxmemory 256mb
# Set: maxmemory-policy allkeys-lru

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis
```

---

## Troubleshooting

### Common Issues

#### Issue 1: "Module not found: web3"

**Solution**:
```bash
pip3 install web3==6.11.3
# or for frontend
npm install ethers@5.7.2
```

#### Issue 2: "Contract not found at address"

**Solution**:
- Verify you're on the correct network (Sepolia testnet)
- Check contract addresses in `.env`
- Ensure Web3 provider URL is correct

#### Issue 3: "Transaction failed: insufficient funds"

**Solution**:
- Get Sepolia ETH from faucet: https://sepoliafaucet.com/
- Ensure you have enough ETH for gas fees
- Check if you're using the correct payment token

#### Issue 4: "Database connection failed"

**Solution**:
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U postgres -d dchat -c "SELECT 1"

# Check DATABASE_URL format
# postgresql://username:password@host:port/database
```

#### Issue 5: "CORS error"

**Solution**:
```bash
# Update CORS_ORIGINS in .env
CORS_ORIGINS=https://dchat.pro,http://localhost:3000

# Restart backend server
```

#### Issue 6: "NFT avatar not displaying"

**Solution**:
- Verify NFT ownership on Etherscan
- Check NFT contract implements ERC-721/ERC-1155 standard
- Ensure metadata URI is accessible
- Try re-setting the avatar

### Debug Mode

Enable debug logging:

```bash
# Backend
export DEBUG=True
export LOG_LEVEL=DEBUG

# Check logs
tail -f logs/subscription.log
```

### Health Checks

```bash
# Backend health
curl http://localhost:5000/api/health

# Database health
curl http://localhost:5000/api/subscriptions/plans

# Web3 connection
python3 -c "from web3 import Web3; w3 = Web3(Web3.HTTPProvider('YOUR_PROVIDER_URL')); print(w3.is_connected())"
```

---

## Performance Optimization

### Backend Optimization

1. **Enable Redis caching**:
   - Subscription status cached for 5 minutes
   - Reduces blockchain RPC calls

2. **Database indexing**:
   ```sql
   CREATE INDEX idx_subscription_user ON subscriptions(user_address);
   CREATE INDEX idx_subscription_status ON subscriptions(status);
   CREATE INDEX idx_nft_avatar_user ON nft_avatars(user_address);
   ```

3. **Connection pooling**:
   ```python
   app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
       'pool_size': 10,
       'pool_recycle': 3600,
   }
   ```

### Frontend Optimization

1. **Lazy load components**:
   ```javascript
   const Web3SubscriptionPlans = lazy(() => import('./components/Web3SubscriptionPlans'))
   ```

2. **Cache subscription data**:
   - Store in localStorage with 5-minute TTL
   - Reduce API calls

3. **Optimize Web3 calls**:
   - Batch multiple contract reads
   - Use multicall pattern

---

## Security Checklist

- [ ] Environment variables secured (not in Git)
- [ ] HTTPS enabled for production
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] SQL injection protection (using ORM)
- [ ] XSS protection (React auto-escapes)
- [ ] JWT tokens properly validated
- [ ] Smart contracts audited
- [ ] Private keys never exposed
- [ ] Database backups enabled

---

## Monitoring

### Recommended Tools

- **Backend**: Sentry, New Relic, DataDog
- **Frontend**: Sentry, Google Analytics
- **Blockchain**: Etherscan API, Alchemy webhooks
- **Uptime**: UptimeRobot, Pingdom

### Key Metrics

- API response time
- Subscription conversion rate
- Payment success rate
- NFT avatar adoption rate
- Error rate
- Active subscriptions count

---

## Support

For issues or questions:

- **Email**: support@dchat.pro
- **Discord**: https://discord.gg/dchat
- **GitHub Issues**: https://github.com/everest-an/dchat/issues
- **Documentation**: https://docs.dchat.pro

---

## Changelog

### Version 1.0.0 (2025-11-05)

- Initial release
- Subscription management with crypto payments
- NFT avatar support
- Backend API with 16+ endpoints
- Frontend React components
- Smart contract integration
- Comprehensive documentation

---

**Last Updated**: 2025-11-05  
**Deployment Guide Version**: 1.0.0
