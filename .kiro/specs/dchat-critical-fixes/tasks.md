# Implementation Plan: Dchat Critical Fixes

## Overview

本实现计划将修复 dchat.pro 的关键功能问题，按优先级分为以下阶段：
1. P0 - 后端 API 修复（使服务可用）
2. P1 - 登录功能修复（钱包、验证码）
3. P2 - 聊天功能修复（WebSocket、消息）
4. P3 - 演示模式和错误处理优化

## Tasks

- [x] 1. 修复后端 API 服务
  - [x] 1.1 修复 backend/api/index.js 中的 authController 加载问题
    - 检查依赖是否正确安装
    - 修复 require 路径
    - 添加错误日志
    - _Requirements: 4.1, 4.4_
  - [x] 1.2 验证 Supabase 连接配置
    - 检查环境变量 SUPABASE_URL 和 SUPABASE_ANON_KEY
    - 测试数据库连接
    - _Requirements: 4.2_
  - [x] 1.3 添加后端健康检查增强
    - 添加数据库连接状态检查
    - 添加依赖加载状态检查
    - _Requirements: 4.3, 4.7_
  - [x] 1.4 配置 CORS 允许 dchat.pro 域名
    - 更新 CORS 配置
    - 测试跨域请求
    - _Requirements: 4.5_

- [ ] 2. Checkpoint - 验证后端 API 可用
  - 确保 /health 返回 ok
  - 确保 /api/auth/* 不返回 503
  - 如有问题请询问用户

- [x] 3. 修复钱包登录功能
  - [x] 3.1 修复 Web3Context.jsx 中的认证流程
    - 添加后端不可用时的降级处理
    - 改进错误消息显示
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 3.2 修复 web3AuthService.js 中的 API 调用
    - 使用正确的 API 端点
    - 添加重试逻辑
    - _Requirements: 1.5, 1.6, 1.7_
  - [x] 3.3 修复 LoginScreen.jsx 钱包登录按钮
    - 连接到 Web3Context
    - 处理登录成功后的跳转
    - _Requirements: 1.8_
  - [ ]* 3.4 编写钱包登录属性测试
    - **Property 1: Wallet Connection State Consistency**
    - **Property 2: Authentication Token Storage**
    - **Validates: Requirements 1.1, 1.2, 1.8**

- [x] 4. 修复验证码登录功能
  - [x] 4.1 修复 LoginScreen.jsx 中的验证码发送
    - 移除硬编码的模拟验证码
    - 调用真实后端 API
    - _Requirements: 2.1, 2.4, 2.5_
  - [x] 4.2 修复 LoginScreen.jsx 中的验证码验证
    - 调用真实后端验证 API
    - 处理验证成功后的登录
    - _Requirements: 2.6, 2.7, 2.8, 2.9_
  - [x] 4.3 修复 EmailPasswordLogin.jsx 组件
    - 连接到后端注册/登录 API
    - 添加表单验证
    - _Requirements: 2.1, 2.8_
  - [ ]* 4.4 编写验证码属性测试
    - **Property 3: Verification Code Format**
    - **Property 4: Verification Code Expiry**
    - **Validates: Requirements 2.2, 2.3**

- [ ] 5. Checkpoint - 验证登录功能
  - 测试钱包登录流程
  - 测试验证码登录流程
  - 如有问题请询问用户

- [x] 6. 修复聊天功能
  - [x] 6.1 修复 socketService.js 连接配置
    - 使用正确的 WebSocket 服务器地址
    - 添加连接状态监控
    - 添加 isEncrypted 参数支持
    - _Requirements: 3.1, 3.2_
  - [x] 6.2 修复 ChatInterface.jsx 消息加载
    - 从后端 API 加载消息历史
    - 移除硬编码的模拟数据
    - _Requirements: 3.3_
  - [x] 6.3 修复 ChatRoom.jsx 实时消息
    - 连接 WebSocket 发送消息
    - 处理接收消息显示
    - 修复自己和自己聊天的逻辑（与 file-helper 相同处理）
    - _Requirements: 3.4, 3.5, 3.6_
  - [x] 6.4 添加消息状态指示器
    - 显示发送中/已发送/已读状态
    - 显示打字指示器
    - _Requirements: 3.8, 3.9_
  - [x] 6.5 创建统一用户数据服务
    - 创建 UnifiedUserService.js 统一管理用户数据
    - 创建 UserAvatar.jsx 统一头像组件
    - 更新 ChatRoom.jsx 使用统一服务
    - 更新 ChatList.jsx 使用统一服务
    - _Requirements: 用户头像/名字一致性_
  - [ ]* 6.6 编写聊天功能属性测试
    - **Property 6: WebSocket Authentication**
    - **Property 7: Message Delivery**
    - **Validates: Requirements 3.1, 3.2, 3.4, 3.5, 3.6**

- [ ] 7. 添加演示模式和错误处理
  - [ ] 7.1 创建 DemoModeContext 上下文
    - 检测后端可用性
    - 管理演示模式状态
    - _Requirements: 6.1_
  - [ ] 7.2 添加演示模式数据
    - 创建模拟对话数据
    - 创建模拟消息数据
    - _Requirements: 6.2, 6.3_
  - [ ] 7.3 添加演示模式 UI 指示器
    - 显示演示模式横幅
    - 添加切换到在线模式按钮
    - _Requirements: 6.4, 6.5_
  - [ ] 7.4 改进错误处理和用户提示
    - 统一错误消息格式
    - 添加重试按钮
    - _Requirements: 5.3, 5.4_
  - [ ]* 7.5 编写演示模式属性测试
    - **Property 8: Demo Mode Fallback**
    - **Property 9: Error Message Display**
    - **Validates: Requirements 1.9, 5.3, 6.1**

- [x] 8. 修复前端 API 配置
  - [x] 8.1 统一 API 端点配置
    - 更新 frontend/src/config/api.js
    - 确保使用正确的后端 URL
    - _Requirements: 5.1_
  - [x] 8.2 修复 API 请求头
    - 确保 Authorization header 正确添加
    - 添加 Content-Type header
    - _Requirements: 5.2_
  - [x] 8.3 添加环境变量支持
    - 支持 VITE_API_URL 环境变量
    - 支持开发/生产环境切换
    - _Requirements: 5.5_
  - [ ]* 8.4 编写 API 配置属性测试
    - **Property 5: API Authorization Header**
    - **Validates: Requirements 5.2**

- [ ] 9. Final Checkpoint - 完整功能测试
  - 测试所有登录方式
  - 测试聊天功能
  - 测试演示模式
  - 确保所有测试通过，如有问题请询问用户

- [ ] 10. 部署和验证
  - [~] 10.1 提交代码到 GitHub
    - git add, commit 已完成
    - git push 需要重试（网络问题）
    - _Requirements: All_
  - [ ] 10.2 触发 Vercel 重新部署
    - 前端自动部署
    - 后端自动部署
    - _Requirements: All_
  - [ ] 10.3 验证线上功能
    - 访问 dchat.pro 测试
    - 验证所有功能正常
    - _Requirements: All_

## Notes

- Tasks marked with `*` are optional property-based tests
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- 优先修复后端 API，因为这是所有功能的基础
