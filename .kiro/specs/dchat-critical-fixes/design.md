# Design Document: Dchat Critical Fixes

## Overview

本设计文档描述了修复 dchat.pro 关键功能的技术方案。主要修复以下问题：
1. 钱包登录失败 - 后端认证服务不可用
2. 验证码登录失败 - API 返回 503 错误
3. 聊天功能不可用 - WebSocket 未连接，使用模拟数据
4. 后端 API 降级模式 - authController 加载失败

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Vercel)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ LoginScreen │  │ ChatRoom    │  │ Web3Context             │  │
│  │             │  │             │  │ (Wallet State)          │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│  ┌──────▼──────────────────────────────────────▼─────────────┐  │
│  │              API Client / Socket Service                   │  │
│  └──────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Vercel Serverless)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Auth API    │  │ Messages    │  │ Socket.IO Server        │  │
│  │ (Node.js)   │  │ API (Flask) │  │ (Python)                │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│  ┌──────▼────────────────▼──────────────────────▼─────────────┐  │
│  │                    Supabase (PostgreSQL)                    │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Frontend Components

#### 1.1 LoginScreen.jsx (修复)
- 移除硬编码的模拟验证码 `123456`
- 添加真实后端 API 调用
- 添加错误处理和重试逻辑
- 添加离线演示模式支持

```javascript
// 修复后的登录流程
const handleSendCode = async () => {
  try {
    const response = await apiCall(API_ENDPOINTS.SEND_CODE, {
      method: 'POST',
      body: JSON.stringify({ identifier: phone, type: 'phone' })
    });
    if (response.success) {
      setIsCodeSent(true);
      // 开发模式下显示验证码
      if (response.code) {
        console.log('Dev mode code:', response.code);
      }
    }
  } catch (error) {
    setError(error.message);
    // 启用演示模式
    enableDemoMode();
  }
};
```

#### 1.2 Web3Context.jsx (修复)
- 修复钱包认证流程
- 添加后端不可用时的降级处理
- 改进错误消息

```javascript
// 修复后的钱包连接
const connectWallet = async () => {
  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });
    
    // 尝试后端认证
    try {
      const authResult = await web3AuthService.authenticateWallet(
        accounts[0],
        signMessageFn
      );
      setIsAuthenticated(true);
      setUser(authResult.user);
    } catch (authError) {
      // 后端不可用，启用本地模式
      console.warn('Backend auth failed, using local mode');
      setIsAuthenticated(true);
      setUser({ walletAddress: accounts[0], loginMethod: 'wallet-local' });
    }
    
    return accounts[0];
  } catch (err) {
    setError(err.message);
    return null;
  }
};
```

#### 1.3 ChatInterface.jsx (修复)
- 连接真实 WebSocket 服务
- 添加消息持久化
- 添加离线消息队列

### 2. Backend Components

#### 2.1 api/index.js (修复)
- 修复 authController 加载错误
- 添加更好的错误处理
- 确保所有依赖正确安装

```javascript
// 修复后的 API 入口
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 加载认证路由
const authController = require('../src/controllers/authController');
app.post('/api/auth/send-code', authController.sendVerificationCode);
app.post('/api/auth/verify-code', authController.verifyCode);
app.post('/api/auth/wallet-login', authController.walletLogin);
app.post('/api/auth/register', authController.registerWithPassword);
app.post('/api/auth/login', authController.loginWithPassword);

module.exports = app;
```

#### 2.2 Supabase 配置 (验证)
- 确保环境变量正确配置
- 验证数据库表结构
- 添加连接测试

### 3. API Endpoints

| Endpoint | Method | Description | Request | Response |
|----------|--------|-------------|---------|----------|
| /health | GET | 健康检查 | - | `{status: 'ok'}` |
| /api/auth/send-code | POST | 发送验证码 | `{identifier, type}` | `{success, code?}` |
| /api/auth/verify-code | POST | 验证并登录 | `{identifier, code, type}` | `{success, token, user}` |
| /api/auth/wallet-login | POST | 钱包登录 | `{walletAddress, signature}` | `{success, token, user}` |
| /api/auth/register | POST | 邮箱注册 | `{email, password}` | `{success, token, user}` |
| /api/auth/login | POST | 邮箱登录 | `{email, password}` | `{success, token, user}` |

## Data Models

### User Model (Supabase)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255),
  wallet_address VARCHAR(42) UNIQUE,
  encrypted_wallet TEXT,
  display_name VARCHAR(100),
  login_method VARCHAR(20),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
```

### Verification Codes Model
```sql
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  type VARCHAR(20) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Wallet Connection State Consistency
*For any* wallet connection attempt, if window.ethereum.request succeeds with accounts, then Web3Context.account SHALL equal accounts[0]
**Validates: Requirements 1.1, 1.2**

### Property 2: Authentication Token Storage
*For any* successful login (wallet, email, or phone), the returned JWT token SHALL be stored in localStorage under 'authToken' key
**Validates: Requirements 1.8, 2.8**

### Property 3: Verification Code Format
*For any* generated verification code, the code SHALL be exactly 6 numeric digits
**Validates: Requirements 2.2**

### Property 4: Verification Code Expiry
*For any* stored verification code, the expires_at timestamp SHALL be exactly 10 minutes after created_at
**Validates: Requirements 2.3**

### Property 5: API Authorization Header
*For any* authenticated API request, the Authorization header SHALL contain "Bearer " followed by the stored JWT token
**Validates: Requirements 5.2**

### Property 6: WebSocket Authentication
*For any* WebSocket connection after login, the authenticate event SHALL be emitted with the current user ID
**Validates: Requirements 3.1, 3.2**

### Property 7: Message Delivery
*For any* message sent via WebSocket, the message SHALL be received by all users in the same room
**Validates: Requirements 3.4, 3.5, 3.6**

### Property 8: Demo Mode Fallback
*For any* API call that fails with network error or 503 status, the frontend SHALL enable demo mode
**Validates: Requirements 1.9, 6.1**

### Property 9: Error Message Display
*For any* failed API call, the frontend SHALL display a user-friendly error message (not raw error)
**Validates: Requirements 1.4, 5.3**

### Property 10: Custodial Wallet Generation
*For any* new user created via email/phone login, a valid Ethereum wallet address SHALL be generated and stored
**Validates: Requirements 2.10**

## Error Handling

### Frontend Error Handling
1. **Network Errors**: 显示 "网络连接失败，请检查网络" 并启用演示模式
2. **API 503 Errors**: 显示 "服务暂时不可用" 并启用演示模式
3. **Authentication Errors**: 显示具体错误信息并允许重试
4. **Wallet Errors**: 显示 MetaMask 错误信息并提供安装链接

### Backend Error Handling
1. **Database Errors**: 记录日志并返回 500 状态码
2. **Validation Errors**: 返回 400 状态码和具体错误信息
3. **Authentication Errors**: 返回 401 状态码
4. **Not Found Errors**: 返回 404 状态码

## Testing Strategy

### Unit Tests
- 测试验证码生成函数
- 测试 JWT token 生成和验证
- 测试钱包地址验证
- 测试 API 响应格式

### Integration Tests
- 测试完整登录流程
- 测试 WebSocket 消息传递
- 测试数据库操作

### Property-Based Tests
- 使用 fast-check 库进行属性测试
- 每个属性测试运行 100+ 次迭代
- 测试标签格式: **Feature: dchat-critical-fixes, Property N: description**

### E2E Tests
- 测试钱包连接到登录完整流程
- 测试验证码登录完整流程
- 测试聊天消息发送和接收
