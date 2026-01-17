# Implementation Plan: Whitepaper P0 Features

## Overview

本实现计划将白皮书 P0 核心功能分解为可执行的开发任务。实现顺序按照依赖关系排列：先实现基础服务（加密、公钥管理），再实现依赖这些服务的功能（IPFS 文件传输、聊天集成），最后实现高级功能（机会匹配、隐私控制）。

## Tasks

- [-] 1. 公钥管理系统
  - [x] 1.1 创建后端公钥控制器和 API 路由
    - 创建 `backend/src/controllers/publicKeyController.js`
    - 实现 registerPublicKey, getPublicKeyByAddress, getPublicKeyByUserId, rotateKey, getKeyHistory 方法
    - 创建 `backend/src/routes/publicKey.js` 路由文件
    - 在 `backend/api/index.js` 注册路由
    - _Requirements: 2.1, 2.2, 2.3, 2.7, 2.8_

  - [x] 1.2 创建数据库表结构
    - 在 `backend/src/scripts/init-supabase.sql` 添加 public_keys 表
    - 添加 public_key_history 表
    - 添加索引优化查询性能
    - _Requirements: 2.5_

  - [x] 1.3 增强前端 KeyManagementService
    - 修改 `frontend/src/services/KeyManagementService.js`
    - 添加 registerPublicKeyToBackend 方法
    - 添加 fetchPublicKeyFromBackend 方法
    - 添加本地缓存机制
    - _Requirements: 2.6, 2.9_

  - [-] 1.4 编写公钥管理属性测试
    - **Property 3: 公钥存储检索一致性**
    - **Property 4: 密钥格式验证**
    - **Property 5: 密钥轮换历史保留**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.7, 2.8**

- [ ] 2. 端到端加密系统增强
  - [ ] 2.1 增强 EncryptionService 添加签名功能
    - 修改 `frontend/src/services/EncryptionService.js`
    - 添加 signMessage 方法 (RSASSA-PKCS1-v1_5)
    - 添加 verifySignature 方法
    - 添加 createMessageEnvelope 方法
    - 添加 openMessageEnvelope 方法
    - _Requirements: 1.6, 1.7, 1.8_

  - [ ] 2.2 用户登录时自动初始化密钥
    - 修改 `frontend/src/contexts/Web3Context.jsx`
    - 在钱包连接成功后调用 KeyManagementService.initializeKeys
    - 将公钥注册到后端
    - 修改 `frontend/src/components/EmailPasswordLogin.jsx` 同样处理
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 2.3 集成加密到 ChatRoom 发送消息流程
    - 修改 `frontend/src/components/ChatRoom.jsx`
    - 发送消息前获取接收者公钥
    - 使用 createMessageEnvelope 加密消息
    - 处理公钥未找到的错误情况
    - _Requirements: 1.4, 1.5, 1.11_

  - [ ] 2.4 集成解密到 ChatRoom 接收消息流程
    - 修改 `frontend/src/components/ChatRoom.jsx`
    - 接收消息时验证签名
    - 使用 openMessageEnvelope 解密消息
    - 显示签名验证状态（警告图标）
    - _Requirements: 1.8, 1.9, 1.10_

  - [ ] 2.5 编写加密系统属性测试
    - **Property 1: 加密解密往返一致性**
    - **Property 2: 签名验证正确性**
    - **Validates: Requirements 1.5, 1.6, 1.8, 1.9**

- [ ] 3. Checkpoint - 加密系统验证
  - 确保所有测试通过
  - 验证消息加密解密流程正常工作
  - 如有问题请询问用户

- [ ] 4. IPFS 文件传输增强
  - [ ] 4.1 增强 IPFSService 添加加密文件功能
    - 修改 `frontend/src/services/IPFSService.js`
    - 添加 uploadEncryptedFile 方法
    - 添加 downloadDecryptedFile 方法
    - 添加 generateThumbnail 方法
    - 添加文件大小和类型验证
    - _Requirements: 3.1, 3.2, 3.3, 3.7, 3.8, 3.12_

  - [ ] 4.2 创建 FileMessage 组件
    - 创建 `frontend/src/components/FileMessage.jsx`
    - 显示文件预览（图片缩略图）
    - 显示文件信息（名称、大小、类型）
    - 添加下载按钮和进度显示
    - _Requirements: 3.6, 3.9_

  - [ ] 4.3 集成文件发送到 ChatRoom
    - 修改 `frontend/src/components/ChatRoom.jsx`
    - 启用文件选择按钮
    - 调用 IPFSService.uploadEncryptedFile
    - 发送包含 CID 的文件消息
    - 显示上传进度
    - _Requirements: 3.4, 3.5, 3.10_

  - [ ] 4.4 集成文件接收到 ChatRoom
    - 修改 `frontend/src/components/ChatRoom.jsx`
    - 识别文件类型消息
    - 渲染 FileMessage 组件
    - 处理下载和解密
    - _Requirements: 3.7, 3.8, 3.11_

  - [ ] 4.5 编写 IPFS 文件传输属性测试
    - **Property 6: 文件加密解密往返一致性**
    - **Property 7: 文件大小验证**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.7, 3.8**

- [ ] 5. Checkpoint - 文件传输验证
  - 确保所有测试通过
  - 验证文件上传下载流程正常工作
  - 如有问题请询问用户

- [ ] 6. 细粒度隐私控制
  - [ ] 6.1 创建后端隐私控制器
    - 创建 `backend/src/controllers/privacyController.js`
    - 实现 getPrivacySettings, updateFieldPrivacy, setConnectionTier 方法
    - 实现 getFilteredProfile 方法（根据隐私设置过滤资料）
    - 创建 `backend/src/routes/privacy.js` 路由文件
    - _Requirements: 5.2, 5.3, 5.4, 5.6, 5.7_

  - [ ] 6.2 创建隐私设置数据库表
    - 在 `backend/src/scripts/init-supabase.sql` 添加 privacy_settings 表
    - 添加 connection_tiers 表
    - 添加 connection_groups 表
    - _Requirements: 5.2, 5.6_

  - [ ] 6.3 创建前端 PrivacyService
    - 创建 `frontend/src/services/PrivacyService.js`
    - 实现 getPrivacySettings, updateFieldPrivacy, setConnectionTier 方法
    - 实现 getFilteredProfile 方法
    - _Requirements: 5.3, 5.7_

  - [ ] 6.4 创建 PrivacySettings 组件
    - 创建 `frontend/src/components/PrivacySettings.jsx`
    - 显示 4 级隐私选项
    - 支持字段级隐私设置
    - 支持联系人分组管理
    - _Requirements: 5.1, 5.5_

  - [ ] 6.5 集成隐私过滤到 Profile 组件
    - 修改 `frontend/src/components/Profile.jsx`
    - 查看他人资料时调用 getFilteredProfile
    - 根据隐私级别显示/隐藏字段
    - 显示"请求访问"按钮
    - _Requirements: 5.3, 5.9_

  - [ ] 6.6 编写隐私控制属性测试
    - **Property 10: 隐私过滤正确性**
    - **Property 11: 隐私设置即时生效**
    - **Validates: Requirements 5.3, 5.4, 5.7**

- [ ] 7. Checkpoint - 隐私控制验证
  - 确保所有测试通过
  - 验证隐私设置和过滤正常工作
  - 如有问题请询问用户

- [ ] 8. 智能机会匹配
  - [ ] 8.1 创建后端机会匹配 API
    - 创建 `backend/src/controllers/opportunityController.js`
    - 实现 createOpportunity, getOpportunities, getMatchDetails 方法
    - 实现 expressInterest, getMatches 方法
    - 集成现有的 matching_service.py
    - 创建 `backend/src/routes/opportunity.js` 路由文件
    - _Requirements: 4.3, 4.4, 4.8_

  - [ ] 8.2 创建机会数据库表
    - 在 `backend/src/scripts/init-supabase.sql` 添加 opportunities 表
    - 添加 opportunity_matches 表
    - 添加 opportunity_interests 表
    - _Requirements: 4.2, 4.5_

  - [ ] 8.3 创建前端 OpportunityService
    - 创建 `frontend/src/services/OpportunityService.js`
    - 实现 getMatches, getMatchDetails, expressInterest, createOpportunity 方法
    - _Requirements: 4.3_

  - [ ] 8.4 创建 OpportunityFeed 组件
    - 创建 `frontend/src/components/OpportunityFeed.jsx`
    - 显示匹配的机会列表
    - 显示匹配分数和详情
    - 支持表达兴趣操作
    - _Requirements: 4.6, 4.7, 4.8_

  - [ ] 8.5 创建 OpportunityCard 组件
    - 创建 `frontend/src/components/OpportunityCard.jsx`
    - 显示机会标题、描述、类别
    - 显示匹配分数条形图
    - 显示所需技能和匹配技能
    - _Requirements: 4.7_

  - [ ] 8.6 集成机会匹配到主应用
    - 修改 `frontend/src/components/MainApp.jsx`
    - 添加机会 Feed 入口
    - 添加机会通知
    - _Requirements: 4.5, 4.6_

  - [ ] 8.7 编写机会匹配属性测试
    - **Property 8: 匹配分数范围**
    - **Property 9: 匹配分数权重总和**
    - **Validates: Requirements 4.1**

- [ ] 9. Living Profile 系统完善
  - [ ] 9.1 增强 Profile 组件添加新字段
    - 修改 `frontend/src/components/Profile.jsx`
    - 添加"当前项目"部分
    - 添加"可用资源"部分
    - 添加"寻求机会"部分
    - 添加"可用性状态"切换
    - _Requirements: 6.1, 6.2, 6.3, 6.8_

  - [ ] 9.2 增强 ProfileEditDialog 支持新字段
    - 修改 `frontend/src/components/ProfileEditDialog.jsx`
    - 添加项目编辑功能
    - 添加资源编辑功能
    - 添加机会编辑功能
    - 显示资料完整度分数
    - _Requirements: 6.1, 6.2, 6.3, 6.10_

  - [ ] 9.3 实现资料更新广播
    - 修改后端 profileController
    - 资料更新时通过 WebSocket 广播给联系人
    - 根据隐私设置过滤广播内容
    - _Requirements: 6.4_

  - [ ] 9.4 集成可用性状态到机会匹配
    - 修改 `backend/src/services/matching_service.py`
    - 根据可用性状态调整匹配优先级
    - _Requirements: 6.9_

- [ ] 10. Final Checkpoint - 完整功能验证
  - 确保所有测试通过
  - 验证端到端加密消息流程
  - 验证文件传输流程
  - 验证隐私控制流程
  - 验证机会匹配流程
  - 如有问题请询问用户

## Notes

- 所有任务均为必需，包括属性测试任务
- 每个 Checkpoint 用于验证阶段性成果
- 属性测试使用 `fast-check` 库，需要先安装：`npm install fast-check --save-dev`
- 后端 API 需要在 Vercel 部署后测试，本地开发使用 demo 模式

