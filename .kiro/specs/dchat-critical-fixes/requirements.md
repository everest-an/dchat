# Requirements Document

## Introduction

本文档定义了 Dchat.pro 线上关键功能修复的需求。当前 dchat.pro 存在多个核心功能不可用的问题，包括钱包登录、验证码登录、聊天功能等。本修复计划旨在使这些功能正常工作。

## Glossary

- **Frontend**: React + Vite 构建的 Web 前端应用
- **Backend**: Node.js/Express + Python/Flask 混合后端服务
- **Supabase**: 后端数据库服务 (PostgreSQL)
- **Web3Context**: 前端钱包连接状态管理
- **SocketService**: 前端 WebSocket 实时通信服务
- **AuthController**: 后端认证控制器

## Requirements

### Requirement 1: 钱包登录功能修复

**User Story:** As a Web3 user, I want to connect my MetaMask wallet and login, so that I can use Dchat with my blockchain identity.

#### Acceptance Criteria

1. WHEN a user clicks "Connect MetaMask" button, THE Frontend SHALL request wallet connection via window.ethereum
2. WHEN wallet connection succeeds, THE Web3Context SHALL obtain the user's wallet address
3. WHEN wallet address is obtained, THE Frontend SHALL request a nonce from Backend for signature
4. IF Backend nonce request fails, THEN THE Frontend SHALL display an error message and allow retry
5. WHEN nonce is received, THE Frontend SHALL prompt user to sign the message with their wallet
6. WHEN signature is obtained, THE Frontend SHALL send wallet address and signature to Backend for verification
7. WHEN Backend verifies signature successfully, THE Backend SHALL return JWT token and user data
8. WHEN JWT token is received, THE Frontend SHALL store token and redirect user to main app
9. IF Backend is unavailable, THEN THE Frontend SHALL provide offline demo mode with mock data

### Requirement 2: 邮箱/手机验证码登录修复

**User Story:** As a Web2 user, I want to login with my email or phone number using verification code, so that I can use Dchat without a crypto wallet.

#### Acceptance Criteria

1. WHEN a user enters email/phone and clicks "Get Code", THE Frontend SHALL call Backend send-code API
2. WHEN Backend receives send-code request, THE Backend SHALL generate 6-digit verification code
3. WHEN verification code is generated, THE Backend SHALL store code in Supabase with 10-minute expiry
4. WHEN code is stored, THE Backend SHALL return success response (and code in dev mode)
5. IF email service is not configured, THEN THE Backend SHALL return code in response for testing
6. WHEN user enters verification code and submits, THE Frontend SHALL call Backend verify-code API
7. WHEN Backend receives verify request, THE Backend SHALL validate code against Supabase records
8. IF code is valid and not expired, THEN THE Backend SHALL create/retrieve user and return JWT token
9. IF code is invalid or expired, THEN THE Backend SHALL return appropriate error message
10. WHEN new user is created, THE Backend SHALL auto-generate a custodial wallet for the user

### Requirement 3: 聊天功能修复

**User Story:** As a logged-in user, I want to send and receive messages in real-time, so that I can communicate with other users.

#### Acceptance Criteria

1. WHEN user logs in successfully, THE Frontend SHALL connect to WebSocket server
2. WHEN WebSocket connection is established, THE SocketService SHALL authenticate with user ID
3. WHEN user opens a conversation, THE Frontend SHALL load message history from Backend API
4. WHEN user sends a message, THE Frontend SHALL emit message via WebSocket
5. WHEN WebSocket server receives message, THE Backend SHALL broadcast to recipient
6. WHEN recipient receives message, THE Frontend SHALL display it in real-time
7. IF WebSocket connection fails, THEN THE Frontend SHALL fall back to polling or show offline mode
8. WHEN user is typing, THE Frontend SHALL emit typing indicator via WebSocket
9. WHEN message is delivered/read, THE Backend SHALL emit status update via WebSocket

### Requirement 4: 后端 API 服务修复

**User Story:** As a system administrator, I want the backend API to be fully functional, so that all frontend features work correctly.

#### Acceptance Criteria

1. THE Backend SHALL successfully load authController without errors
2. THE Backend SHALL connect to Supabase database on startup
3. WHEN /health endpoint is called, THE Backend SHALL return status "ok"
4. WHEN /api/auth/* endpoints are called, THE Backend SHALL process requests (not return 503)
5. THE Backend SHALL have proper CORS configuration for dchat.pro domain
6. THE Backend SHALL have proper environment variables configured in Vercel
7. IF database connection fails, THEN THE Backend SHALL log error and return appropriate response

### Requirement 5: 前端 API 配置修复

**User Story:** As a developer, I want the frontend to correctly call backend APIs, so that authentication and data flow work properly.

#### Acceptance Criteria

1. THE Frontend SHALL use correct Backend API URL from environment variables
2. THE Frontend SHALL include JWT token in Authorization header for authenticated requests
3. WHEN API call fails, THE Frontend SHALL display user-friendly error message
4. THE Frontend SHALL handle network errors gracefully with retry logic
5. THE Frontend SHALL support both production and development API endpoints

### Requirement 6: 离线/演示模式

**User Story:** As a demo user, I want to try Dchat features even when backend is unavailable, so that I can evaluate the product.

#### Acceptance Criteria

1. IF Backend is unavailable, THEN THE Frontend SHALL detect and enable demo mode
2. WHEN demo mode is active, THE Frontend SHALL use mock data for conversations
3. WHEN demo mode is active, THE Frontend SHALL allow local-only message sending
4. THE Frontend SHALL clearly indicate when running in demo mode
5. WHEN Backend becomes available, THE Frontend SHALL offer to switch to live mode
