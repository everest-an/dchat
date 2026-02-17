# Dchat.pro 部署指南

**版本**: 2.0.0
**更新日期**: 2025-11-01

本文档提供了在开发和生产环境中部署 Dchat.pro 应用的详细步骤。应用分为前端（React + Vite）和后端（Python + Flask）两部分。

---

## 目录

1.  [先决条件](#1-先决条件)
2.  [后端部署](#2-后端部署)
    -   [2.1 环境设置](#21-环境设置)
    -   [2.2 依赖安装](#22-依赖安装)
    -   [2.3 环境配置](#23-环境配置)
    -   [2.4 数据库初始化](#24-数据库初始化)
    -   [2.5 运行开发服务器](#25-运行开发服务器)
    -   [2.6 生产环境部署](#26-生产环境部署)
3.  [前端部署](#3-前端部署)
    -   [3.1 环境设置](#31-环境设置)
    -   [3.2 依赖安装](#32-依赖安装)
    -   [3.3 环境配置](#33-环境配置)
    -   [3.4 运行开发服务器](#34-运行开发服务器)
    -   [3.5 构建生产版本](#35-构建生产版本)
4.  [智能合约部署](#4-智能合约部署)
5.  [Nginx 反向代理配置](#5-nginx-反向代理配置)
6.  [故障排查](#6-故障排查)

---

## 1. 先决条件

在开始之前，请确保您的系统已安装以下软件：

-   **Node.js**: v18.x 或更高版本
-   **Python**: v3.9 或更高版本
-   **Git**: 用于克隆代码仓库
-   **PostgreSQL**: 生产环境推荐的数据库
-   **Nginx**: 生产环境推荐的反向代理服务器
-   **pnpm**: (可选) 用于前端依赖管理

## 2. 后端部署

后端服务基于 Python Flask 框架，负责处理 API 请求、数据库交互和业务逻辑。

### 2.1 环境设置

首先，克隆代码仓库并进入后端目录：

```bash
git clone https://github.com/everest-an/dchat.git
cd dchat/backend
```

创建并激活 Python 虚拟环境：

```bash
python3 -m venv venv
source venv/bin/activate
```

### 2.2 依赖安装

使用 pip 安装所有必需的 Python 包：

```bash
pip install -r requirements.txt
```

### 2.3 环境配置

后端配置通过环境变量进行管理。复制示例文件并根据您的环境进行修改：

```bash
cp .env.python.example .env
```

编辑 `.env` 文件，至少需要配置以下变量：

-   `SECRET_KEY`: 用于 Flask 和 JWT 签名的密钥，请务必修改为强随机字符串。
-   `DATABASE_URL`: 数据库连接字符串。开发环境可以使用默认的 SQLite，生产环境请使用 PostgreSQL。
-   `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`: 用于 LinkedIn OAuth 的凭证。

**PostgreSQL 示例**: `DATABASE_URL=postgresql://user:password@host:port/dbname`

### 2.4 数据库初始化

在首次运行时，需要创建数据库表结构。Flask 应用会在启动时自动执行此操作。只需确保数据库服务正在运行且连接配置正确。

### 2.5 运行开发服务器

配置完成后，可以启动 Flask 开发服务器：

```bash
python src/main_enhanced.py
```

服务器默认在 `http://0.0.0.0:5000` 启动。您可以通过访问 `http://localhost:5000/api/health` 来检查服务是否正常运行。

### 2.6 生产环境部署

在生产环境中，不应直接使用 Flask 开发服务器。推荐使用 Gunicorn 或 uWSGI 作为应用服务器，并使用 Nginx 作为反向代理。

**使用 Gunicorn 启动:**

```bash
gunicorn --workers 4 --bind 0.0.0.0:5000 "src.main_enhanced:app"
```

## 3. 前端部署

前端应用基于 React 和 Vite，提供了现代化的开发体验和高性能的构建输出。

### 3.1 环境设置

进入前端项目目录：

```bash
cd ../frontend
```

### 3.2 依赖安装

使用 pnpm (推荐) 或 npm 安装依赖：

```bash
# 使用 pnpm
pnpm install

# 或者使用 npm
# npm install
```

### 3.3 环境配置

前端配置通过 `.env` 文件管理。复制示例文件并进行修改：

```bash
cp .env.example .env
```

编辑 `.env` 文件，关键配置项是 `VITE_API_BASE_URL`，它应该指向后端 API 的地址。

-   **开发环境**: `VITE_API_BASE_URL=http://localhost:5000/api`
-   **生产环境**: `VITE_API_BASE_URL=https://dchat.pro/api`

### 3.4 运行开发服务器

启动 Vite 开发服务器，它支持热模块重载 (HMR)：

```bash
pnpm dev
```

服务默认在 `http://localhost:3000` 启动。

### 3.5 构建生产版本

要构建用于生产环境的优化版本，运行以下命令：

```bash
pnpm build
```

构建产物将生成在 `dist` 目录中。这些是静态文件，可以部署在任何静态文件服务器或 CDN 上。

## 4. 智能合约部署

项目中的智能合约使用 Hardhat 进行开发和部署。

1.  进入 `contracts` 目录。
2.  安装依赖: `pnpm install`
3.  配置 `hardhat.config.js` 中的网络（如 Sepolia 测试网）。
4.  运行部署脚本: `npx hardhat run scripts/deploy.js --network sepolia`
5.  部署成功后，将合约地址更新到后端和前端的配置文件中。

## 5. Nginx 反向代理配置

在生产环境中，使用 Nginx 可以统一处理前端静态文件和后端 API 请求，并轻松配置 HTTPS。

以下是一个 Nginx 配置示例：

```nginx
server {
    listen 80;
    server_name dchat.pro www.dchat.pro;

    # 强制跳转到 HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dchat.pro www.dchat.pro;

    # SSL 证书配置
    ssl_certificate /path/to/your/fullchain.pem;
    ssl_certificate_key /path/to/your/privkey.pem;

    # 前端静态文件
    location / {
        root /path/to/dchat/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://localhost:5000; # Gunicorn 服务地址
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 6. 故障排查

-   **CORS 错误**: 确保后端的 `CORS_ORIGINS` 环境变量已正确配置为允许前端的访问地址。
-   **502 Bad Gateway**: 检查后端的 Gunicorn 服务是否正在运行，并检查 Nginx 配置中的 `proxy_pass` 地址是否正确。
-   **数据库连接失败**: 验证数据库服务是否启动，以及 `DATABASE_URL` 中的凭证、主机和端口是否正确。
-   **依赖安装失败**: 检查 Node.js 和 Python 版本是否符合要求，并尝试删除 `node_modules` 或 `venv` 目录后重新安装。
