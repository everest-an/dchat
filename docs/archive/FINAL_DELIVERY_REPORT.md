
# Dchat.pro 生产级功能测试与分析报告

## 项目概况

**项目名称**: Dchat - Secure Business Communication Platform  
**定位**: Web3 去中心化商业通信平台  
**竞争目标**: 与 Elon Musk 的聊天软件和 Telegram 竞争  
**技术栈**: React + Flask + Solidity + Ethereum  
**测试日期**: 2025-11-04

---

## 一、前端功能测试结果

### 1.1 登录页面功能

**已实现功能**：

登录页面提供了三种登录方式，界面设计简洁专业。MetaMask 钱包登录是主要推荐方式，符合 Web3 定位。Email 和 Phone 登录作为备选方案，降低了用户进入门槛。页面包含了端到端加密、抗量子加密和区块链存储的安全特性说明，并提供了服务条款和隐私政策链接。

**Email 登录流程**包含完整的表单验证，支持密码可见性切换，提供了注册入口和密码重置功能，并在底部显示了密码加密存储的安全提示。

**注册流程**设计合理，包含可选的用户名字段、必填的邮箱和密码字段，密码确认功能，以及返回登录的入口。

**Phone 登录**提供了国际电话号码格式输入，说明会自动创建安全钱包，但未测试实际验证码发送功能。

**功能完善度评估**：
- ✅ 三种登录方式界面完整
- ✅ 表单验证和用户体验良好
- ⚠️ 未测试实际登录功能（需要真实账号）
- ⚠️ MetaMask 连接功能未验证
- ⚠️ 手机验证码发送功能未验证

### 1.2 主页功能

**已实现功能**：

主页采用现代化的营销页面设计，清晰展示了产品的六大核心特性。页面包含明确的行动号召按钮，视觉设计专业，响应式布局良好。

**核心特性展示**：
- End-to-End Encryption（端到端加密）
- Blockchain Storage（区块链存储）
- Instant Payment（即时支付）
- Professional Network（LinkedIn 集成）
- Web3 Native（Web3 原生）
- Smart Collaboration（智能协作）

**功能完善度评估**：
- ✅ 营销页面设计专业
- ✅ 核心价值主张清晰
- ✅ 响应式设计良好
- ⚠️ 缺少产品演示视频
- ⚠️ 缺少客户案例和社会证明
- ⚠️ 缺少定价信息

---

## 二、后端代码架构分析

### 2.1 技术架构概览

**后端技术栈**：
- **框架**: Flask (Python)
- **数据库**: SQLite (开发) / PostgreSQL (生产) / Supabase (已迁移)
- **认证**: JWT Bearer Token
- **实时通信**: Socket.IO (已实现但可能未部署)
- **区块链**: Web3.py + ethers.js
- **智能合约**: Solidity 0.8.x (Sepolia Testnet)

**前端技术栈**：
- **框架**: React 18 + Vite
- **样式**: Tailwind CSS
- **状态管理**: React Context API
- **Web3**: ethers.js
- **构建工具**: Vite

### 2.2 数据库模型分析

**User 模型** (基础但不完整)：
```python
- id: Integer (主键)
- wallet_address: String(42) (唯一, 必填)
- name: String(100) (必填)
- company: String(200) (可选)
- position: String(200) (可选)
- linkedin_id: String(100) (可选)
- public_key: Text (可选)
- created_at: DateTime
- updated_at: DateTime
```

**缺失字段**：
- ❌ 头像/个人照片
- ❌ 邮箱地址（仅支持钱包登录）
- ❌ 手机号码
- ❌ 用户状态（在线/离线/忙碌）
- ❌ 最后活跃时间
- ❌ 用户角色/权限
- ❌ 账户状态（激活/禁用/删除）
- ❌ 邮箱/手机验证状态

**Message 模型** (基础实现)：
```python
- id: Integer (主键)
- sender_id: Integer (外键)
- receiver_id: Integer (外键)
- content: Text (必填)
- encrypted_content: Text (可选, 但未使用)
- message_type: String(20) (默认 'text')
- ipfs_hash: String(100) (可选, 未实现)
- timestamp: DateTime
- is_read: Boolean (默认 False)
```

**严重问题**：
- ❌ encrypted_content 字段存在但从未使用
- ❌ ipfs_hash 字段存在但 IPFS 未集成
- ❌ 缺少消息状态（发送中/已送达/已读/失败）
- ❌ 缺少消息编辑/删除时间戳
- ❌ 缺少回复引用字段
- ❌ 缺少群组消息支持
- ❌ 缺少消息附件关联

**Project 模型** (存在但未详细审查)：
- 支持项目管理和协作
- 包含 Moment（动态）功能
- 具体实现细节需进一步审查

### 2.3 API 路由分析

**认证路由** (`/api/auth`):

实现了三个基础端点，但存在严重的安全漏洞。`connect-wallet` 端点接受钱包地址和签名，但**签名验证完全缺失**，任何人都可以伪造钱包地址登录。用户名自动生成为"用户+地址后6位"，缺乏个性化。JWT token 有效期为 30 天，但没有刷新机制。

**严重安全问题**：
```python
# auth.py 第 18 行
signature = data.get('signature')  # 获取签名但从未验证！
```

**缺失功能**：
- ❌ 签名验证（致命安全漏洞）
- ❌ Nonce 管理（防止重放攻击）
- ❌ Token 刷新机制
- ❌ 登出端点（虽然前端有 AuthService）
- ❌ 密码登录（虽然前端有界面）
- ❌ 手机验证码登录
- ❌ 多因素认证
- ❌ 会话管理
- ❌ 登录历史记录

**消息路由** (`/api/messages`):

实现了基础的消息发送和获取功能，但存在多个严重问题。`get_conversations` 端点的未读计数硬编码为 0，实际未实现计数逻辑。`encrypt_message` 和 `decrypt_message` 端点只是简单的 base64 编码，**不是真正的加密**。

**严重问题**：
```python
# messages.py 第 61 行
'unread_count': 0  # 硬编码为 0！

# messages.py 第 180 行
encrypted_content = base64.b64encode(content.encode()).decode()
# 这不是加密，只是编码！
```

**缺失功能**：
- ❌ 真正的端到端加密
- ❌ 消息已读状态更新
- ❌ 消息删除/撤回
- ❌ 消息编辑
- ❌ 消息搜索
- ❌ 文件上传/下载
- ❌ 图片/视频消息
- ❌ 语音消息
- ❌ 消息转发
- ❌ 消息引用/回复
- ❌ 群组消息
- ❌ 消息分页（虽然有参数但未实现）

**其他路由**：
- `/api/projects` - 项目管理（已实现）
- `/api/groups` - 群组功能（可选导入，可能未完全实现）
- `/api/notifications` - 通知功能（可选导入）
- `/api/linkedin` - LinkedIn OAuth（已实现）

### 2.4 实时通信分析

**Socket.IO 实现状态**：

后端存在完整的 Socket.IO 实现文件：
- `socket_app.py` - Socket.IO 应用入口
- `socket_app_enhanced.py` - 增强版本
- `socket_server.py` - 服务器逻辑
- `deploy/socket_io_config.py` - 部署配置
- `deploy/nginx_socket_io.conf` - Nginx 配置

**部署状态未知**：
- ⚠️ 代码存在但未确认是否在生产环境运行
- ⚠️ 主应用 (main.py) 运行在 Flask，Socket.IO 需要单独进程
- ⚠️ 前端是否正确连接到 Socket.IO 服务器未验证

**如果未部署，影响**：
- ❌ 无实时消息推送
- ❌ 无在线状态显示
- ❌ 无"正在输入"提示
- ❌ 用户需要手动刷新才能看到新消息

### 2.5 智能合约分析

**已声称部署的合约** (根据 README)：

| 合约名称 | 网络 | 地址 | 状态 |
|---------|------|------|------|
| UserIdentity | Sepolia | 0x5FbDB2315678afecb367f032d93F642f64180aa3 | ⚠️ 疑似本地测试地址 |
| MessageStorage | Sepolia | 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 | ⚠️ 疑似本地测试地址 |
| PaymentEscrow | Sepolia | 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 | ⚠️ 疑似本地测试地址 |
| ProjectCollaboration | Sepolia | 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 | ⚠️ 疑似本地测试地址 |

**严重问题**：
这些地址看起来像 Hardhat 本地测试网络的默认部署地址（0x5FbDB...、0xe7f17...），而不是真实的 Sepolia 测试网地址。真实的 Sepolia 地址应该是随机的。

**如果合约未真实部署**：
- ❌ 所有区块链功能完全无法使用
- ❌ 消息无法存储到区块链
- ❌ 支付功能无法使用
- ❌ 项目协作功能无法使用
- ❌ 用户身份验证无法使用

这与 `GAPS_AND_ISSUES.md` 中的第一个严重问题一致。

---

## 三、生产级标准对比分析

### 3.1 与 Telegram 功能对比

| 功能类别 | Telegram | Dchat 当前状态 | 差距评估 |
|---------|----------|---------------|---------|
| **基础消息** | ✅ 文本/表情/贴纸 | ⚠️ 仅文本 | 巨大差距 |
| **富媒体** | ✅ 图片/视频/文件/语音 | ❌ 完全缺失 | 致命缺陷 |
| **群组** | ✅ 最多20万人 | ❌ 未实现 | 致命缺陷 |
| **频道** | ✅ 无限订阅者 | ❌ 未实现 | 致命缺陷 |
| **实时性** | ✅ 毫秒级推送 | ❌ 需手动刷新 | 致命缺陷 |
| **加密** | ✅ MTProto | ❌ Base64伪装 | 致命安全漏洞 |
| **搜索** | ✅ 全局搜索 | ❌ 未实现 | 重大缺陷 |
| **语音/视频通话** | ✅ 支持 | ❌ 未实现 | 重大缺陷 |
| **机器人** | ✅ Bot API | ❌ 未实现 | 重大缺陷 |
| **多设备同步** | ✅ 云同步 | ❌ 未实现 | 重大缺陷 |
| **离线消息** | ✅ 完整支持 | ⚠️ 依赖区块链 | 中等差距 |
| **已读回执** | ✅ 双勾标记 | ❌ 未实现 | 中等差距 |

**结论**: Dchat 当前功能完成度不足 Telegram 的 20%，无法作为生产级聊天工具使用。

### 3.2 核心功能缺失清单

**P0 级别（致命缺陷，必须立即修复）**：

1. **智能合约未真实部署** - 所有区块链功能无法使用
2. **签名验证缺失** - 任何人可以伪造身份登录
3. **加密功能未实现** - 消息以明文存储，严重安全漏洞
4. **实时消息推送缺失** - 不是真正的"聊天"应用
5. **文件传输完全缺失** - 无法发送图片/文件，功能严重不完整

**P1 级别（严重缺陷，短期内必须修复）**：

6. **群组聊天未实现** - 商业通信的核心需求
7. **消息已读状态不工作** - 用户体验差
8. **用户资料不完整** - 只有钱包地址，无法识别用户
9. **消息搜索缺失** - 无法查找历史消息
10. **IPFS 未集成** - 无法存储大文件

**P2 级别（重要缺陷，中期计划）**：

11. 语音/视频通话
12. 消息转发和引用
13. 在线状态显示
14. 多设备同步
15. 消息通知

### 3.3 后端薄弱点详细分析

**架构层面**：

1. **单体架构** - Flask 单进程，无法水平扩展
2. **无缓存层** - 每次都查询数据库/区块链，性能差
3. **无消息队列** - 无法处理异步任务
4. **无服务拆分** - 认证、消息、支付耦合在一起
5. **无 API 网关** - 缺少统一的入口和限流

**数据库层面**：

1. **无数据库迁移工具** - 使用 `db.create_all()`，无法管理 schema 变更
2. **无索引优化** - 消息查询会随着数据增长变慢
3. **无分库分表** - 单表存储所有消息，无法支撑大规模用户
4. **无读写分离** - 读写压力都在主库
5. **无备份策略** - 数据丢失风险

**安全层面**：

1. **签名验证缺失** - 致命安全漏洞
2. **加密未实现** - 明文存储消息
3. **无 HTTPS 强制** - 可能被中间人攻击
4. **无 SQL 注入防护** - 使用 ORM 但未验证所有输入
5. **无 XSS 防护** - 消息内容未过滤
6. **无 CSRF 防护** - API 未实现 CSRF token
7. **无限流机制** - 容易被 DDoS 攻击
8. **JWT 无刷新机制** - token 泄露后 30 天内有效
9. **无审计日志** - 无法追踪安全事件
10. **环境变量管理混乱** - 敏感信息可能泄露

**性能层面**：

1. **无连接池** - 数据库连接效率低
2. **无查询优化** - N+1 查询问题
3. **无 CDN** - 静态资源加载慢
4. **无图片压缩** - 如果实现文件传输，会消耗大量带宽
5. **无懒加载** - 一次加载所有消息

**可靠性层面**：

1. **无错误监控** - 生产环境错误无法追踪
2. **无健康检查** - 虽然有 `/api/health` 但功能简单
3. **无熔断机制** - 依赖服务故障会导致雪崩
4. **无重试机制** - 区块链交易失败后不会重试
5. **无日志聚合** - 无法分析问题

**测试层面**：

1. **测试覆盖率极低** - 只有少量测试文件
2. **无集成测试** - 端到端功能未验证
3. **无性能测试** - 不知道系统能支撑多少用户
4. **无安全测试** - 漏洞未被发现

---

## 四、与竞品对比的致命差距

### 4.1 技术架构差距

**Telegram 架构** (公开信息):
- 分布式架构，全球多个数据中心
- MTProto 自研加密协议
- 多层缓存系统
- 消息队列处理异步任务
- 微服务架构

**Dchat 当前架构**:
- 单体 Flask 应用
- 无加密（伪装成 base64）
- 无缓存
- 无消息队列
- 单体架构

**差距**: 10 年以上的技术代差

### 4.2 功能完整度差距

**生产级聊天应用必备功能**:

| 功能 | Telegram | WhatsApp | Signal | Dchat | 完成度 |
|-----|----------|----------|--------|-------|--------|
| 文本消息 | ✅ | ✅ | ✅ | ⚠️ | 30% |
| 图片/视频 | ✅ | ✅ | ✅ | ❌ | 0% |
| 文件传输 | ✅ | ✅ | ✅ | ❌ | 0% |
| 语音消息 | ✅ | ✅ | ✅ | ❌ | 0% |
| 语音通话 | ✅ | ✅ | ✅ | ❌ | 0% |
| 视频通话 | ✅ | ✅ | ✅ | ❌ | 0% |
| 群组聊天 | ✅ | ✅ | ✅ | ❌ | 0% |
| 端到端加密 | ✅ | ✅ | ✅ | ❌ | 0% |
| 实时推送 | ✅ | ✅ | ✅ | ❌ | 0% |
| 消息搜索 | ✅ | ✅ | ✅ | ❌ | 0% |
| 已读回执 | ✅ | ✅ | ✅ | ❌ | 0% |
| 在线状态 | ✅ | ✅ | ✅ | ❌ | 0% |
| 多设备同步 | ✅ | ✅ | ✅ | ❌ | 0% |
| 消息备份 | ✅ | ✅ | ✅ | ❌ | 0% |

**平均完成度**: 约 2%

### 4.3 用户体验差距

**关键指标对比**:

| 指标 | Telegram | Dchat 预估 | 差距 |
|-----|----------|-----------|------|
| 消息发送延迟 | <100ms | >3s (区块链确认) | 30倍 |
| 登录时间 | <2s | >10s (MetaMask 交互) | 5倍 |
| 首屏加载 | <1s | >5s (区块链查询) | 5倍 |
| 离线消息接收 | 即时 | 需手动刷新 | 无穷大 |
| 文件传输速度 | 高速 | 不支持 | 无穷大 |

---

## 五、生产环境风险评估

### 5.1 安全风险（极高）

1. **身份伪造风险**: 任何人可以伪造钱包地址登录，窃取他人账户
2. **消息泄露风险**: 明文存储消息，数据库泄露即全部泄露
3. **中间人攻击**: 无真实加密，传输过程可被窃听
4. **DDoS 攻击**: 无限流机制，容易被攻击瘫痪
5. **SQL 注入**: 输入验证不完整
6. **XSS 攻击**: 消息内容未过滤

**风险等级**: 🔴 极高 - 不适合处理任何敏感信息

### 5.2 可用性风险（高）

1. **智能合约未部署**: 核心功能完全无法使用
2. **单点故障**: Flask 单进程，崩溃即全站不可用
3. **性能瓶颈**: 无缓存，用户增长会导致系统崩溃
4. **数据丢失**: 无备份策略，数据库故障即永久丢失
5. **区块链依赖**: Gas 费用高峰期无法发送消息

**风险等级**: 🔴 高 - 无法保证服务可用性

### 5.3 合规风险（高）

1. **GDPR 合规**: 区块链存储无法删除，违反"被遗忘权"
2. **数据主权**: 消息存储在公链，无法满足数据本地化要求
3. **加密合规**: 声称加密但未实现，虚假宣传
4. **隐私保护**: 钱包地址公开，可追踪用户行为

**风险等级**: 🟡 中高 - 可能面临法律诉讼

---

## 六、核心问题总结

### 6.1 前端问题

**已完善**:
- ✅ 登录界面设计专业
- ✅ 三种登录方式 UI 完整
- ✅ 响应式设计良好
- ✅ 营销页面设计合格

**不完善**:
- ⚠️ 登录功能未实际测试
- ⚠️ 聊天界面功能未测试（需登录）
- ⚠️ 文件上传按钮禁用
- ⚠️ 图片/视频消息不支持

**未完成**:
- ❌ 群组聊天界面
- ❌ 语音/视频通话界面
- ❌ 消息搜索界面
- ❌ 用户资料完整界面

### 6.2 后端核心问题

**致命缺陷**:
1. ❌ **签名验证缺失** - 任何人可伪造身份
2. ❌ **加密未实现** - 只有 base64 编码
3. ❌ **智能合约疑似未部署** - 地址像测试网
4. ❌ **实时推送未确认部署** - Socket.IO 代码存在但可能未运行
5. ❌ **文件传输完全缺失** - IPFS 未集成

**严重薄弱点**:
1. ⚠️ **无数据库迁移** - 无法管理 schema 变更
2. ⚠️ **无缓存层** - 性能差
3. ⚠️ **无限流机制** - 易被攻击
4. ⚠️ **无错误监控** - 问题无法追踪
5. ⚠️ **测试覆盖率低** - 质量无保证
6. ⚠️ **单体架构** - 无法扩展
7. ⚠️ **消息已读状态硬编码为 0** - 功能未实现
8. ⚠️ **JWT 无刷新机制** - 安全风险
9. ⚠️ **无备份策略** - 数据丢失风险
10. ⚠️ **环境变量管理混乱** - 配置风险

**功能缺失**:
1. ❌ 群组消息后端逻辑
2. ❌ 文件上传/下载 API
3. ❌ 消息搜索 API
4. ❌ 消息删除/编辑 API
5. ❌ 用户在线状态管理
6. ❌ 消息通知系统
7. ❌ 多设备同步
8. ❌ 消息备份/导出

---

## 七、与竞品的差距评估

### 7.1 功能差距

**与 Telegram 对比**:
- 功能完成度: 2%
- 技术成熟度: 10 年代差
- 用户体验: 30 倍延迟差距
- 安全性: 存在致命漏洞

**与 Signal 对比**:
- 加密: Signal 有真实的端到端加密，Dchat 只有 base64
- 隐私: Signal 最小化元数据，Dchat 在公链上公开
- 性能: Signal 优化极致，Dchat 依赖区块链确认

**与 WhatsApp 对比**:
- 用户规模: WhatsApp 支持 20 亿用户，Dchat 单体架构无法扩展
- 功能完整: WhatsApp 功能齐全，Dchat 基础功能缺失
- 可靠性: WhatsApp 99.9% 可用性，Dchat 存在单点故障

### 7.2 技术债务

**估算修复时间**:
- P0 问题修复: 2-3 个月（全职团队）
- P1 问题修复: 3-6 个月
- 达到 Telegram 20% 功能: 12-18 个月
- 达到生产级标准: 24-36 个月

**估算成本**:
- 后端重构: $200,000 - $500,000
- 安全加固: $100,000 - $200,000
- 功能补全: $500,000 - $1,000,000
- 测试和优化: $100,000 - $300,000
- **总计**: $900,000 - $2,000,000

---

## 八、建议和结论

### 8.1 立即行动项（P0）

1. **停止宣传加密功能** - 当前实现是虚假宣传，存在法律风险
2. **修复签名验证** - 实现真正的 Web3 签名验证
3. **验证智能合约部署** - 确认合约是否真实部署到 Sepolia
4. **实现真正的加密** - 集成 RSA 或 ECDH 端到端加密
5. **部署实时推送** - 确保 Socket.IO 在生产环境运行

### 8.2 短期优化（P1）

1. 集成 IPFS 实现文件传输
2. 实现消息已读状态
3. 完善用户资料系统
4. 实现群组聊天
5. 添加错误监控（Sentry）
6. 实现数据库迁移工具（Alembic）
7. 添加 Redis 缓存层
8. 实现 API 限流

### 8.3 中期规划（P2）

1. 架构重构为微服务
2. 实现语音/视频通话
3. 添加消息搜索
4. 实现多设备同步
5. 性能优化和压力测试
6. 安全审计和渗透测试
7. 完善测试覆盖率
8. 实现 CI/CD 流水线

### 8.4 最终结论

**当前状态**: Dchat 是一个**早期原型**，而不是生产级应用。

**核心问题**:
1. 安全性存在致命漏洞（签名验证缺失、加密未实现）
2. 功能完整度不足 5%（对比 Telegram）
3. 后端架构无法支撑商业化运营
4. 智能合约部署状态存疑

**竞争力评估**:
- 与 Telegram 竞争: ❌ 不可能（差距 10 年以上）
- 与 Signal 竞争: ❌ 不可能（安全性差距巨大）
- 与 WhatsApp 竞争: ❌ 不可能（功能和规模差距巨大）

**建议**:
1. **重新定位**: 不要声称与 Telegram 竞争，而是定位为"Web3 社交实验"或"去中心化通信原型"
2. **修复安全漏洞**: 立即修复签名验证和加密问题
3. **完善基础功能**: 先实现文件传输、群组聊天等基础功能
4. **架构重构**: 考虑使用成熟的开源方案（如 Matrix Protocol）
5. **现实预期**: 达到生产级标准需要 2-3 年和 $1-2M 投资

**风险警告**: 
在当前状态下上线商业运营，存在严重的安全风险、法律风险和声誉风险。建议在修复 P0 级别问题之前，不要接入真实用户。

---

**报告生成时间**: 2025-11-04  
**分析深度**: 深度代码审查 + 架构分析  
**可信度**: 高（基于实际代码和文档）


---


# Dchat 技术架构完善方案

## 一、现有代码资产分析

### 1.1 前端已有但未使用的服务

通过代码审查，发现前端已经实现了大量服务类，但后端未提供对应支持或未正确集成：

**已实现的前端服务**：
- ✅ `EncryptionService.js` - 完整的 RSA + AES 混合加密实现
- ✅ `AdvancedEncryptionService.js` - 高级加密功能
- ✅ `MessageStorageService.js` - 区块链消息存储服务
- ✅ `GroupService.js` / `GroupMessageService.js` - 群组聊天服务
- ✅ `IPFSService.js` - IPFS 文件存储服务
- ✅ `FileUploadService.js` / `EncryptedFileTransfer.js` - 文件上传和加密传输
- ✅ `PresenceService.js` - 在线状态服务
- ✅ `PaymentService.js` / `PaymentEscrowService.js` - 支付和托管服务
- ✅ `SubscriptionService.js` - 订阅服务
- ✅ `UserIdentityService.js` - 用户身份服务

**问题**：这些前端服务已经编写完成，但：
1. 后端 API 不完整或缺失
2. 智能合约地址配置可能不正确
3. 服务之间的集成不完整

**优先策略**：先让这些已有代码工作起来，而不是重新开发。

### 1.2 后端已有但未集成的功能

**已实现的后端功能**：
- ✅ `socket_app.py` / `socket_server.py` - Socket.IO 实时通信（未部署）
- ✅ `payments.js` - Stripe 支付集成（未测试）
- ✅ `subscription.js` / `subscriptionController.js` - 订阅管理（未集成到主应用）
- ✅ `linkedin_oauth_service.js` - LinkedIn OAuth（已实现）

**问题**：这些功能代码存在但未启用或未集成到主应用。

---

## 二、P0 级致命缺陷修复方案

### 2.1 签名验证缺失

**当前问题**：
```python
# backend/src/routes/auth.py 第 18 行
signature = data.get('signature')  # 获取但从不验证！
```

**解决方案**：使用 Web3.py 验证签名

**实现计划**：
1. 在后端添加签名验证逻辑
2. 生成随机 nonce 防止重放攻击
3. 验证签名消息格式和时间戳

**代码位置**：`backend/src/routes/auth.py`

---

### 2.2 加密功能未集成

**当前问题**：
- 前端有完整的 `EncryptionService.js`，但未在聊天流程中使用
- 后端的加密端点只是 base64 编码

**解决方案**：
1. **前端**：在 `ChatRoom.jsx` 中集成 `EncryptionService`
2. **后端**：移除伪加密端点，加密应该在客户端完成（端到端）
3. **智能合约**：确保合约存储的是加密内容

**已有资源**：
- ✅ `frontend/src/services/EncryptionService.js` - 完整实现
- ✅ `frontend/src/services/AdvancedEncryptionService.js` - 高级功能

**需要做的**：
1. 修改 `ChatRoom.jsx` 使用加密服务
2. 确保公钥在用户注册时存储到智能合约
3. 发送消息前加密，接收消息后解密

---

### 2.3 实时推送未部署

**当前问题**：
- Socket.IO 代码已实现但可能未在生产环境运行
- 前端可能未正确连接到 Socket.IO 服务器

**解决方案**：
1. 确认 Socket.IO 服务器部署状态
2. 配置 Nginx 反向代理支持 WebSocket
3. 前端连接到正确的 Socket.IO 端点

**已有资源**：
- ✅ `backend/src/socket_app.py` - Socket.IO 应用
- ✅ `backend/src/socket_server.py` - 服务器逻辑
- ✅ `backend/deploy/nginx_socket_io.conf` - Nginx 配置

**需要做的**：
1. 验证 Socket.IO 是否在运行
2. 配置环境变量和端口
3. 测试实时消息推送

---

### 2.4 智能合约部署验证

**当前问题**：
- README 中的合约地址看起来像本地测试网地址
- 前端配置的合约地址与 `deployment-v2-addresses.json` 不一致

**合约地址对比**：

| 合约 | 前端配置 | deployment-v2 | 状态 |
|------|---------|--------------|------|
| MessageStorage | 0x5a7f2f95... | 0x90662669... | ❌ 不一致 |
| UserIdentity | 0x32a75De0... | 0x6BCF16f8... | ❌ 不一致 |

**解决方案**：
1. 验证哪个地址是真实部署的
2. 更新前端配置文件
3. 在 Sepolia Etherscan 上验证合约代码

**需要咨询用户**：
- 您是否已经将合约部署到 Sepolia 测试网？
- 如果已部署，正确的合约地址是什么？
- 是否需要重新部署合约？

---

## 三、开源方案搜索和评估

### 3.1 需要搜索的开源组件

根据缺失功能，我需要搜索以下开源方案：

**P0 级别**：
1. ✅ Web3 签名验证 - 使用 `web3.py` 或 `eth-account`（Python 标准库）
2. ✅ 端到端加密 - 前端已有实现，无需额外组件

**P1 级别**：
3. 🔍 IPFS 客户端 - 需要搜索 Python IPFS 库
4. 🔍 消息队列 - Redis + Celery 或其他方案
5. 🔍 缓存层 - Redis 集成方案
6. 🔍 数据库迁移 - Alembic（Flask-Migrate）

**P2 级别**：
7. 🔍 错误监控 - Sentry SDK
8. 🔍 日志聚合 - 开源方案（ELK 或 Loki）
9. 🔍 API 限流 - Flask-Limiter
10. 🔍 WebRTC - 语音/视频通话（可选）

---

## 四、技术选型问题（需要咨询用户）

### 4.1 数据库选择

**当前状态**：
- 开发环境：SQLite
- 生产环境：已迁移到 Supabase (PostgreSQL)

**问题**：
1. 是否继续使用 Supabase？
2. 是否需要自建 PostgreSQL？
3. 是否需要实现数据库读写分离？

**建议**：Supabase 是很好的选择，提供了：
- PostgreSQL 数据库
- 实时订阅功能（可替代部分 Socket.IO）
- 认证服务
- 存储服务（可用于文件上传）

**咨询用户**：您希望继续使用 Supabase 还是迁移到自建数据库？

---

### 4.2 文件存储方案

**当前状态**：
- 前端有 `IPFSService.js`
- 后端无 IPFS 集成

**选项**：

**选项 A：IPFS（去中心化）**
- ✅ 符合 Web3 理念
- ✅ 永久存储
- ❌ 上传速度慢
- ❌ 需要运行 IPFS 节点或使用 Pinata/Infura

**选项 B：Supabase Storage（中心化）**
- ✅ 快速可靠
- ✅ 已有 Supabase 账户
- ✅ 易于集成
- ❌ 不符合去中心化理念

**选项 C：混合方案**
- 小文件/头像 → Supabase Storage（快速）
- 大文件/重要文件 → IPFS（去中心化）

**咨询用户**：您更倾向于哪种文件存储方案？

---

### 4.3 实时通信架构

**当前状态**：
- 已有 Socket.IO 实现
- Supabase 提供实时订阅功能

**选项**：

**选项 A：Socket.IO（当前方案）**
- ✅ 已有代码实现
- ✅ 功能完整
- ❌ 需要单独部署和维护
- ❌ 增加架构复杂度

**选项 B：Supabase Realtime**
- ✅ 无需额外部署
- ✅ 与数据库集成
- ✅ 自动扩展
- ❌ 功能可能不如 Socket.IO 灵活

**选项 C：混合方案**
- 消息推送 → Supabase Realtime
- 在线状态/输入状态 → Socket.IO

**咨询用户**：您希望使用哪种实时通信方案？

---

### 4.4 支付网关选择

**当前状态**：
- 后端已集成 Stripe
- 智能合约有支付托管功能

**问题**：
1. 是否需要支持法币支付（Stripe）？
2. 是否只使用加密货币支付？
3. 是否需要支持多种支付方式？

**咨询用户**：您的商业模式需要哪些支付方式？

---

### 4.5 部署架构

**当前状态**：
- 前端：Vercel
- 后端：未知（可能是 Vercel Serverless Functions）

**问题**：
1. 后端是否部署在 Vercel？
2. 是否需要迁移到 VPS/云服务器？
3. Socket.IO 如何部署？

**建议**：
- 前端：继续使用 Vercel
- 后端 API：Vercel Serverless 或独立服务器
- Socket.IO：必须部署在独立服务器（Vercel 不支持长连接）
- 数据库：Supabase 托管
- 缓存：Redis Cloud 或自建

**咨询用户**：您当前的后端部署在哪里？是否有预算租用独立服务器？

---

## 五、实施计划

### Phase 1: P0 级修复（1-2 周）

**1.1 修复签名验证**
- [ ] 实现 Web3 签名验证
- [ ] 添加 nonce 管理
- [ ] 测试钱包登录流程

**1.2 集成加密功能**
- [ ] 修改 ChatRoom.jsx 使用 EncryptionService
- [ ] 确保公钥存储到智能合约
- [ ] 测试端到端加密

**1.3 部署实时推送**
- [ ] 确认 Socket.IO 部署方案
- [ ] 配置 Nginx/反向代理
- [ ] 测试实时消息推送

**1.4 验证智能合约**
- [ ] 确认合约地址
- [ ] 更新前端配置
- [ ] 在 Etherscan 验证合约

---

### Phase 2: P1 级功能集成（2-3 周）

**2.1 文件传输**
- [ ] 选择文件存储方案（待用户确认）
- [ ] 集成 IPFS 或 Supabase Storage
- [ ] 实现文件上传/下载 API
- [ ] 前端集成文件传输功能

**2.2 群组聊天**
- [ ] 启用前端 GroupService
- [ ] 实现后端群组 API
- [ ] 测试群组消息功能

**2.3 消息状态**
- [ ] 修复已读状态（移除硬编码的 0）
- [ ] 实现消息状态更新
- [ ] 添加消息送达回执

---

### Phase 3: 后端架构优化（2-3 周）

**3.1 缓存层**
- [ ] 集成 Redis
- [ ] 缓存用户信息
- [ ] 缓存对话列表

**3.2 数据库优化**
- [ ] 集成 Alembic 迁移工具
- [ ] 添加数据库索引
- [ ] 优化查询性能

**3.3 监控和日志**
- [ ] 集成 Sentry 错误监控
- [ ] 配置日志聚合
- [ ] 添加性能监控

**3.4 安全加固**
- [ ] 实现 API 限流
- [ ] 添加 CSRF 保护
- [ ] 输入验证和 XSS 防护

---

## 六、待确认的技术决策

请您确认以下技术选型，以便我继续实施：

### 关键决策点：

1. **数据库**：继续使用 Supabase 还是迁移到自建 PostgreSQL？
2. **文件存储**：IPFS / Supabase Storage / 混合方案？
3. **实时通信**：Socket.IO / Supabase Realtime / 混合方案？
4. **支付方式**：Stripe（法币）/ 仅加密货币 / 两者都要？
5. **部署架构**：当前后端部署在哪里？是否有预算租用服务器？
6. **智能合约**：合约是否已部署？正确的地址是什么？

### 次要决策点：

7. **消息队列**：是否需要 Celery + Redis 处理异步任务？
8. **CDN**：是否需要配置 CDN 加速静态资源？
9. **域名和 SSL**：域名配置是否完成？SSL 证书是否有效？
10. **监控工具**：是否有 Sentry 账户？是否需要其他监控工具？

---

## 七、开源组件搜索清单

我将搜索以下开源组件（如果您确认需要）：

### 确定需要的：
- [ ] `web3.py` / `eth-account` - Web3 签名验证
- [ ] `Flask-Limiter` - API 限流
- [ ] `Alembic` / `Flask-Migrate` - 数据库迁移
- [ ] `Sentry SDK` - 错误监控

### 待确认的：
- [ ] `ipfshttpclient` - Python IPFS 客户端（如果选择 IPFS）
- [ ] `Celery` + `Redis` - 消息队列（如果需要异步任务）
- [ ] `Flask-Caching` - 缓存集成（如果选择 Redis）
- [ ] `simple-websocket` - WebRTC 信令服务器（如果需要音视频通话）

---

## 八、下一步行动

请您回答上述关键决策点，我将：

1. 搜索和评估相应的开源方案
2. 开始修复 P0 级致命缺陷
3. 逐步集成缺失功能
4. 优化后端架构
5. 提供完整的部署指南

**预计总时间**：6-8 周（取决于技术选型和功能范围）

---

**文档创建时间**：2025-11-04  
**作者**：Manus AI


---


# AWS Deployment Guide for dchat.pro

## Architecture Overview

```
┌─────────────────┐
│   CloudFront    │  (CDN for frontend)
└────────┬────────┘
         │
┌────────▼────────┐
│   S3 Bucket     │  (Frontend static files)
└─────────────────┘

┌─────────────────┐
│  Route 53 DNS   │  (dchat.pro domain)
└────────┬────────┘
         │
┌────────▼────────┐
│  Load Balancer  │  (ALB)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼───┐
│ EC2  │  │ EC2  │  (Backend API + Socket.IO)
└───┬──┘  └──┬───┘
    │        │
    └────┬───┘
         │
┌────────▼────────┐
│  ElastiCache    │  (Redis)
│   (Redis 7.x)   │
└─────────────────┘

┌─────────────────┐
│   RDS/TiDB      │  (PostgreSQL/TiDB)
└─────────────────┘

┌─────────────────┐
│  Pinata IPFS    │  (File storage)
└─────────────────┘
```

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI installed and configured
3. Domain name (dchat.pro) configured in Route 53
4. SSH key pair (protocol-bank-key.pem)

## Step 1: Create VPC and Security Groups

### VPC Configuration
```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=dchat-vpc}]'

# Create subnets (public and private)
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.1.0/24 --availability-zone us-east-1a --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=dchat-public-1a}]'
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.2.0/24 --availability-zone us-east-1b --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=dchat-public-1b}]'
```

### Security Groups

**Backend Security Group**
```bash
aws ec2 create-security-group \
  --group-name dchat-backend-sg \
  --description "Security group for dchat backend" \
  --vpc-id <VPC_ID>

# Allow SSH (22)
aws ec2 authorize-security-group-ingress \
  --group-id <SG_ID> \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# Allow HTTP (8000 - API)
aws ec2 authorize-security-group-ingress \
  --group-id <SG_ID> \
  --protocol tcp \
  --port 8000 \
  --cidr 0.0.0.0/0

# Allow Socket.IO (3002)
aws ec2 authorize-security-group-ingress \
  --group-id <SG_ID> \
  --protocol tcp \
  --port 3002 \
  --cidr 0.0.0.0/0

# Allow HTTPS (443)
aws ec2 authorize-security-group-ingress \
  --group-id <SG_ID> \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

**Redis Security Group**
```bash
aws ec2 create-security-group \
  --group-name dchat-redis-sg \
  --description "Security group for dchat Redis" \
  --vpc-id <VPC_ID>

# Allow Redis (6379) from backend SG only
aws ec2 authorize-security-group-ingress \
  --group-id <REDIS_SG_ID> \
  --protocol tcp \
  --port 6379 \
  --source-group <BACKEND_SG_ID>
```

## Step 2: Launch EC2 Instances

### EC2 Instance Specifications
- **Instance Type**: t3.medium (2 vCPU, 4 GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Storage**: 30 GB gp3 SSD
- **Key Pair**: protocol-bank-key.pem

### Launch Command
```bash
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --instance-type t3.medium \
  --key-name protocol-bank-key \
  --security-group-ids <BACKEND_SG_ID> \
  --subnet-id <PUBLIC_SUBNET_ID> \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=dchat-backend-1}]' \
  --user-data file://user-data.sh
```

### User Data Script (user-data.sh)
```bash
#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install Python 3.11
apt-get install -y python3.11 python3.11-venv python3-pip

# Install Git
apt-get install -y git

# Install Docker (for future use)
apt-get install -y docker.io
systemctl enable docker
systemctl start docker

# Install PM2 globally
npm install -g pm2

# Create application user
useradd -m -s /bin/bash dchat
usermod -aG sudo dchat

# Clone repository
cd /home/dchat
sudo -u dchat git clone https://github.com/everest-an/dchat.git
cd dchat

# Setup backend
cd backend
sudo -u dchat python3.11 -m venv venv
sudo -u dchat ./venv/bin/pip install -r requirements.txt

# Setup environment variables (will be configured later)
sudo -u dchat cp .env.example .env

# Install frontend dependencies (for build)
cd ../frontend
sudo -u dchat npm install

echo "Setup complete!"
```

## Step 3: Create ElastiCache Redis Cluster

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id dchat-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name dchat-redis-subnet-group \
  --security-group-ids <REDIS_SG_ID> \
  --tags Key=Name,Value=dchat-redis
```

### Get Redis Endpoint
```bash
aws elasticache describe-cache-clusters \
  --cache-cluster-id dchat-redis \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
  --output text
```

## Step 4: Configure Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name dchat-alb \
  --subnets <SUBNET_1> <SUBNET_2> \
  --security-groups <ALB_SG_ID> \
  --tags Key=Name,Value=dchat-alb

# Create target group for backend
aws elbv2 create-target-group \
  --name dchat-backend-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id <VPC_ID> \
  --health-check-path /health \
  --health-check-interval-seconds 30

# Register EC2 instances
aws elbv2 register-targets \
  --target-group-arn <TG_ARN> \
  --targets Id=<INSTANCE_ID_1> Id=<INSTANCE_ID_2>

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn <ALB_ARN> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<ACM_CERT_ARN> \
  --default-actions Type=forward,TargetGroupArn=<TG_ARN>
```

## Step 5: Deploy Application

### SSH into EC2
```bash
chmod 400 protocol-bank-key.pem
ssh -i protocol-bank-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### Configure Environment Variables
```bash
cd /home/dchat/dchat/backend
sudo nano .env
```

Add the following:
```env
# Database Configuration (TiDB)
DB_HOST=gateway01.eu-central-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=3weSfx6NGnayDMr.root
DB_PASSWORD=<YOUR_PASSWORD>
DB_NAME=test

# JWT Secret
JWT_SECRET=<GENERATE_STRONG_SECRET>

# Pinata IPFS
PINATA_JWT=<YOUR_PINATA_JWT>
PINATA_API_KEY=<PINATA_API_KEY>
PINATA_SECRET_API_KEY=<PINATA_SECRET_API_KEY>
PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/

# Redis (ElastiCache endpoint)
REDIS_URL=redis://<REDIS_ENDPOINT>:6379

# Web3
WEB3_PROVIDER_URL=https://sepolia.infura.io/v3/<YOUR_INFURA_KEY>
CONTRACT_USER_IDENTITY=0x6BCF16f82F8d3A37b7b6fd59DeE9adf95B1BA5a1
CONTRACT_MESSAGE_STORAGE=0x906626694a065bEECf51F2C776f272bDB67Ce174

# Frontend URL
FRONTEND_URL=https://dchat.pro

# Socket.IO
SOCKET_IO_PORT=3002
SOCKET_IO_CORS_ORIGIN=https://dchat.pro
```

### Start Backend with PM2
```bash
cd /home/dchat/dchat/backend

# Start Python backend
pm2 start src/main.py --name dchat-api --interpreter python3.11

# Start Socket.IO server
pm2 start src/socket_app.py --name dchat-socket --interpreter python3.11

# Save PM2 configuration
pm2 save
pm2 startup
```

### Build and Deploy Frontend
```bash
cd /home/dchat/dchat/frontend

# Update API endpoint
nano .env.production
```

Add:
```env
REACT_APP_API_URL=https://api.dchat.pro
REACT_APP_SOCKET_URL=https://socket.dchat.pro
REACT_APP_WEB3_PROVIDER=https://sepolia.infura.io/v3/<YOUR_INFURA_KEY>
```

```bash
# Build frontend
npm run build

# Upload to S3
aws s3 sync build/ s3://dchat-frontend-bucket/ --delete
aws s3 website s3://dchat-frontend-bucket/ --index-document index.html --error-document index.html
```

## Step 6: Configure CloudFront

```bash
aws cloudfront create-distribution \
  --origin-domain-name dchat-frontend-bucket.s3.amazonaws.com \
  --default-root-object index.html \
  --aliases dchat.pro www.dchat.pro
```

## Step 7: Update Route 53 DNS

```bash
# Point dchat.pro to CloudFront
aws route53 change-resource-record-sets \
  --hosted-zone-id <ZONE_ID> \
  --change-batch file://dns-changes.json
```

## Monitoring and Logging

### CloudWatch Logs
```bash
# Install CloudWatch agent on EC2
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure log groups
aws logs create-log-group --log-group-name /dchat/backend
aws logs create-log-group --log-group-name /dchat/socket
```

### PM2 Monitoring
```bash
pm2 monit
pm2 logs
```

## Backup and Disaster Recovery

### Database Backups
- TiDB Cloud handles automatic backups
- Configure retention period in TiDB console

### Redis Backups
```bash
aws elasticache create-snapshot \
  --cache-cluster-id dchat-redis \
  --snapshot-name dchat-redis-backup-$(date +%Y%m%d)
```

## Cost Estimation

| Service | Configuration | Monthly Cost (USD) |
|---------|--------------|-------------------|
| EC2 (t3.medium × 2) | 2 vCPU, 4GB RAM | ~$60 |
| ElastiCache (t3.micro) | Redis 7.x | ~$15 |
| ALB | Application Load Balancer | ~$20 |
| S3 + CloudFront | Frontend hosting | ~$5 |
| Data Transfer | ~100GB/month | ~$10 |
| **Total** | | **~$110/month** |

## Security Checklist

- [ ] Enable AWS WAF on ALB
- [ ] Configure SSL/TLS certificates (ACM)
- [ ] Enable VPC Flow Logs
- [ ] Set up CloudTrail for audit logging
- [ ] Configure IAM roles with least privilege
- [ ] Enable MFA for AWS root account
- [ ] Rotate secrets regularly (use AWS Secrets Manager)
- [ ] Enable encryption at rest for EBS volumes
- [ ] Configure security groups with minimal access
- [ ] Set up automated security scanning

## Troubleshooting

### Check Backend Status
```bash
pm2 status
pm2 logs dchat-api --lines 100
```

### Check Redis Connection
```bash
redis-cli -h <REDIS_ENDPOINT> ping
```

### Check Database Connection
```bash
psql -h gateway01.eu-central-1.prod.aws.tidbcloud.com -p 4000 -U 3weSfx6NGnayDMr.root -d test
```

### Check Load Balancer Health
```bash
aws elbv2 describe-target-health --target-group-arn <TG_ARN>
```

## Next Steps

1. Set up CI/CD pipeline with GitHub Actions
2. Configure auto-scaling for EC2 instances
3. Implement blue-green deployment
4. Set up Sentry for error tracking
5. Configure Prometheus + Grafana for metrics
6. Implement rate limiting with AWS WAF
7. Set up automated backups
8. Configure alerting with SNS

## Support

For deployment issues, contact: everest9812@gmail.com


---


# dchat.pro Web3 API Documentation

## Overview

dchat.pro provides two sets of APIs:
1. **Traditional APIs** (`/api/*`) - Database-backed, centralized
2. **Web3 APIs** (`/api/web3/*`) - Smart contract-backed, decentralized

This document focuses on the **Web3 APIs** that integrate with Ethereum smart contracts deployed on Sepolia testnet.

---

## Base URL

```
Production: https://api.dchat.pro
Development: http://localhost:5000
```

---

## Authentication

All Web3 API endpoints require JWT authentication.

### Get JWT Token

1. Request a nonce:
```bash
POST /api/auth/nonce
Content-Type: application/json

{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

Response:
```json
{
  "nonce": "Sign this message to authenticate: 1234567890",
  "expiresAt": "2025-11-04T17:00:00Z"
}
```

2. Sign the nonce with MetaMask/Web3 wallet

3. Verify signature and get JWT:
```bash
POST /api/auth/verify-signature
Content-Type: application/json

{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0x..."
}
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }
}
```

### Using JWT Token

Include the JWT token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Web3 Group Management API

Base path: `/api/web3/groups`

Smart Contract: `GroupChatV2` at `0x4f93AEaAE5981fd6C95cFA8096D31D3d92ae2F28`

### Create Group

```bash
POST /api/web3/groups/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "groupName": "Tech Enthusiasts",
  "groupAvatar": "ipfs://QmXxxx...",
  "description": "A group for tech lovers",
  "isPublic": true,
  "maxMembers": 100,
  "privateKey": "0x..." // User's private key for signing transaction
}
```

Response:
```json
{
  "success": true,
  "transactionHash": "0xabc123...",
  "message": "Group created successfully",
  "blockNumber": 12345
}
```

### Get Group Information

```bash
GET /api/web3/groups/<group_id>
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "group": {
    "groupId": "group_123",
    "groupName": "Tech Enthusiasts",
    "groupAvatar": "ipfs://QmXxxx...",
    "description": "A group for tech lovers",
    "owner": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "members": ["0x...", "0x..."],
    "admins": ["0x..."],
    "createdAt": 1699123456,
    "memberCount": 10,
    "isActive": true
  }
}
```

### Join Group

```bash
POST /api/web3/groups/<group_id>/join
Authorization: Bearer <token>
Content-Type: application/json

{
  "privateKey": "0x..."
}
```

### Invite Member

```bash
POST /api/web3/groups/<group_id>/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "memberAddress": "0x...",
  "privateKey": "0x..."
}
```

### Leave Group

```bash
POST /api/web3/groups/<group_id>/leave
Authorization: Bearer <token>
Content-Type: application/json

{
  "privateKey": "0x..."
}
```

### Remove Member (Admin Only)

```bash
DELETE /api/web3/groups/<group_id>/members/<member_address>
Authorization: Bearer <token>
Content-Type: application/json

{
  "privateKey": "0x..."
}
```

### Update Group Settings (Owner Only)

```bash
PUT /api/web3/groups/<group_id>/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "isPublic": true,
  "allowMemberInvite": true,
  "requireApproval": false,
  "maxMembers": 200,
  "muteAll": false,
  "privateKey": "0x..."
}
```

### Get User's Groups

```bash
GET /api/web3/groups/user/<user_address>
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "userAddress": "0x...",
  "groupIds": ["group_1", "group_2"],
  "groupCount": 2
}
```

### Get Group Members

```bash
GET /api/web3/groups/<group_id>/members
Authorization: Bearer <token>
```

---

## Web3 Payment API

Base path: `/api/web3/payments`

Smart Contracts:
- `GroupPayment` at `0x788Ba6e9B0EB746F58E4bab891B9c0add8359541`
- `RedPacket` at `0x0354fCfB243639d37F84E8d00031422655219f75`

### Group Collection

Create a group collection where members can contribute any amount.

```bash
POST /api/web3/payments/group-collection
Authorization: Bearer <token>
Content-Type: application/json

{
  "groupId": "group_123",
  "title": "Team Dinner Fund",
  "description": "Collecting money for team dinner",
  "participants": ["0x...", "0x..."],
  "privateKey": "0x..."
}
```

### AA Payment (Split Bill)

Create an AA payment where each participant pays an equal amount.

```bash
POST /api/web3/payments/aa-payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "groupId": "group_123",
  "title": "Restaurant Bill",
  "description": "Split dinner cost",
  "participants": ["0x...", "0x..."],
  "amountPerPerson": "0.01",
  "privateKey": "0x..."
}
```

### Crowdfunding

Create a crowdfunding campaign with a target amount and deadline.

```bash
POST /api/web3/payments/crowdfunding
Authorization: Bearer <token>
Content-Type: application/json

{
  "groupId": "group_123",
  "title": "Team Building Fund",
  "description": "Raising money for team building",
  "targetAmount": "1.0",
  "deadline": 1735689600,
  "initialContribution": "0.1",
  "privateKey": "0x..."
}
```

### Contribute to Payment

```bash
POST /api/web3/payments/contribute/<payment_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": "0.1",
  "privateKey": "0x..."
}
```

### Get Payment Details

```bash
GET /api/web3/payments/payment/<payment_id>
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "payment": {
    "paymentId": "payment_123",
    "groupId": "group_123",
    "title": "Team Dinner Fund",
    "description": "Collecting money for team dinner",
    "creator": "0x...",
    "totalAmount": "0.5",
    "targetAmount": "1.0",
    "amountPerPerson": "0.0",
    "participantCount": 5,
    "createdAt": 1699123456,
    "deadline": 1735689600,
    "paymentType": 0,
    "isCompleted": false,
    "isActive": true
  }
}
```

---

## Red Packet API

Base path: `/api/web3/payments/redpacket`

### Create Random Red Packet

Create a red packet with random amounts (luck-based).

```bash
POST /api/web3/payments/redpacket/random
Authorization: Bearer <token>
Content-Type: application/json

{
  "groupId": "group_123",
  "message": "Happy New Year! 🧧",
  "count": 10,
  "totalAmount": "0.1",
  "privateKey": "0x..."
}
```

### Create Fixed Red Packet

Create a red packet with equal amounts for each recipient.

```bash
POST /api/web3/payments/redpacket/fixed
Authorization: Bearer <token>
Content-Type: application/json

{
  "groupId": "group_123",
  "message": "Happy New Year! 🧧",
  "count": 10,
  "totalAmount": "0.1",
  "privateKey": "0x..."
}
```

### Create Exclusive Red Packet

Create a red packet for specific recipients only.

```bash
POST /api/web3/payments/redpacket/exclusive
Authorization: Bearer <token>
Content-Type: application/json

{
  "groupId": "group_123",
  "message": "Special gift! 🎁",
  "recipients": ["0x...", "0x..."],
  "totalAmount": "0.1",
  "privateKey": "0x..."
}
```

### Claim Red Packet

```bash
POST /api/web3/payments/redpacket/claim/<packet_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "privateKey": "0x..."
}
```

Response:
```json
{
  "success": true,
  "transactionHash": "0xabc123...",
  "message": "Red packet claimed successfully"
}
```

### Get Red Packet Details

```bash
GET /api/web3/payments/redpacket/<packet_id>
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "packet": {
    "packetId": "packet_123",
    "groupId": "group_123",
    "message": "Happy New Year! 🧧",
    "sender": "0x...",
    "totalAmount": "0.1",
    "remainingAmount": "0.05",
    "count": 10,
    "claimedCount": 5,
    "createdAt": 1699123456,
    "expiresAt": 1699209856,
    "packetType": 0,
    "isActive": true
  }
}
```

### Get Claim Records

```bash
GET /api/web3/payments/redpacket/<packet_id>/records
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "packetId": "packet_123",
  "records": [
    {
      "claimer": "0x...",
      "amount": "0.012",
      "timestamp": 1699123456
    }
  ],
  "totalClaimed": 5
}
```

---

## Health Check

Check API and blockchain connection status.

```bash
GET /api/web3/groups/health
GET /api/web3/payments/health
```

Response:
```json
{
  "status": "healthy",
  "service": "groups-web3-api",
  "contract": "0x4f93AEaAE5981fd6C95cFA8096D31D3d92ae2F28",
  "network": "sepolia",
  "connected": true,
  "blockNumber": 12345
}
```

---

## Error Handling

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

### Common HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Blockchain connection failed

---

## Gas Fees

All blockchain transactions require gas fees (paid in ETH on Sepolia testnet).

**Estimated Gas Costs**:
- Create Group: ~0.005 ETH
- Join Group: ~0.002 ETH
- Create Payment: ~0.004 ETH
- Contribute: ~0.002 ETH
- Create Red Packet: ~0.004 ETH
- Claim Red Packet: ~0.002 ETH

**Note**: Gas prices vary based on network congestion. The API automatically estimates gas and includes it in transactions.

---

## Rate Limiting

- **Authenticated requests**: 100 requests per minute
- **Unauthenticated requests**: 20 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699123456
```

---

## Security Best Practices

1. **Never expose private keys**: Private keys should only be used client-side for signing transactions
2. **Use HTTPS**: Always use HTTPS in production
3. **Validate signatures**: All transactions are verified on-chain
4. **Token expiration**: JWT tokens expire after 24 hours
5. **Gas limit protection**: Transactions have maximum gas limits to prevent excessive fees

---

## Testing

### Sepolia Testnet

All contracts are deployed on Sepolia testnet. Get free test ETH from:
- https://sepoliafaucet.com
- https://faucet.sepolia.dev

### Example cURL Request

```bash
# Get group information
curl -X GET "https://api.dchat.pro/api/web3/groups/group_123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Support

For API support, please contact:
- Email: everest9812@gmail.com
- GitHub: https://github.com/everest-an/dchat

---

## Changelog

### v2.0.0 (2025-11-04)
- Added Web3 group management API
- Added group payment and AA payment API
- Added red packet system API
- Integrated with GroupChatV2, GroupPayment, and RedPacket smart contracts
- JWT authentication for all endpoints
- Health check endpoints

### v1.0.0 (2024-10-20)
- Initial API release
- Basic authentication
- Traditional database-backed APIs
