# Dchat 更新日志

本文档记录 Dchat 项目的所有重要更新和变更。

## [1.0.1] - 2025-10-20

### 🌐 域名配置

#### 已完成
- ✅ 在阿里云配置 dechat.com DNS 记录
- ✅ 使用 CNAME 记录指向 cname.vercel-dns.com
- ✅ 配置主域名 (@) CNAME 记录
- ✅ 配置 www 子域名 CNAME 记录
- ✅ TTL 设置为 600 秒(10分钟)

#### 配置详情
```
主域名: @ → CNAME → cname.vercel-dns.com
www 子域名: www → CNAME → cname.vercel-dns.com
```

#### 状态
- DNS 已配置完成
- 等待 DNS 传播(预计 10-30 分钟)
- Vercel 域名待添加

### 📚 文档更新

#### 新增文档
- 添加 `docs/DEPLOYMENT_GUIDE.md` - 完整的部署指南
- 添加 `docs/LOGIN_FIX_GUIDE.md` - 登录功能修复指南
- 添加 `docs/DOMAIN_SETUP_GUIDE.md` - 域名配置详细指南
- 添加 `docs/database/supabase_init.sql` - Supabase 数据库初始化脚本

#### 更新文档
- 更新 `docs/README.md` - 添加部署状态和新文档链接
- 更新 `docs/DOMAIN_SETUP_GUIDE.md` - 修正为 CNAME 配置方式

### 🔧 技术改进

#### 后端修复
- 修复 `generateVerificationCode` 函数名不匹配问题
- 添加开发模式验证码返回功能
- 优化错误处理和日志输出

#### 前端优化
- 添加验证码显示功能(开发模式)
- 改进错误提示用户体验

#### 数据库
- 完成 Supabase 数据库初始化
- 创建 users 和 verification_codes 表
- 配置 Row Level Security (RLS) 策略

### 🐛 已知问题

#### 待解决
- [ ] 后端部署未自动更新,需手动触发 Vercel 重新部署
- [ ] DNS 传播中,域名暂时无法访问
- [ ] 邮件服务未配置,验证码无法真实发送

#### 解决方案
- 后端: 在 Vercel Dashboard 手动点击 "Redeploy"
- 域名: 等待 DNS 传播完成(10-30 分钟)
- 邮件: 开发模式下前端会显示验证码

---

## [1.0.0] - 2025-10-19

### 🚀 初始部署

#### 功能实现
- ✅ 四种登录方式: Web3 Wallet, Email, Phone, Alipay
- ✅ 自动钱包创建(Web2 用户)
- ✅ 多语言支持(英语/简体中文)
- ✅ 端到端加密
- ✅ 量子抗性加密
- ✅ 区块链消息存储

#### 部署完成
- ✅ 前端部署到 Vercel: https://dechatcom.vercel.app
- ✅ 后端部署到 Vercel Serverless
- ✅ Supabase 数据库配置

#### 文档创建
- ✅ 白皮书重写
- ✅ 商业计划书
- ✅ 用户手册
- ✅ 技术规范文档
- ✅ 设计系统文档

---

## 版本说明

### 版本号格式
采用语义化版本号: `主版本.次版本.修订号`

- **主版本**: 重大功能变更或架构调整
- **次版本**: 新功能添加或重要改进
- **修订号**: Bug 修复或小幅优化

### 更新频率
- 重大更新: 每月
- 功能更新: 每周
- Bug 修复: 随时

### 贡献指南
欢迎提交 Pull Request 或创建 Issue 报告问题。

---

**维护者**: Dchat Team  
**最后更新**: 2025-10-20 03:20 GMT+8

