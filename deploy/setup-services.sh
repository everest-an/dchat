#!/bin/bash
set -e

echo "=== Dchat服务配置脚本 ==="
echo "此脚本将配置systemd服务和Nginx"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}错误: 请使用sudo运行此脚本${NC}"
    exit 1
fi

# 项目目录
PROJECT_DIR="/home/ec2-user/dchat"
DEPLOY_DIR="$PROJECT_DIR/deploy"

echo -e "${YELLOW}步骤 1/5: 创建日志目录${NC}"
mkdir -p /var/log/dchat
chown ec2-user:ec2-user /var/log/dchat
echo -e "${GREEN}✓ 日志目录创建完成${NC}"

echo -e "${YELLOW}步骤 2/5: 安装systemd服务${NC}"
# 复制服务文件
cp $DEPLOY_DIR/dchat-api.service /etc/systemd/system/
cp $DEPLOY_DIR/dchat-socket.service /etc/systemd/system/

# 重新加载systemd
systemctl daemon-reload

# 启用服务（开机自启）
systemctl enable dchat-api.service
systemctl enable dchat-socket.service

echo -e "${GREEN}✓ Systemd服务安装完成${NC}"

echo -e "${YELLOW}步骤 3/5: 配置Nginx${NC}"
# 备份现有配置
if [ -f /etc/nginx/sites-available/dchat ]; then
    cp /etc/nginx/sites-available/dchat /etc/nginx/sites-available/dchat.backup.$(date +%Y%m%d_%H%M%S)
fi

# 复制新配置
cp $DEPLOY_DIR/nginx-dchat.conf /etc/nginx/sites-available/dchat

# 创建符号链接
ln -sf /etc/nginx/sites-available/dchat /etc/nginx/sites-enabled/dchat

# 删除默认站点（如果存在）
rm -f /etc/nginx/sites-enabled/default

# 测试Nginx配置
nginx -t

echo -e "${GREEN}✓ Nginx配置完成${NC}"

echo -e "${YELLOW}步骤 4/5: 启动服务${NC}"
# 停止旧进程
echo "停止旧的Python进程..."
pkill -f "python3.*src.main" || true
pkill -f "python3.*src.socket_app" || true
sleep 2

# 启动新服务
systemctl start dchat-api.service
systemctl start dchat-socket.service

# 重启Nginx
systemctl restart nginx

echo -e "${GREEN}✓ 服务启动完成${NC}"

echo -e "${YELLOW}步骤 5/5: 检查服务状态${NC}"
echo ""
echo "=== Dchat API服务状态 ==="
systemctl status dchat-api.service --no-pager -l || true
echo ""
echo "=== Dchat Socket.io服务状态 ==="
systemctl status dchat-socket.service --no-pager -l || true
echo ""
echo "=== Nginx服务状态 ==="
systemctl status nginx --no-pager -l || true
echo ""

# 检查端口
echo "=== 端口监听状态 ==="
netstat -tlnp | grep :5000 || echo "警告: 端口5000未监听"
netstat -tlnp | grep :80 || echo "警告: 端口80未监听"
netstat -tlnp | grep :443 || echo "警告: 端口443未监听"
echo ""

echo -e "${GREEN}=== 配置完成! ===${NC}"
echo ""
echo "有用的命令:"
echo "  查看API日志:     sudo journalctl -u dchat-api -f"
echo "  查看Socket日志:  sudo journalctl -u dchat-socket -f"
echo "  查看Nginx日志:   sudo tail -f /var/log/nginx/dchat-error.log"
echo "  重启API服务:     sudo systemctl restart dchat-api"
echo "  重启Socket服务:  sudo systemctl restart dchat-socket"
echo "  重启Nginx:       sudo systemctl restart nginx"
echo ""
echo "测试API: curl https://dchat.pro/api/health"
echo ""
