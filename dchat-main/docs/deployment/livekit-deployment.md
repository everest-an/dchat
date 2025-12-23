# LiveKit Deployment Guide for Dchat

## Overview

This guide explains how to deploy LiveKit for Dchat's audio/video calling features.

## Quick Start (Development)

### Option 1: Docker Compose (Recommended)

```bash
# Navigate to project root
cd /path/to/dchat

# Start LiveKit server
docker-compose -f docker-compose.livekit.yml up -d

# Check logs
docker-compose -f docker-compose.livekit.yml logs -f livekit
```

The LiveKit server will be available at:
- WebSocket: `ws://localhost:7880`
- HTTP: `http://localhost:7880`

### Option 2: Docker Run

```bash
docker run -d \
  --name dchat-livekit \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -p 50000-60000:50000-60000/udp \
  -v $(pwd)/livekit.yaml:/etc/livekit.yaml \
  -e LIVEKIT_KEYS="devkey: secret" \
  livekit/livekit-server:v1.9.3
```

### Option 3: Binary (macOS/Linux)

```bash
# macOS
brew install livekit

# Linux
curl -sSL https://get.livekit.io | bash

# Start server
livekit-server --config livekit.yaml
```

## Configuration

### Environment Variables

#### Backend (.env)
```bash
# LiveKit Configuration
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

#### Frontend (.env)
```bash
# WebRTC Engine Selection
REACT_APP_WEBRTC_ENGINE=livekit

# Optional: LiveKit URL (fetched from backend by default)
# REACT_APP_LIVEKIT_URL=ws://localhost:7880
```

### livekit.yaml

The configuration file is already included in the project root. Key settings:

```yaml
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 60000
  tcp_port: 7881
room:
  auto_create: true
  max_participants: 8
```

## Production Deployment

### Option 1: Self-Hosted (VPS/Cloud)

#### Requirements
- Ubuntu 20.04+ or similar Linux distribution
- 2+ CPU cores
- 4GB+ RAM
- Public IP address
- Open ports: 7880, 7881, 7882, 50000-60000

#### Steps

1. **Install Docker**
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

2. **Clone Repository**
```bash
git clone https://github.com/everest-an/dchat.git
cd dchat
```

3. **Configure Environment**
```bash
# Generate secure API keys
LIVEKIT_API_KEY=$(openssl rand -hex 16)
LIVEKIT_API_SECRET=$(openssl rand -hex 32)

# Update .env files
echo "LIVEKIT_URL=wss://your-domain.com" >> backend/.env
echo "LIVEKIT_API_KEY=$LIVEKIT_API_KEY" >> backend/.env
echo "LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET" >> backend/.env
```

4. **Update livekit.yaml**
```yaml
# Set your public IP
rtc:
  use_external_ip: true
  node_ip: "YOUR_PUBLIC_IP"
```

5. **Start Services**
```bash
docker-compose -f docker-compose.livekit.yml up -d
```

6. **Setup SSL (Required for Production)**
```bash
# Using Let's Encrypt with Nginx
sudo apt install nginx certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Configure Nginx as reverse proxy
sudo nano /etc/nginx/sites-available/livekit
```

Nginx configuration:
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option 2: LiveKit Cloud (Easiest)

1. **Sign Up**
   - Visit https://cloud.livekit.io
   - Create account
   - Free tier: 10,000 participant minutes/month

2. **Get Credentials**
   - Go to Settings → Keys
   - Create new API key
   - Copy API Key and Secret

3. **Update Configuration**
```bash
# Backend .env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
```

4. **Deploy**
   - No server setup needed
   - Automatic scaling
   - Global edge network
   - Built-in monitoring

## Testing

### 1. Health Check

```bash
# Check if LiveKit is running
curl http://localhost:7880/

# Expected response: LiveKit server info
```

### 2. Backend API Test

```bash
# Get LiveKit configuration
curl http://localhost:5000/api/livekit/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "livekit",
#   "details": {
#     "url": "ws://localhost:7880",
#     "status": "configured"
#   }
# }
```

### 3. Token Generation Test

```bash
# Create test token (requires authentication)
curl -X POST http://localhost:5000/api/livekit/token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "room_name": "test_room",
    "participant_name": "Test User"
  }'

# Expected response:
# {
#   "success": true,
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "url": "ws://localhost:7880",
#   "room_name": "test_room"
# }
```

### 4. End-to-End Call Test

1. Open Dchat in two browser windows
2. Login with different accounts
3. Initiate a video call
4. Verify:
   - Connection establishes < 3 seconds
   - Video and audio work
   - Controls (mute, video toggle) work
   - Call ends properly

## Monitoring

### Docker Logs

```bash
# View LiveKit logs
docker-compose -f docker-compose.livekit.yml logs -f livekit

# View backend logs
docker-compose logs -f backend
```

### LiveKit Metrics

LiveKit exposes Prometheus metrics at `http://localhost:7880/metrics`

Key metrics to monitor:
- `livekit_room_total` - Active rooms
- `livekit_participant_total` - Active participants
- `livekit_packet_total` - Network packets
- `livekit_bytes_total` - Bandwidth usage

## Troubleshooting

### Issue: Cannot connect to LiveKit

**Solution:**
```bash
# Check if LiveKit is running
docker ps | grep livekit

# Check logs
docker logs dchat-livekit

# Verify ports are open
netstat -tulpn | grep 7880
```

### Issue: WebRTC connection fails

**Solution:**
1. Check firewall rules (ports 7880, 7881, 7882, 50000-60000)
2. Verify public IP in livekit.yaml
3. Ensure SSL is configured for production
4. Check browser console for errors

### Issue: Poor call quality

**Solution:**
1. Check network bandwidth
2. Reduce max participants
3. Lower video resolution in config
4. Use LiveKit Cloud for better routing

### Issue: Frontend shows "native" engine

**Solution:**
```bash
# Check frontend environment
cat frontend/.env | grep WEBRTC_ENGINE

# Should be: REACT_APP_WEBRTC_ENGINE=livekit

# Check browser console
# Should see: "🚀 Using LiveKit engine for WebRTC"
```

## Scaling

### Horizontal Scaling

For high traffic, deploy multiple LiveKit instances:

```yaml
# docker-compose.livekit.yml
services:
  livekit-1:
    image: livekit/livekit-server:v1.9.3
    # ... config
  
  livekit-2:
    image: livekit/livekit-server:v1.9.3
    # ... config
  
  # Load balancer
  nginx:
    image: nginx:alpine
    # ... config
```

### Redis for Multi-Node

```yaml
# livekit.yaml
redis:
  address: redis:6379
  db: 0
```

## Security

### Production Checklist

- [ ] Use HTTPS/WSS (SSL certificates)
- [ ] Generate strong API keys (32+ characters)
- [ ] Restrict CORS origins
- [ ] Enable rate limiting
- [ ] Set up firewall rules
- [ ] Use environment variables (never commit secrets)
- [ ] Enable authentication for all API endpoints
- [ ] Monitor for unusual activity

## Cost Estimation

### Self-Hosted (AWS EC2 example)

- t3.medium (2 vCPU, 4GB RAM): ~$30/month
- Bandwidth (1TB): ~$90/month
- **Total: ~$120/month**

### LiveKit Cloud

- Free tier: 10,000 minutes/month ($0)
- Paid: $0.01 per participant minute
- 100 hours of calls: ~$60/month
- **Total: $0-60/month** (scales with usage)

## Support

- LiveKit Docs: https://docs.livekit.io
- Dchat Issues: https://github.com/everest-an/dchat/issues
- LiveKit Slack: https://livekit.io/slack

## Next Steps

After deployment:
1. Test with real users
2. Monitor call quality metrics
3. Optimize configuration based on usage
4. Consider LiveKit Cloud for production
5. Implement call recording (optional)
6. Add virtual backgrounds (optional)
