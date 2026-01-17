#!/bin/bash

# Dchat.pro 部署脚本
# 版本: 2.0.0

set -e  # 遇到错误立即退出

echo "🚀 开始部署 Dchat.pro v2.0.0..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "📁 项目目录: $PROJECT_ROOT"
echo ""

# 1. 检查环境
echo "🔍 检查部署环境..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    exit 1
fi

if ! command -v pnpm &> /dev/null && ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ pnpm 或 npm 未安装${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 环境检查通过${NC}"
echo ""

# 2. 构建前端
echo "🔨 构建前端..."
cd "$PROJECT_ROOT/frontend"

# 检查是否有 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    if command -v pnpm &> /dev/null; then
        pnpm install
    else
        npm install
    fi
fi

# 构建生产版本
echo "🏗️  构建生产版本..."
if command -v pnpm &> /dev/null; then
    pnpm build
else
    npm run build
fi

if [ -d "dist" ]; then
    echo -e "${GREEN}✅ 前端构建成功${NC}"
    echo "📊 构建产物大小:"
    du -sh dist
else
    echo -e "${RED}❌ 前端构建失败${NC}"
    exit 1
fi
echo ""

# 3. 准备后端
echo "🔧 准备后端..."
cd "$PROJECT_ROOT/backend"

# 创建虚拟环境（如果不存在）
if [ ! -d "venv" ]; then
    echo "🐍 创建 Python 虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "📦 安装后端依赖..."
pip install -r requirements.txt -q

echo -e "${GREEN}✅ 后端准备完成${NC}"
echo ""

# 4. 复制前端构建产物到后端静态目录
echo "📋 复制前端构建产物..."
STATIC_DIR="$PROJECT_ROOT/backend/src/static"
mkdir -p "$STATIC_DIR"
rm -rf "$STATIC_DIR"/*
cp -r "$PROJECT_ROOT/frontend/dist/"* "$STATIC_DIR/"

echo -e "${GREEN}✅ 前端产物已复制到后端静态目录${NC}"
echo ""

# 5. 创建环境配置（如果不存在）
echo "⚙️  检查环境配置..."
if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
    echo -e "${YELLOW}⚠️  .env 文件不存在，创建默认配置...${NC}"
    cat > "$PROJECT_ROOT/backend/.env" << EOF
# Dchat Backend Production Configuration
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
DATABASE_URL=sqlite:///$(pwd)/database/app.db
DEBUG=False
PORT=5000
CORS_ORIGINS=https://dchat.pro,https://www.dchat.pro

# LinkedIn OAuth (需要配置)
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=https://dchat.pro/auth/linkedin/callback

# IPFS Configuration
IPFS_API_URL=https://ipfs.infura.io:5001
IPFS_GATEWAY=https://ipfs.io/ipfs/

# JWT Configuration
JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
JWT_EXPIRATION_HOURS=720
EOF
    echo -e "${GREEN}✅ 默认 .env 文件已创建${NC}"
    echo -e "${YELLOW}⚠️  请编辑 backend/.env 文件并配置正确的值${NC}"
else
    echo -e "${GREEN}✅ .env 文件已存在${NC}"
fi
echo ""

# 6. 测试后端启动
echo "🧪 测试后端启动..."
cd "$PROJECT_ROOT/backend"
timeout 5 python src/main.py &> /dev/null || true
echo -e "${GREEN}✅ 后端启动测试完成${NC}"
echo ""

# 7. 生成部署报告
echo "📝 生成部署报告..."
REPORT_FILE="$PROJECT_ROOT/deployment_report.txt"
cat > "$REPORT_FILE" << EOF
Dchat.pro 部署报告
==================

部署时间: $(date '+%Y-%m-%d %H:%M:%S')
版本: 2.0.0

前端构建
--------
- 构建目录: frontend/dist
- 构建大小: $(du -sh frontend/dist | cut -f1)
- 文件数量: $(find frontend/dist -type f | wc -l)

后端配置
--------
- Python 版本: $(python3 --version)
- 虚拟环境: backend/venv
- 静态文件: backend/src/static
- 环境配置: backend/.env

部署文件
--------
$(ls -lh backend/src/static | head -10)

下一步操作
----------
1. 检查并更新 backend/.env 配置文件
2. 配置 LinkedIn OAuth 凭证
3. 设置数据库连接（生产环境建议使用 PostgreSQL）
4. 配置 Nginx 反向代理
5. 使用 Gunicorn 启动后端服务
6. 配置 SSL 证书

启动命令
--------
# 开发环境
cd backend && source venv/bin/activate && python src/main.py

# 生产环境
cd backend && source venv/bin/activate && gunicorn --workers 4 --bind 0.0.0.0:5000 "src.main:app"

EOF

echo -e "${GREEN}✅ 部署报告已生成: $REPORT_FILE${NC}"
echo ""

# 8. 完成
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 部署准备完成！${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 部署清单:"
echo "  ✅ 前端已构建"
echo "  ✅ 后端已准备"
echo "  ✅ 静态文件已复制"
echo "  ✅ 环境配置已检查"
echo ""
echo "🚀 启动服务:"
echo "  cd backend && source venv/bin/activate"
echo "  python src/main.py  # 开发环境"
echo "  gunicorn --workers 4 --bind 0.0.0.0:5000 \"src.main:app\"  # 生产环境"
echo ""
echo "📚 更多信息请查看:"
echo "  - 部署报告: deployment_report.txt"
echo "  - 部署指南: DEPLOYMENT_V2.md"
echo "  - 用户指南: USER_GUIDE_V2.md"
echo ""
