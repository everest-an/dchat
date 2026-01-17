# Dchat生产环境部署指南

## 概述

本文档描述如何将Dchat部署到生产环境，支持多用户并发、消息持久化和横向扩展。

## 架构变更

### 旧架构（Demo）
```
单进程 Flask + Socket.io
├── 内存存储会话
├── 无消息持久化
└── 无法横向扩展
```

### 新架构（生产级）
```
多服务架构
├── Flask API服务器 (可多实例)
├── Socket.io服务器 (可多实例)
├── Redis (会话、缓存、Pub/Sub)
├── PostgreSQL (消息持久化)
└── Nginx (负载均衡、反向代理)
```

## 核心改进

### 1. **Redis集成**
- 会话状态存储在Redis，支持多服务器共享
- Redis Pub/Sub实现Socket.io集群通信
- 在线用户状态管理

### 2. **消息持久化**
- 所有消息保存到PostgreSQL数据库
- 离线用户可接收未读消息
- 消息送达和已读状态追踪

### 3. **异步处理**
- 使用`aiohttp`和`asyncio`实现异步I/O
- 提高并发处理能力
- 减少资源消耗

### 4. **横向扩展**
- 支持多个Socket.io实例
- 通过Redis Pub/Sub同步消息
- Nginx负载均衡

## 前置要求

### 系统要求
- Ubuntu 20.04+ / Amazon Linux 2
- Python 3.9+
- Node.js 18+
- 至少2GB RAM（推荐4GB+）

### 服务依赖
1. **PostgreSQL 14+**
2. **Redis 6+**
3. **Nginx 1.20+**

## 部署步骤

### 步骤1: 安装系统依赖

```bash
# 更新系统
sudo yum update -y  # Amazon Linux
# 或
sudo apt update && sudo apt upgrade -y  # Ubuntu

# 安装PostgreSQL
sudo yum install postgresql14 postgresql14-server -y
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 安装Redis
sudo yum install redis -y
sudo systemctl start redis
sudo systemctl enable redis

# 安装Nginx
sudo yum install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# 安装Python依赖
sudo yum install python3 python3-pip python3-devel gcc -y
```

### 步骤2: 配置PostgreSQL

```bash
# 切换到postgres用户
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE dchat_prod;
CREATE USER dchat_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE dchat_prod TO dchat_user;

# 创建消息表
\c dchat_prod

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered BOOLEAN DEFAULT FALSE,
    delivered_at TIMESTAMP,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    INDEX idx_sender (sender_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_delivered (delivered),
    INDEX idx_read (read)
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    username VARCHAR(100),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP,
    INDEX idx_wallet (wallet_address)
);

\q
```

### 步骤3: 配置Redis

```bash
# 编辑Redis配置
sudo vi /etc/redis/redis.conf

# 修改以下配置
bind 127.0.0.1
protected-mode yes
port 6379
maxmemory 256mb
maxmemory-policy allkeys-lru

# 设置密码（可选但推荐）
requirepass your_redis_password

# 重启Redis
sudo systemctl restart redis
```

### 步骤4: 部署后端代码

```bash
# 进入项目目录
cd /home/ec2-user/dchat/backend

# 安装Python依赖
pip3 install --user -r requirements-production.txt

# 创建环境变量文件
cp .env.production.example .env.production

# 编辑环境变量
vi .env.production

# 必须配置的变量：
# - SECRET_KEY
# - DATABASE_URL
# - REDIS_URL
# - CORS_ORIGINS
```

### 步骤5: 配置systemd服务

```bash
# 复制服务文件
sudo cp /home/ec2-user/dchat/deploy/dchat-api.service /etc/systemd/system/
sudo cp /home/ec2-user/dchat/deploy/dchat-socket.service /etc/systemd/system/

# 编辑服务文件，确保路径正确
sudo vi /etc/systemd/system/dchat-socket.service

# 修改ExecStart为生产版本
ExecStart=/usr/bin/python3 -m src.socket_app_prod

# 重新加载systemd
sudo systemctl daemon-reload

# 启用并启动服务
sudo systemctl enable dchat-api dchat-socket
sudo systemctl start dchat-api dchat-socket

# 检查状态
sudo systemctl status dchat-api
sudo systemctl status dchat-socket
```

### 步骤6: 配置Nginx

```bash
# 复制Nginx配置
sudo cp /home/ec2-user/dchat/deploy/nginx-dchat.conf /etc/nginx/sites-available/dchat

# 创建符号链接
sudo ln -s /etc/nginx/sites-available/dchat /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

### 步骤7: 配置SSL证书（Let's Encrypt）

```bash
# 安装certbot
sudo yum install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d dchat.pro -d www.dchat.pro

# 自动续期
sudo systemctl enable certbot-renew.timer
```

### 步骤8: 部署前端

```bash
cd /home/ec2-user/dchat/frontend

# 安装依赖
pnpm install

# 构建生产版本
pnpm build

# 前端文件已经通过Nginx配置指向dist目录
```

## 验证部署

### 1. 检查服务状态

```bash
# 检查API服务
curl http://localhost:5000/api/health

# 检查Socket.io服务
curl http://localhost:5000/health

# 检查Nginx
curl https://dchat.pro/api/health
```

### 2. 检查日志

```bash
# API日志
sudo journalctl -u dchat-api -f

# Socket.io日志
sudo journalctl -u dchat-socket -f

# Nginx日志
sudo tail -f /var/log/nginx/dchat-error.log
```

### 3. 检查Redis连接

```bash
redis-cli ping
# 应该返回: PONG
```

### 4. 检查PostgreSQL连接

```bash
psql -U dchat_user -d dchat_prod -c "SELECT version();"
```

## 性能优化

### 1. PostgreSQL优化

```sql
-- 添加索引
CREATE INDEX CONCURRENTLY idx_messages_undelivered 
ON messages (receiver_id, delivered) 
WHERE delivered = FALSE;

-- 配置连接池
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
```

### 2. Redis优化

```bash
# 增加最大内存
maxmemory 512mb

# 启用持久化（可选）
save 900 1
save 300 10
save 60 10000
```

### 3. Nginx优化

```nginx
# 增加worker进程
worker_processes auto;
worker_connections 2048;

# 启用gzip压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

## 监控和维护

### 1. 设置监控

```bash
# 安装Prometheus Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xvfz node_exporter-*.tar.gz
sudo cp node_exporter-*/node_exporter /usr/local/bin/
sudo useradd -rs /bin/false node_exporter

# 创建systemd服务
sudo vi /etc/systemd/system/node_exporter.service
```

### 2. 日志轮转

```bash
# 创建logrotate配置
sudo vi /etc/logrotate.d/dchat

/var/log/dchat/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ec2-user ec2-user
    sharedscripts
    postrotate
        systemctl reload dchat-api dchat-socket
    endscript
}
```

### 3. 自动备份

```bash
# 创建备份脚本
sudo vi /usr/local/bin/backup-dchat.sh

#!/bin/bash
BACKUP_DIR="/var/backups/dchat"
DATE=$(date +%Y%m%d_%H%M%S)

# 备份数据库
pg_dump -U dchat_user dchat_prod | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# 备份Redis
redis-cli --rdb $BACKUP_DIR/redis_$DATE.rdb

# 删除30天前的备份
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

# 添加到crontab
sudo crontab -e
0 2 * * * /usr/local/bin/backup-dchat.sh
```

## 故障排查

### 问题1: Socket.io连接失败

```bash
# 检查端口是否监听
netstat -tlnp | grep :5000

# 检查防火墙
sudo firewall-cmd --list-all

# 检查Redis连接
redis-cli ping

# 查看Socket.io日志
sudo journalctl -u dchat-socket -n 100
```

### 问题2: 消息未持久化

```bash
# 检查数据库连接
psql -U dchat_user -d dchat_prod -c "SELECT COUNT(*) FROM messages;"

# 检查环境变量
cat /home/ec2-user/dchat/backend/.env.production | grep DATABASE_URL

# 查看API日志
sudo journalctl -u dchat-api -n 100 | grep -i error
```

### 问题3: 高并发性能问题

```bash
# 增加worker进程
sudo vi /etc/systemd/system/dchat-socket.service
# 添加多个实例

# 监控资源使用
htop
iotop
```

## 扩展到多服务器

### 1. 部署多个Socket.io实例

```bash
# 在不同端口运行多个实例
# 实例1: 端口5000
# 实例2: 端口5001
# 实例3: 端口5002

# Nginx负载均衡配置
upstream dchat_socket {
    ip_hash;  # 保持会话亲和性
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
}
```

### 2. Redis集群

```bash
# 配置Redis Sentinel或Redis Cluster
# 提供高可用性和自动故障转移
```

## 安全建议

1. **定期更新依赖**
   ```bash
   pip3 list --outdated
   ```

2. **启用防火墙**
   ```bash
   sudo firewall-cmd --permanent --add-service=http
   sudo firewall-cmd --permanent --add-service=https
   sudo firewall-cmd --reload
   ```

3. **配置fail2ban**
   ```bash
   sudo yum install fail2ban -y
   sudo systemctl enable fail2ban
   ```

4. **定期审计日志**
   ```bash
   sudo ausearch -m avc -ts recent
   ```

## 联系支持

如有问题，请联系：
- GitHub: https://github.com/everest-an/dchat
- Email: support@dchat.pro
