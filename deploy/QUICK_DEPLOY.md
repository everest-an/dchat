# Dchat快速部署指南（AWS EC2）

## 🚀 快速开始

本指南帮助您在30分钟内将Dchat部署到AWS EC2生产环境。

## 前提条件

- AWS EC2实例（Amazon Linux 2或Ubuntu 20.04+）
- 至少2GB RAM
- 已配置域名指向EC2公网IP
- SSH访问权限

## 第一步：安装依赖（5分钟）

```bash
# SSH连接到EC2
ssh -i your-key.pem ec2-user@your-server-ip

# 安装PostgreSQL
sudo amazon-linux-extras install postgresql14 -y
sudo yum install postgresql-server postgresql-contrib -y
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 安装Redis
sudo yum install redis -y
sudo systemctl start redis
sudo systemctl enable redis

# 安装Nginx
sudo amazon-linux-extras install nginx1 -y
sudo systemctl start nginx
sudo systemctl enable nginx

# 安装Python依赖工具
sudo yum install python3-pip git -y
```

## 第二步：配置数据库（5分钟）

```bash
# 配置PostgreSQL
sudo -u postgres psql << 'EOF'
CREATE DATABASE dchat_prod;
CREATE USER dchat_user WITH ENCRYPTED PASSWORD 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE dchat_prod TO dchat_user;
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
    read_at TIMESTAMP
);
CREATE INDEX idx_sender ON messages(sender_id);
CREATE INDEX idx_receiver ON messages(receiver_id);
CREATE INDEX idx_timestamp ON messages(timestamp);
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    username VARCHAR(100),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP
);
CREATE INDEX idx_wallet ON users(wallet_address);
\q
EOF

# 配置PostgreSQL允许本地连接
sudo sed -i 's/ident/md5/g' /var/lib/pgsql/data/pg_hba.conf
sudo systemctl restart postgresql
```

## 第三步：拉取代码并安装（5分钟）

```bash
# 克隆代码（如果还没有）
cd ~
git clone https://github.com/everest-an/dchat.git
cd dchat

# 或者拉取最新代码
cd ~/dchat
git pull origin main

# 安装Python依赖
cd backend
pip3 install --user -r requirements-production.txt
```

## 第四步：配置环境变量（3分钟）

```bash
# 创建生产环境配置
cd ~/dchat/backend
cp .env.production.example .env.production

# 编辑配置文件
vi .env.production

# 必须修改的配置：
SECRET_KEY=your-random-secret-key-here
DATABASE_URL=postgresql+asyncpg://dchat_user:YourSecurePassword123!@localhost:5432/dchat_prod
SQLALCHEMY_DATABASE_URI=postgresql://dchat_user:YourSecurePassword123!@localhost:5432/dchat_prod
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=https://dchat.pro,https://www.dchat.pro

# 保存并退出（按ESC，然后输入:wq）
```

## 第五步：配置服务（5分钟）

```bash
# 运行自动配置脚本
cd ~/dchat
sudo deploy/setup-services.sh

# 脚本会自动：
# 1. 创建日志目录
# 2. 安装systemd服务
# 3. 配置Nginx
# 4. 启动所有服务
```

## 第六步：构建前端（5分钟）

```bash
cd ~/dchat/frontend

# 安装pnpm（如果还没有）
npm install -g pnpm

# 安装依赖并构建
pnpm install
pnpm build

# 前端文件会自动被Nginx服务
```

## 第七步：配置SSL证书（2分钟）

```bash
# 安装certbot
sudo yum install certbot python3-certbot-nginx -y

# 获取SSL证书
sudo certbot --nginx -d dchat.pro -d www.dchat.pro

# 按提示输入邮箱并同意条款
# certbot会自动配置Nginx并重启
```

## 验证部署

### 1. 检查服务状态

```bash
# 检查所有服务
sudo systemctl status dchat-api dchat-socket nginx redis postgresql

# 应该都显示"active (running)"
```

### 2. 测试API

```bash
# 测试本地API
curl http://localhost:5000/api/health

# 应该返回: {"status": "ok", ...}

# 测试外部访问
curl https://dchat.pro/api/health
```

### 3. 测试Socket.io

```bash
# 检查Socket.io端口
netstat -tlnp | grep :5000

# 应该看到Python进程监听5000端口
```

### 4. 查看日志

```bash
# API日志
sudo journalctl -u dchat-api -f

# Socket.io日志
sudo journalctl -u dchat-socket -f

# Nginx日志
sudo tail -f /var/log/nginx/dchat-error.log
```

## 常见问题

### 问题1: 服务启动失败

```bash
# 查看详细错误
sudo journalctl -u dchat-api -n 50
sudo journalctl -u dchat-socket -n 50

# 检查端口占用
sudo netstat -tlnp | grep :5000

# 杀死占用进程
sudo pkill -f "python3.*src.main"
sudo systemctl restart dchat-api dchat-socket
```

### 问题2: 数据库连接失败

```bash
# 测试数据库连接
psql -U dchat_user -d dchat_prod -h localhost -c "SELECT version();"

# 如果失败，检查密码和pg_hba.conf配置
sudo cat /var/lib/pgsql/data/pg_hba.conf | grep md5
```

### 问题3: Nginx 502错误

```bash
# 检查后端服务是否运行
sudo systemctl status dchat-api dchat-socket

# 检查Nginx配置
sudo nginx -t

# 查看Nginx错误日志
sudo tail -f /var/log/nginx/error.log
```

### 问题4: SSL证书问题

```bash
# 检查证书状态
sudo certbot certificates

# 手动续期
sudo certbot renew --dry-run
```

## 更新部署

```bash
# 拉取最新代码
cd ~/dchat
git pull origin main

# 更新后端
cd backend
pip3 install --user -r requirements-production.txt
sudo systemctl restart dchat-api dchat-socket

# 更新前端
cd ../frontend
pnpm install
pnpm build

# 重启Nginx
sudo systemctl restart nginx
```

## 监控命令

```bash
# 实时查看系统资源
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h

# 查看网络连接
sudo netstat -ant | grep ESTABLISHED | wc -l

# 查看Redis状态
redis-cli info stats

# 查看PostgreSQL连接
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

## 性能优化建议

### 1. 增加文件描述符限制

```bash
# 编辑limits.conf
sudo vi /etc/security/limits.conf

# 添加以下行
* soft nofile 65536
* hard nofile 65536

# 重启系统或重新登录
```

### 2. 优化PostgreSQL

```bash
sudo -u postgres psql -d dchat_prod << 'EOF'
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '16MB';
SELECT pg_reload_conf();
\q
EOF
```

### 3. 优化Redis

```bash
# 编辑Redis配置
sudo vi /etc/redis.conf

# 修改以下配置
maxmemory 512mb
maxmemory-policy allkeys-lru
tcp-backlog 511

# 重启Redis
sudo systemctl restart redis
```

## 安全检查清单

- [ ] 修改了默认SECRET_KEY
- [ ] 配置了强密码
- [ ] 启用了SSL证书
- [ ] 配置了防火墙规则
- [ ] 禁用了DEBUG模式
- [ ] 配置了CORS白名单
- [ ] 设置了日志轮转
- [ ] 配置了自动备份

## 下一步

1. 配置监控（Prometheus + Grafana）
2. 设置告警（Sentry）
3. 配置自动备份
4. 性能测试和优化
5. 配置CDN加速

## 获取帮助

- 文档: `/home/ec2-user/dchat/deploy/PRODUCTION_DEPLOYMENT.md`
- GitHub: https://github.com/everest-an/dchat
- Issues: https://github.com/everest-an/dchat/issues

## 完成！🎉

您的Dchat现在应该已经在 https://dchat.pro 上运行了！

测试一下：
1. 访问 https://dchat.pro
2. 连接钱包
3. 发送消息
4. 检查消息是否实时送达

祝您使用愉快！
