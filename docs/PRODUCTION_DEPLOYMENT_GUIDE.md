# Dchat Production Deployment Guide (Self-Hosted)

**Version**: 2.0  
**Last Updated**: 2024-11-13  
**Status**: Production Ready 🚀

> **Note**: This guide is for self-hosted deployment. For Vercel deployment, see `DEPLOYMENT_GUIDE.md`.

---

## 📋 Prerequisites

### System Requirements
- **OS**: Ubuntu 22.04 LTS or later
- **CPU**: 4+ cores
- **RAM**: 8GB+ (16GB recommended)
- **Disk**: 50GB+ SSD
- **Network**: 100Mbps+ bandwidth

### Required Software
- **Python**: 3.11+
- **Node.js**: 22.x
- **PostgreSQL**: 15+
- **Redis**: 7+
- **Docker**: 24+ (for LiveKit)
- **Nginx**: 1.24+ (reverse proxy)

---

## 🚀 Quick Start

### 1. Setup Backend

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements-production.txt
```

### 2. Configure Environment

Create `.env` file:
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dchat

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=your-super-secret-key

# LiveKit
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
LIVEKIT_WS_URL=wss://your-server.com

# Logging
LOG_LEVEL=INFO
LOG_DIR=/var/log/dchat
```

### 3. Setup Database

```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE dchat;"

# Run migrations
alembic upgrade head

# Apply indexes
psql -d dchat < migrations/add_performance_indexes.sql
```

### 4. Start Services

```bash
# Backend
gunicorn -w 4 -b 0.0.0.0:5000 src.main:app

# LiveKit
docker-compose -f docker-compose.livekit.yml up -d

# Frontend
cd frontend
npm install
npm run build
```

---

## ✅ Verification

```bash
# Health check
curl http://localhost:5000/health

# Metrics
curl http://localhost:5000/metrics

# Run tests
python tests/test_critical_paths.py
```

---

## 📊 Production Checklist

- [ ] PostgreSQL configured
- [ ] Redis configured
- [ ] LiveKit deployed
- [ ] SSL certificates installed
- [ ] Nginx configured
- [ ] Systemd service created
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] Logs rotation configured
- [ ] Firewall rules set

---

**For detailed instructions, see the full deployment guide.**
