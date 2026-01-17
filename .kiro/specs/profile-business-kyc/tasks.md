# Implementation Tasks

## Task 1: 修复 ProfileEditDialog API URL 和添加 Demo 模式

### Description
修复 ProfileEditDialog 组件使用正确的后端 API URL，并添加 Demo 模式回退。

### Files to Modify
- `frontend/src/components/ProfileEditDialog.jsx`

### Implementation Details
1. 更新 API_BASE 使用环境变量
2. 添加 Demo 模式状态和回退逻辑
3. 添加 Demo 模式横幅显示
4. 本地存储数据同步

### Acceptance Criteria
- [x] API URL 使用 `VITE_API_URL` 环境变量
- [x] 后端不可用时自动切换到 Demo 模式
- [x] Demo 模式下数据保存到 localStorage
- [x] 显示 Demo 模式提示横幅

---

## Task 2: 添加 Business Info Tab 到 ProfileEditDialog

### Description
在 ProfileEditDialog 中添加商务信息编辑 Tab。

### Files to Modify
- `frontend/src/components/ProfileEditDialog.jsx`

### Implementation Details
1. 添加 'business' tab
2. 创建 BusinessInfoForm 组件
3. 实现商务信息 CRUD 操作
4. 添加公司 logo 上传功能

### Acceptance Criteria
- [x] Business tab 显示在 tabs 列表中
- [x] 可编辑公司名称、职位、行业、简介
- [x] 保存成功显示通知
- [x] Demo 模式下保存到 localStorage

---

## Task 3: 创建后端 Verification Routes

### Description
创建 Privado ID 验证相关的后端 API 路由。

### Files to Create
- `backend/src/controllers/verificationController.js`

### Implementation Details
1. GET /api/verifications/types - 获取验证类型
2. POST /api/verifications/request - 创建验证请求
3. POST /api/verifications/callback - 接收 ZKP 证明
4. GET /api/verifications/user/:userId - 获取用户验证
5. DELETE /api/verifications/:id - 删除验证

### Acceptance Criteria
- [x] 所有路由需要 JWT 认证
- [x] 验证类型返回正确的 schema
- [x] 验证请求生成 QR 码数据
- [x] 回调正确处理 ZKP 证明

---

## Task 4: 创建数据库表

### Description
创建商务信息和验证相关的数据库表。

### Files to Modify
- `backend/src/scripts/init-supabase.sql`

### Implementation Details
1. 创建 user_business_info 表
2. 创建 user_verifications 表
3. 创建 linkedin_connections 表
4. 添加必要的索引

### Acceptance Criteria
- [x] 表结构符合设计文档
- [x] 外键约束正确设置
- [x] 索引优化查询性能

---

## Task 5: 连接 VerificationManager 到后端

### Description
更新 VerificationManager 组件使用真实后端 API。

### Files to Modify
- `frontend/src/services/privadoid/PrivadoIDService.js`

### Implementation Details
1. 更新 PrivadoIDService 使用正确的 API URL
2. 添加 Demo 模式回退
3. 实现 QR 码显示和轮询状态
4. 添加验证成功/失败处理

### Acceptance Criteria
- [x] 正确调用后端 API
- [x] Demo 模式下显示模拟数据
- [ ] QR 码正确显示 (需要 VerificationRequestDialog 更新)
- [ ] 验证状态实时更新 (需要 WebSocket 或轮询)

---

## Task 6: 实现 LinkedIn Profile 同步

### Description
实现 LinkedIn 数据同步到用户商务档案。

### Files to Modify
- `frontend/src/components/LinkedInConnect.jsx`
- `backend/src/controllers/profileController.js`

### Implementation Details
1. 添加 "Import to Profile" 按钮
2. 创建 /api/linkedin/sync-profile 端点
3. 将 LinkedIn 数据写入 user_business_info

### Acceptance Criteria
- [x] 后端 sync-profile 端点已创建
- [ ] LinkedIn 连接后可导入数据 (需要前端更新)
- [ ] 用户可选择导入哪些字段
- [ ] 导入成功更新 ProfileEditDialog

---

## Task 7: 验证徽章显示

### Description
在用户档案和聊天中显示验证徽章。

### Files to Modify
- `frontend/src/components/Profile.jsx`
- `frontend/src/components/ChatInterface.jsx`
- `frontend/src/components/PrivadoID/VerificationBadge.jsx`

### Implementation Details
1. 在 Profile 页面显示验证徽章
2. 在聊天消息旁显示徽章
3. 点击徽章显示详情

### Acceptance Criteria
- [ ] KYC 和 KYB 徽章样式不同
- [ ] 点击显示验证详情
- [ ] 过期徽章自动隐藏

---

## Task 8: 注册后端路由到 API

### Description
将新创建的路由注册到主 API 入口。

### Files to Modify
- `backend/api/index.js`

### Implementation Details
1. 导入 verificationController
2. 注册 /api/verifications/* 路由
3. 注册 /api/profile/business 路由

### Acceptance Criteria
- [x] 所有新路由可访问
- [x] 错误处理正确
- [x] 降级模式正常工作
