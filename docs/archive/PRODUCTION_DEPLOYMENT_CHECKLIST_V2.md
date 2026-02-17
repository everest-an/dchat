# Production Deployment Checklist V2 - Enhanced for Payment System

**Project:** Dchat.pro  
**Date:** November 5, 2025  
**Environment:** Production (Ethereum Mainnet)  
**Focus:** Payment & Wallet System Deployment

---

## 🔒 Critical Security Checklist

### 1. Environment Configuration ⚠️ CRITICAL

- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Generate strong `SECRET_KEY` (32+ characters)
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```
- [ ] Generate strong `WALLET_ENCRYPTION_KEY` (64 hex characters)
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  ```
- [ ] Set `DEBUG=False`
- [ ] Set `PRODUCTION_MODE=True`
- [ ] Set `RATE_LIMIT_ENABLED=True`
- [ ] Set `WITHDRAWAL_LIMITS_ENABLED=True`

### 2. Web3 Configuration ⚠️ CRITICAL

- [ ] Obtain Infura/Alchemy API key
- [ ] Configure mainnet RPC: `https://mainnet.infura.io/v3/YOUR_KEY`
- [ ] Set `CHAIN_ID=1` (Ethereum Mainnet)
- [ ] Create and fund master wallet
- [ ] Encrypt and store master wallet private key
- [ ] Verify token contract addresses:
  - [ ] USDT: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
  - [ ] USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
  - [ ] DAI: `0x6B175474E89094C44Da98b954EedeAC495271d0F`
  - [ ] WETH: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`

### 3. Rate Limiting ⚠️ CRITICAL

- [ ] `RATE_LIMIT_ENABLED=True`
- [ ] `RATE_LIMIT_PER_MINUTE=100`
- [ ] `RATE_LIMIT_PER_HOUR=1000`
- [ ] `RATE_LIMIT_PER_DAY=10000`
- [ ] `WITHDRAWAL_RATE_LIMIT_PER_HOUR=10`
- [ ] `WITHDRAWAL_RATE_LIMIT_PER_DAY=50`

### 4. Withdrawal Limits ⚠️ CRITICAL

- [ ] `WITHDRAWAL_LIMITS_ENABLED=True`
- [ ] `DAILY_WITHDRAWAL_LIMIT_USD=10000`
- [ ] `WEEKLY_WITHDRAWAL_LIMIT_USD=50000`
- [ ] `MONTHLY_WITHDRAWAL_LIMIT_USD=200000`
- [ ] `MIN_WITHDRAWAL_AMOUNT_USD=10`
- [ ] `MAX_WITHDRAWAL_AMOUNT_USD=50000`

---

## 📦 Deployment Steps

### Step 1: Run Deployment Script

```bash
cd /opt/dchat/backend
./deploy_production.sh
```

The script will:
1. ✅ Verify environment configuration
2. ✅ Check Python version
3. ✅ Install dependencies
4. ✅ Run database migrations
5. ✅ Initialize database tables
6. ✅ Run security checks
7. ✅ Run tests
8. ✅ Create log directories
9. ✅ Stop existing service
10. ✅ Start production server

### Step 2: Verify Deployment

- [ ] Service running: `sudo systemctl status dchat`
- [ ] Health check passing: `curl https://dchat.pro/api/health`
- [ ] No errors in logs: `sudo journalctl -u dchat -n 50`

---

## 🧪 Payment System Testing

### Wallet Creation

- [ ] Create custodial wallet via API
- [ ] Verify wallet address generated
- [ ] Verify private key encrypted in database
- [ ] Check wallet appears in user profile

### Deposits (Test with small amounts first!)

- [ ] Deposit 0.001 ETH
- [ ] Deposit 1 USDT
- [ ] Deposit 1 USDC
- [ ] Verify balance updates correctly
- [ ] Check transaction history

### Withdrawals (Test with small amounts first!)

- [ ] Withdraw 0.0001 ETH
  - [ ] Gas estimation works
  - [ ] Nonce management works
  - [ ] Transaction submitted
  - [ ] Transaction confirmed
  - [ ] Balance updated
  - [ ] Verify on Etherscan

- [ ] Withdraw 0.1 USDT
  - [ ] Gas estimation works
  - [ ] Nonce management works
  - [ ] Transaction submitted
  - [ ] Transaction confirmed
  - [ ] Balance updated
  - [ ] Verify on Etherscan

- [ ] Withdraw 0.1 USDC
  - [ ] Gas estimation works
  - [ ] Nonce management works
  - [ ] Transaction submitted
  - [ ] Transaction confirmed
  - [ ] Balance updated
  - [ ] Verify on Etherscan

### Chat Transfers

- [ ] Create transfer (User A → User B)
  - [ ] Money deducted from A's wallet
  - [ ] Transfer appears in chat
  - [ ] Status: pending

- [ ] Claim transfer (User B)
  - [ ] Money credited to B's wallet
  - [ ] Status: claimed
  - [ ] Transfer message updated

- [ ] Cancel transfer (User A)
  - [ ] Money refunded to A's wallet
  - [ ] Status: cancelled

- [ ] Test 24h expiry
  - [ ] Create transfer
  - [ ] Wait 24 hours (or modify expiry for testing)
  - [ ] Verify auto-refund

### Rate Limiting

- [ ] Send 101 requests in 1 minute
- [ ] Verify 429 response on 101st request
- [ ] Check rate limit headers
- [ ] Verify rate limit resets after 1 minute

### Withdrawal Limits

- [ ] Attempt withdrawal > daily limit
- [ ] Verify rejection with error message
- [ ] Attempt withdrawal < min amount
- [ ] Verify rejection
- [ ] Attempt withdrawal > max amount
- [ ] Verify rejection

---

## 📊 Monitoring Checklist

### Application Metrics

- [ ] Request rate < 1000/min
- [ ] Response time < 500ms
- [ ] Error rate < 0.1%
- [ ] CPU usage < 50%
- [ ] Memory usage < 70%

### Transaction Metrics

- [ ] Withdrawal success rate > 99%
- [ ] Transfer success rate > 99.5%
- [ ] Average gas cost within expected range
- [ ] Nonce conflicts: 0

### Database Metrics

- [ ] Connection count < 50
- [ ] Query time < 100ms
- [ ] Slow queries: 0
- [ ] Deadlocks: 0

---

## 🚨 Emergency Procedures

### If Deployment Fails

1. Check logs: `sudo journalctl -u dchat -n 100`
2. Check service status: `sudo systemctl status dchat`
3. Verify environment: `env | grep -E '(SECRET|DATABASE|WEB3)'`
4. Test database connection: `psql $DATABASE_URL -c "SELECT 1"`
5. Test Web3 connection: `python3 -c "from web3 import Web3; print(Web3(Web3.HTTPProvider('$WEB3_PROVIDER_URI')).is_connected())"`

### If Critical Bug Found

1. Stop service: `sudo systemctl stop dchat`
2. Rollback to previous version
3. Restore database backup if needed
4. Restart service: `sudo systemctl start dchat`
5. Notify users

### If Security Breach Detected

1. **IMMEDIATELY** stop service: `sudo systemctl stop dchat`
2. Isolate affected systems
3. Rotate all credentials
4. Audit logs for suspicious activity
5. Notify security team
6. Notify affected users
7. Document incident

---

## ✅ Final Pre-Launch Checklist

- [ ] All tests passing (98%+ coverage)
- [ ] Security features enabled
- [ ] Monitoring configured
- [ ] Backups configured
- [ ] Documentation complete
- [ ] Team trained
- [ ] Support channels ready
- [ ] Emergency procedures documented
- [ ] Rollback plan ready
- [ ] Communication plan ready

---

## 📝 Post-Deployment Tasks

### First Hour

- [ ] Monitor logs continuously
- [ ] Check error rate
- [ ] Verify all services running
- [ ] Test critical user flows
- [ ] Monitor performance metrics

### First 24 Hours

- [ ] Review all transactions
- [ ] Check for any errors
- [ ] Monitor gas costs
- [ ] Gather user feedback
- [ ] Address any issues immediately

### First Week

- [ ] Daily health checks
- [ ] Review performance trends
- [ ] Optimize based on metrics
- [ ] Document lessons learned
- [ ] Plan improvements

---

## 🎯 Success Criteria

- [ ] Uptime > 99.9%
- [ ] Error rate < 0.1%
- [ ] Response time < 500ms
- [ ] Withdrawal success rate > 99%
- [ ] Transfer success rate > 99.5%
- [ ] No security incidents
- [ ] Positive user feedback

---

**Deployment Status:** [ ] Not Started | [ ] In Progress | [ ] Completed | [ ] Rolled Back

**Deployment Date:** _________________  
**Deployment Time:** _________________  
**Deployed By:** _________________  
**Version:** 2.0.0

---

**Sign-Off:**

- **Developer:** _________________ Date: _______
- **DevOps:** _________________ Date: _______
- **Security:** _________________ Date: _______
- **Technical Lead:** _________________ Date: _______

---

**Last Updated:** November 5, 2025  
**Version:** 2.0  
**Status:** Ready for Production Deployment
