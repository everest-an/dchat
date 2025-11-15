# Socket.IO Server Deployment Checklist

## Pre-Deployment

### AWS EC2 Setup
- [ ] Create EC2 instance (Ubuntu 22.04 LTS, t2.micro or larger)
- [ ] Configure Security Group:
  - [ ] Port 22 (SSH) - Your IP only
  - [ ] Port 80 (HTTP) - 0.0.0.0/0
  - [ ] Port 443 (HTTPS) - 0.0.0.0/0
  - [ ] Port 8001 (Socket.IO) - 0.0.0.0/0
- [ ] Create or select SSH key pair
- [ ] (Optional) Allocate Elastic IP for static IP address
- [ ] (Optional) Configure domain DNS to point to EC2 IP

### Domain and SSL (Optional but Recommended)
- [ ] Register domain or create subdomain (e.g., socket.dchat.pro)
- [ ] Update DNS A record to point to EC2 public IP
- [ ] Wait for DNS propagation (check with `nslookup socket.dchat.pro`)
- [ ] Prepare email address for Let's Encrypt certificate

### Local Preparation
- [ ] Review and update `backend/deploy/.env.production.example`
- [ ] Prepare CORS allowed origins list
- [ ] Generate secure JWT secret
- [ ] Review Nginx configuration if needed

---

## Deployment Steps

### 1. Connect to EC2 Instance

```bash
# Change key permissions
chmod 400 your-key.pem

# Connect via SSH
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

**Checklist:**
- [ ] Successfully connected to EC2 instance
- [ ] Confirmed Ubuntu version: `lsb_release -a`

### 2. Run Enhanced Setup Script

```bash
# Download setup script
curl -o setup_ec2_enhanced.sh https://raw.githubusercontent.com/everest-an/dchat/main/backend/deploy/setup_ec2_enhanced.sh

# Make executable
chmod +x setup_ec2_enhanced.sh

# Run setup
./setup_ec2_enhanced.sh
```

**During setup, you'll be prompted for:**
- [ ] Domain name (or press Enter to skip SSL)
- [ ] Email for Let's Encrypt (or press Enter to skip)

**Checklist:**
- [ ] Script completed without errors
- [ ] Service started successfully
- [ ] Health check passed

### 3. Configure Environment Variables

```bash
cd /home/ubuntu/dchat/backend/src
nano .env.production
```

**Update these critical values:**
- [ ] `CORS_ALLOWED_ORIGINS` - Add your frontend URLs
- [ ] `JWT_SECRET` - Generate secure random string
- [ ] `ENVIRONMENT=production`
- [ ] Review all other settings

**Generate JWT secret:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Checklist:**
- [ ] Environment file configured
- [ ] JWT secret changed from default
- [ ] CORS origins include production frontend URL

### 4. Restart Service

```bash
sudo systemctl restart dchat-socket
sudo systemctl status dchat-socket
```

**Checklist:**
- [ ] Service restarted successfully
- [ ] No errors in status output

---

## Verification

### 5. Test Endpoints

```bash
# Health check
curl http://localhost:8001/health

# Metrics
curl http://localhost:8001/metrics

# Root endpoint
curl http://localhost:8001/

# External access (replace with your IP)
curl http://<EC2_PUBLIC_IP>:8001/health
```

**Checklist:**
- [ ] Health endpoint returns 200 OK
- [ ] Metrics endpoint returns JSON
- [ ] External access works
- [ ] (If SSL) HTTPS endpoint works: `curl https://socket.dchat.pro/health`

### 6. Test WebSocket Connection

```bash
# Install wscat for testing
npm install -g wscat

# Test WebSocket connection (replace with your URL)
wscat -c ws://<EC2_PUBLIC_IP>:8001/socket.io/?EIO=4&transport=websocket

# Or with SSL
wscat -c wss://socket.dchat.pro/socket.io/?EIO=4&transport=websocket
```

**Checklist:**
- [ ] WebSocket connection established
- [ ] Can send/receive messages
- [ ] No connection errors

### 7. Check Logs

```bash
# View real-time logs
sudo journalctl -u dchat-socket -f

# View last 100 lines
sudo journalctl -u dchat-socket -n 100

# Check log files
tail -f /var/log/dchat-socket.log
tail -f /var/log/dchat-socket-error.log
```

**Checklist:**
- [ ] No critical errors in logs
- [ ] Service started successfully
- [ ] WebSocket connections being logged

### 8. Verify Nginx (if configured)

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# View Nginx logs
sudo tail -f /var/log/nginx/socket-io-access.log
sudo tail -f /var/log/nginx/socket-io-error.log
```

**Checklist:**
- [ ] Nginx configuration valid
- [ ] Nginx running without errors
- [ ] Proxy passing requests correctly

### 9. Test SSL Certificate (if configured)

```bash
# Check certificate
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run
```

**Checklist:**
- [ ] Certificate issued successfully
- [ ] Certificate valid for your domain
- [ ] Auto-renewal configured

---

## Frontend Configuration

### 10. Update Frontend Environment

Update `frontend/.env.production`:

```env
# With SSL (recommended)
VITE_SOCKET_URL=https://socket.dchat.pro

# Without SSL
VITE_SOCKET_URL=http://<EC2_PUBLIC_IP>:8001
```

**Checklist:**
- [ ] Frontend environment variable updated
- [ ] Frontend rebuilt with new config
- [ ] Frontend redeployed

### 11. Test Frontend Connection

Open browser console on your frontend and check:

```javascript
// Check Socket.IO connection
console.log('Socket connected:', socket.connected);
```

**Checklist:**
- [ ] Frontend connects to Socket.IO server
- [ ] No CORS errors in browser console
- [ ] Real-time messages working
- [ ] Typing indicators working
- [ ] Online status working

---

## Security Hardening

### 12. Security Checks

```bash
# Check firewall
sudo ufw status

# Review open ports
sudo netstat -tulpn | grep LISTEN

# Check for updates
sudo apt-get update
sudo apt-get upgrade
```

**Checklist:**
- [ ] Firewall enabled and configured
- [ ] Only necessary ports open
- [ ] System packages up to date
- [ ] SSH key-only authentication (no passwords)

### 13. Monitoring Setup

```bash
# Check resource usage
htop

# Monitor logs
sudo journalctl -u dchat-socket --since "1 hour ago"

# Check disk space
df -h
```

**Checklist:**
- [ ] CPU usage normal (<50% idle)
- [ ] Memory usage acceptable
- [ ] Disk space sufficient (>20% free)
- [ ] No memory leaks detected

---

## Post-Deployment

### 14. Documentation

- [ ] Document public IP or domain
- [ ] Document SSL certificate expiry date
- [ ] Save deployment info file
- [ ] Update team documentation
- [ ] Add to monitoring dashboard

### 15. Backup and Recovery

```bash
# Create backup script
cat > /home/ubuntu/backup.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /home/ubuntu/dchat-backup-$DATE.tar.gz \
    /home/ubuntu/dchat \
    /home/ubuntu/dchat-deployment-info.txt \
    /etc/systemd/system/dchat-socket.service \
    /etc/nginx/sites-available/dchat-socket
EOF

chmod +x /home/ubuntu/backup.sh
```

**Checklist:**
- [ ] Backup script created
- [ ] Test backup: `./backup.sh`
- [ ] Document recovery procedure
- [ ] Schedule regular backups (cron)

### 16. Monitoring and Alerts

**Setup monitoring for:**
- [ ] Service uptime
- [ ] Health endpoint availability
- [ ] CPU and memory usage
- [ ] Disk space
- [ ] SSL certificate expiry
- [ ] Error rate in logs

**Recommended tools:**
- AWS CloudWatch
- UptimeRobot (free tier)
- Datadog
- Sentry (for error tracking)

---

## Maintenance

### Regular Tasks

**Daily:**
- [ ] Check service status: `sudo systemctl status dchat-socket`
- [ ] Review error logs: `tail -100 /var/log/dchat-socket-error.log`

**Weekly:**
- [ ] Review metrics: `curl http://localhost:8001/metrics`
- [ ] Check disk space: `df -h`
- [ ] Review security logs: `sudo journalctl -u dchat-socket --since "1 week ago" | grep -i error`

**Monthly:**
- [ ] Update system packages: `sudo apt-get update && sudo apt-get upgrade`
- [ ] Review and rotate logs
- [ ] Test SSL certificate renewal: `sudo certbot renew --dry-run`
- [ ] Review resource usage trends

### Update Procedure

```bash
# 1. Pull latest code
cd /home/ubuntu/dchat
git pull origin main

# 2. Update dependencies
cd backend
pip3 install -r requirements.txt

# 3. Restart service
sudo systemctl restart dchat-socket

# 4. Verify
curl http://localhost:8001/health
sudo systemctl status dchat-socket
```

**Checklist:**
- [ ] Code updated successfully
- [ ] Dependencies installed
- [ ] Service restarted without errors
- [ ] Health check passed

---

## Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check logs
sudo journalctl -u dchat-socket -n 50
cat /var/log/dchat-socket-error.log

# Check Python errors
cd /home/ubuntu/dchat/backend/src
python3 socket_app_enhanced.py
```

**CORS errors:**
- Check `CORS_ALLOWED_ORIGINS` in `.env.production`
- Ensure frontend URL is included
- Restart service after changes

**WebSocket connection fails:**
- Check Nginx configuration
- Verify firewall allows port 8001
- Test direct connection: `curl http://localhost:8001/health`
- Check browser console for errors

**SSL certificate issues:**
```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check Nginx config
sudo nginx -t
```

---

## Rollback Procedure

If deployment fails:

```bash
# 1. Stop service
sudo systemctl stop dchat-socket

# 2. Revert to previous version
cd /home/ubuntu/dchat
git log --oneline -10  # Find previous commit
git checkout <previous-commit-hash>

# 3. Reinstall dependencies
cd backend
pip3 install -r requirements.txt

# 4. Restart service
sudo systemctl start dchat-socket

# 5. Verify
curl http://localhost:8001/health
```

---

## Success Criteria

Deployment is successful when:

- [x] Service running and enabled
- [x] Health endpoint returns 200 OK
- [x] WebSocket connections work
- [x] No critical errors in logs
- [x] Frontend connects successfully
- [x] Real-time messages working
- [x] SSL configured (if applicable)
- [x] Monitoring in place
- [x] Documentation updated

---

## Support

**Resources:**
- GitHub: https://github.com/everest-an/dchat
- Documentation: `/home/ubuntu/dchat/docs/`
- Deployment info: `/home/ubuntu/dchat-deployment-info.txt`

**Get Help:**
- Check logs first
- Review this checklist
- Search GitHub issues
- Create new issue with logs and error messages

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**EC2 Instance ID:** _______________  
**Public IP:** _______________  
**Domain:** _______________  
**SSL Enabled:** [ ] Yes [ ] No
