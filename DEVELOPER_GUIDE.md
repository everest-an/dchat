# dChat 开发文档

**版本**: 2.0
**日期**: 2026年1月9日

## 1. 简介

本文档为dChat项目的开发者提供技术指导，包括环境设置、架构概览、开发流程和部署说明。

## 2. 环境设置

### 2.1 前端 (React + Vite)

**依赖:**
- Node.js (v22.x)
- pnpm

**步骤:**
```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖
pnpm install

# 3. 启动本地开发服务器
pnpm run dev
```

本地开发服务器将运行在 `http://localhost:5173`。

### 2.2 后端 (Go + Gin)

**依赖:**
- Go (v1.21+)
- PostgreSQL
- Docker (可选)

**步骤:**
```bash
# 1. 进入Go后端目录
cd backend-go

# 2. 设置环境变量
cp .env.example .env
# 编辑.env文件，配置数据库连接和JWT密钥

# 3. 运行数据库迁移
# (需要配置数据库连接)
go run ./cmd/migrate

# 4. 启动API服务器
go run ./cmd/api/main.go

# 5. 启动WebSocket服务器
go run ./cmd/websocket/main.go
```

- API服务器: `http://localhost:8080`
- WebSocket服务器: `http://localhost:8081`

## 3. 架构概览

dChat采用前后端分离的微服务架构。

### 3.1 前端

- **框架**: React + Vite
- **UI库**: TailwindCSS
- **状态管理**: React Context
- **Web3集成**: Ethers.js, Web3Modal

**目录结构:**
```
frontend/src/
├── components/  # 可重用UI组件
├── contexts/    # React Context状态管理
├── services/    # API和Web3服务
├── utils/       # 工具函数
├── main.jsx     # 应用入口
└── App.jsx      # 主应用组件
```

### 3.2 后端 (Go)

- **框架**: Gin
- **数据库**: PostgreSQL + GORM
- **WebSocket**: Gorilla WebSocket
- **认证**: JWT

**目录结构:**
```
backend-go/
├── cmd/         # 应用入口 (api, websocket, migrate)
├── internal/    # 内部业务逻辑
│   ├── auth/      # 认证服务
│   ├── handlers/  # HTTP处理器
│   ├── models/    # 数据库模型
│   ├── websocket/ # WebSocket服务
│   └── privadoid/ # DID验证
├── pkg/         # 可重用的库
└── deploy.sh    # 部署脚本
```

### 3.3 数据库

使用PostgreSQL存储数据，GORM作为ORM层。

**主要数据模型:**
- `User`: 用户信息 (钱包地址、用户名等)
- `Message`: 消息内容 (发送者、接收者、内容、时间戳)
- `Conversation`: 对话元数据
- `Verification`: DID验证记录

## 4. API端点

API基础URL: `/api`

### 4.1 认证

- `POST /auth/nonce`: 获取登录所需的nonce。
- `POST /auth/wallet-login`: 使用签名验证钱包并获取JWT。

### 4.2 消息

- `POST /messages`: 发送消息 (需要认证)。
- `GET /messages/:user_id`: 获取与指定用户的消息历史 (需要认证)。
- `GET /conversations`: 获取当前用户的对话列表 (需要认证)。
- `PUT /messages/read/:sender_id`: 标记消息为已读 (需要认证)。

### 4.3 用户

- `GET /user/me`: 获取当前用户信息 (需要认证)。

### 4.4 DID验证

- `GET /verifications/types`: 获取支持的验证类型。
- `POST /verifications/request`: 创建验证请求 (需要认证)。
- `POST /verifications/verify`: 验证一个零知识证明。

## 5. WebSocket

- **端点**: `/ws`
- **认证**: 通过查询参数 `?token=<jwt>` 或 `Authorization` header。

**消息格式 (JSON):**

- **发送消息:**
  ```json
  {
    "type": "send_message",
    "payload": {
      "receiver_id": 123,
      "content": "Hello, world!"
    }
  }
  ```

- **接收消息:**
  ```json
  {
    "type": "new_message",
    "payload": {
      "id": 1,
      "sender_id": 456,
      "content": "Hello, world!",
      "timestamp": "2026-01-09T12:00:00Z"
    }
  }
  ```

## 6. 部署

### 6.1 前端 (Vercel)

前端通过与GitHub仓库集成实现自动部署。

**流程:**
1. 推送代码到`main`分支。
2. Vercel自动触发构建和部署。

**配置文件**: `vercel.json`
- `buildCommand`: `cd frontend && npm install && npm run build`
- `outputDirectory`: `frontend/dist`
- `rewrites`: 配置API代理到AWS后端。

### 6.2 后端 (AWS EC2)

后端部署在AWS EC2上，使用systemd管理服务。

**部署脚本**: `backend-go/deploy.sh`

**主要步骤:**
1. SSH连接到服务器。
2. 拉取最新代码: `git pull`。
3. 编译Go应用: `go build`。
4. 重启systemd服务: `sudo systemctl restart dchat-api-go dchat-websocket-go`。

**Nginx配置:**
- 配置文件: `/etc/nginx/sites-enabled/dchat`
- 功能: SSL终止、反向代理到Go服务。

## 7. 代码规范

- **命名**: 使用驼峰命名法 (camelCase for JS, PascalCase for Go)。
- **注释**: 为复杂逻辑添加清晰的注释。
- **测试**: 为核心功能编写单元测试和集成测试。
- **Git**: 遵循`Conventional Commits`规范提交代码。

## 8. 贡献

欢迎为dChat贡献代码！请遵循以下流程：
1. Fork本仓库。
2. 创建一个新的功能分支: `git checkout -b feature/your-feature`。
3. 提交你的修改: `git commit -m 'feat: add new feature'`。
4. 推送到你的分支: `git push origin feature/your-feature`。
5. 创建一个Pull Request。
