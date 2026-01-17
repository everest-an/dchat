# Design Document

## Overview

本设计文档描述了 Dchat 商务档案管理和 Privado ID 身份验证功能的技术实现方案。

### 架构概述

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  ProfileEditDialog  │  LinkedInConnect  │  VerificationManager  │
│         ↓                    ↓                    ↓              │
│    apiClient.js      linkedInService.js   PrivadoIDService.js   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                     Backend API (Node.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  /api/profile/*     │  /api/linkedin/*  │  /api/verifications/* │
│         ↓                    ↓                    ↓              │
│   profileController   linkedInAuth.js    verificationController │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase (PostgreSQL)                     │
├─────────────────────────────────────────────────────────────────┤
│  user_profiles  │  user_verifications  │  linkedin_connections  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     External Services                            │
├─────────────────────────────────────────────────────────────────┤
│     LinkedIn OAuth 2.0      │      Privado ID Verifier          │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### user_business_info 表
```sql
CREATE TABLE user_business_info (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255),
  job_title VARCHAR(255),
  industry VARCHAR(100),
  bio TEXT,
  company_logo_url VARCHAR(500),
  website VARCHAR(255),
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### user_verifications 表
```sql
CREATE TABLE user_verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL, -- 'kyc_humanity', 'kyc_age', 'kyc_country', 'kyb_registration', 'kyb_tax_id', 'kyb_license'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'expired', 'revoked'
  issuer_did VARCHAR(255),
  credential_id VARCHAR(255),
  proof_hash VARCHAR(255),
  verified_at TIMESTAMP,
  expires_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_verifications_user_id ON user_verifications(user_id);
CREATE INDEX idx_user_verifications_type ON user_verifications(verification_type);
```

### linkedin_connections 表
```sql
CREATE TABLE linkedin_connections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  linkedin_id VARCHAR(100) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  profile_data JSONB,
  connected_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
```

## API Design

### 1. Business Info API

#### GET /api/profile/business
获取用户商务信息

**Response:**
```json
{
  "success": true,
  "data": {
    "company_name": "Acme Corp",
    "job_title": "Software Engineer",
    "industry": "Technology",
    "bio": "Building the future...",
    "company_logo_url": "https://...",
    "website": "https://acme.com",
    "location": "San Francisco, CA"
  }
}
```

#### PUT /api/profile/business
更新用户商务信息

**Request:**
```json
{
  "company_name": "Acme Corp",
  "job_title": "Senior Engineer",
  "industry": "Technology",
  "bio": "Updated bio...",
  "website": "https://acme.com",
  "location": "San Francisco, CA"
}
```

### 2. Verification API

#### GET /api/verifications/types
获取可用的验证类型

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "kyc_humanity",
      "label": "Humanity Verification",
      "description": "Prove you are a real human",
      "schema": "https://schema.privado.id/humanity-v1"
    },
    {
      "type": "kyc_age",
      "label": "Age Verification",
      "description": "Prove you are over 18",
      "schema": "https://schema.privado.id/age-v1"
    },
    {
      "type": "kyb_registration",
      "label": "Company Registration",
      "description": "Verify company registration",
      "schema": "https://schema.privado.id/company-v1"
    }
  ]
}
```

#### POST /api/verifications/request
创建验证请求（生成 QR 码）

**Request:**
```json
{
  "type": "kyc_humanity",
  "callback_url": "https://dchat.pro/api/verifications/callback"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "request_id": "req_abc123",
    "qr_code_data": "iden3comm://...",
    "qr_code_image": "data:image/png;base64,...",
    "deep_link": "https://wallet.privado.id/verify?request=...",
    "expires_at": "2025-01-17T12:00:00Z"
  }
}
```

#### POST /api/verifications/callback
Privado ID 钱包回调（接收 ZKP 证明）

**Request (from Privado ID):**
```json
{
  "request_id": "req_abc123",
  "proof": {
    "pi_a": [...],
    "pi_b": [...],
    "pi_c": [...],
    "protocol": "groth16"
  },
  "pub_signals": [...],
  "credential": {
    "issuer_did": "did:polygonid:...",
    "credential_type": "HumanityCredential"
  }
}
```

#### GET /api/verifications/user/:userId
获取用户的所有验证

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "verification_type": "kyc_humanity",
      "status": "active",
      "issuer_did": "did:polygonid:...",
      "verified_at": "2025-01-15T10:00:00Z",
      "expires_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

#### DELETE /api/verifications/:id
删除验证记录

### 3. LinkedIn Integration API

现有的 `/api/auth/linkedin/*` 路由已实现，需要：
1. 将 LinkedIn profile 数据同步到 `user_business_info`
2. 存储 token 到 `linkedin_connections` 表

#### POST /api/linkedin/sync-profile
同步 LinkedIn 数据到用户档案

**Request:**
```json
{
  "import_fields": ["name", "headline", "company", "position"]
}
```

## Component Design

### 1. ProfileEditDialog 增强

```jsx
// 新增 Business Info Tab
const tabs = ['projects', 'skills', 'resources', 'seeking', 'business'];

// Business Info 表单
<BusinessInfoForm
  data={businessInfo}
  onSave={handleSaveBusinessInfo}
  loading={saving}
/>
```

### 2. VerificationManager 后端连接

```jsx
// 修改 PrivadoIDService 使用正确的 API
const API_BASE = process.env.REACT_APP_API_URL || 'https://backend-op1c06n9l-everest-ans-projects.vercel.app';

// 添加 Demo 模式回退
async getUserVerifications(userId) {
  try {
    const response = await apiClient.get(`/verifications/user/${userId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 503) {
      return this.getDemoVerifications();
    }
    throw error;
  }
}
```

### 3. Privado ID 集成流程

```
用户点击 "Add Verification"
        ↓
前端调用 POST /api/verifications/request
        ↓
后端生成验证请求，返回 QR 码
        ↓
用户使用 Privado ID 钱包扫描 QR 码
        ↓
钱包生成 ZKP 证明，发送到回调 URL
        ↓
后端验证证明，更新数据库
        ↓
前端轮询或 WebSocket 获取验证状态
        ↓
显示验证徽章
```

## Security Considerations

1. **JWT 认证**: 所有 API 需要有效的 JWT token
2. **ZKP 验证**: 使用 Privado ID SDK 验证零知识证明
3. **Rate Limiting**: 验证请求限制 10 次/分钟
4. **HTTPS Only**: 所有通信必须使用 HTTPS
5. **Token 加密**: LinkedIn tokens 在数据库中加密存储

## Error Handling

### 前端 Demo 模式回退

当后端不可用时，前端应：
1. 显示 Demo 模式横幅
2. 使用本地存储保存数据
3. 在后端恢复后自动同步

```javascript
const handleApiError = async (error, fallbackFn) => {
  if (error.response?.status === 503 || !error.response) {
    console.warn('Backend unavailable, using demo mode');
    setDemoMode(true);
    return fallbackFn();
  }
  throw error;
};
```

## Implementation Priority

1. **Phase 1**: 修复 ProfileEditDialog API URL，添加 Business Info 表单
2. **Phase 2**: 实现后端 verification routes
3. **Phase 3**: 连接 VerificationManager 到后端
4. **Phase 4**: LinkedIn profile 同步功能
5. **Phase 5**: 验证徽章在聊天中显示
