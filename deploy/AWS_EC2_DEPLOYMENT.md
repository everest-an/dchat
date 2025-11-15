# AWS EC2 Deployment Guide for Socket.IO Server

## Prerequisites
- AWS Account
- Basic knowledge of AWS EC2
- SSH client

## Step 1: Launch EC2 Instance

### Instance Configuration
1. **AMI**: Ubuntu Server 22.04 LTS (Free tier eligible)
2. **Instance Type**: t2.micro (Free tier eligible)
3. **Key Pair**: Create or use existing key pair for SSH access
4. **Network Settings**:
   - Allow SSH (port 22) from your IP
   - Allow Custom TCP (port 8001) from anywhere (0.0.0.0/0)
   - Allow HTTP (port 80) from anywhere (optional, for Nginx)
   - Allow HTTPS (port 443) from anywhere (optional, for SSL)
5. **Storage**: 8-30 GB gp3 (Free tier: 30 GB)

### Security Group Rules
| Type | Protocol | Port | Source | Description |
|------|----------|------|--------|-------------|
| SSH | TCP | 22 | Your IP | SSH access |
| Custom TCP | TCP | 8001 | 0.0.0.0/0 | Socket.IO server |
| HTTP | TCP | 80 | 0.0.0.0/0 | Optional: Nginx |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Optional: SSL |

## Step 2: Connect to EC2 Instance

```bash
# Change key permissions
chmod 400 your-key.pem

# Connect via SSH
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

## Step 3: Run Setup Script

```bash
# Download and run setup script
curl -o setup_ec2.sh https://raw.githubusercontent.com/everest-an/dchat/main/backend/deploy/setup_ec2.sh
chmod +x setup_ec2.sh
./setup_ec2.sh
```

The script will:
- ✅ Update system packages
- ✅ Install Python 3.11
- ✅ Clone Dchat repository
- ✅ Install dependencies
- ✅ Create systemd service
- ✅ Start Socket.IO server
- ✅ Configure firewall

## Step 4: Verify Installation

### Check Service Status
```bash
sudo systemctl status dchat-socket
```

### Test Health Endpoint
```bash
curl http://localhost:8001/health
# Should return: Socket.IO server is running
```

### View Logs
```bash
# Real-time logs
sudo journalctl -u dchat-socket -f

# Or
tail -f /var/log/dchat-socket.log
```

## Step 5: Get Public IP

```bash
curl http://169.254.169.254/latest/meta-data/public-ipv4
```

Your Socket.IO server URL will be:
```
http://<EC2_PUBLIC_IP>:8001
```

## Step 6: Update Frontend Configuration

Update `frontend/.env.production`:
```env
VITE_SOCKET_URL=http://<EC2_PUBLIC_IP>:8001
```

## Step 7: Deploy Frontend to Vercel

```bash
cd frontend
vercel --prod
```

## Optional: Configure Domain and SSL

### Option 1: Use Elastic IP (Recommended)
1. Allocate Elastic IP in AWS Console
2. Associate with your EC2 instance
3. Update DNS records to point to Elastic IP

### Option 2: Use Nginx Reverse Proxy + Let's Encrypt

```bash
# Install Nginx
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/dchat-socket

# Add configuration:
server {
    listen 80;
    server_name socket.dchat.pro;

    location / {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/dchat-socket /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d socket.dchat.pro
```

Then update frontend:
```env
VITE_SOCKET_URL=https://socket.dchat.pro
```

## Service Management

### Start Service
```bash
sudo systemctl start dchat-socket
```

### Stop Service
```bash
sudo systemctl stop dchat-socket
```

### Restart Service
```bash
sudo systemctl restart dchat-socket
```

### View Status
```bash
sudo systemctl status dchat-socket
```

### Enable Auto-start on Boot
```bash
sudo systemctl enable dchat-socket
```

## Update Application

```bash
cd /home/ubuntu/dchat
git pull origin main
cd backend
pip3 install -r requirements.txt
sudo systemctl restart dchat-socket
```

## Monitoring

### Check CPU and Memory Usage
```bash
top
htop  # Install: sudo apt-get install htop
```

### Monitor Connections
```bash
netstat -an | grep 8001
ss -tuln | grep 8001
```

### CloudWatch (AWS)
- Enable detailed monitoring in EC2 console
- Set up alarms for CPU, memory, network

## Troubleshooting

### Service Won't Start
```bash
# Check logs
sudo journalctl -u dchat-socket -n 50

# Check Python errors
cat /var/log/dchat-socket-error.log

# Test manually
cd /home/ubuntu/dchat/backend/src
python3 socket_app.py
```

### Port Already in Use
```bash
# Find process using port 8001
sudo lsof -i :8001
sudo netstat -tlnp | grep 8001

# Kill process
sudo kill -9 <PID>
```

### Connection Refused
- Check security group rules
- Verify firewall settings: `sudo ufw status`
- Check if service is running: `sudo systemctl status dchat-socket`

### High Memory Usage
- Consider upgrading to t2.small or t3.small
- Implement Redis for session storage
- Enable swap space

## Cost Estimation

### Free Tier (12 months)
- t2.micro instance: **FREE**
- 30 GB storage: **FREE**
- 15 GB data transfer out: **FREE**

### After Free Tier
- t2.micro: ~$8-10/month
- 30 GB storage: ~$3/month
- Data transfer: $0.09/GB

### Optimization Tips
- Use Elastic IP to avoid changing IPs
- Stop instance when not in use (development)
- Use Reserved Instances for production (save 30-70%)
- Monitor billing alerts

## Security Best Practices

1. **Restrict SSH Access**
   - Only allow SSH from your IP
   - Use key-based authentication only
   - Disable password authentication

2. **Update Regularly**
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   ```

3. **Enable Firewall**
   ```bash
   sudo ufw enable
   sudo ufw allow 22/tcp
   sudo ufw allow 8001/tcp
   ```

4. **Use SSL/TLS**
   - Configure Nginx with Let's Encrypt
   - Use wss:// instead of ws://

5. **Implement Rate Limiting**
   - Add rate limiting in Socket.IO server
   - Use Nginx rate limiting

6. **Monitor Logs**
   - Set up log rotation
   - Monitor for suspicious activity

## Backup and Recovery

### Backup
1. Create AMI snapshot in EC2 console
2. Backup code: Already on GitHub
3. Backup configuration files

### Recovery
1. Launch new instance from AMI
2. Or run setup script on new instance

## Next Steps

1. ✅ EC2 instance running
2. ✅ Socket.IO server deployed
3. ✅ Health check passing
4. ⬜ Configure domain (optional)
5. ⬜ Set up SSL (optional)
6. ⬜ Update frontend configuration
7. ⬜ Deploy frontend to Vercel
8. ⬜ Test real-time messaging

## Support

For issues or questions:
- Check logs: `sudo journalctl -u dchat-socket -f`
- GitHub Issues: https://github.com/everest-an/dchat/issues
- AWS Support: https://console.aws.amazon.com/support/
