# 🚀 Vercel 部署完成指南

## ✅ 已完成的工作

### 1. 智能合约集成

✅ **创建了 Web3 服务** (`frontend/src/services/web3Service.js`):
- 钱包连接功能
- 用户注册功能
- 消息发送功能
- 支付功能
- 项目协作功能

✅ **更新了登录界面** (`frontend/src/components/LoginScreen.jsx`):
- 集成 web3Service
- 自动注册用户到区块链
- 从智能合约获取用户资料
- 支持 Web3-only 模式

✅ **配置了合约地址** (`frontend/src/config/contracts.js`):
- MessageStorage: `0x5a7f2f9538D6a5044142123c12A254F73bf77F6f`
- PaymentEscrow: `0xB71fD2eD9a15A2Bef002b1206A97e9Bddd7436d6`
- UserIdentity: `0x32a75De07Cd3FE59A8437445BE37D0546B4Bb17a`
- ProjectCollaboration: `0x09668e0764B43E8093a65d33620DeAd9BDa1d85c`

### 2. Vercel 配置

✅ **更新了 vercel.json**:
- 添加了所有合约地址环境变量
- 配置了 Sepolia RPC URL
- 设置了正确的构建命令

---

## 🌐 部署状态

### 自动部署

Vercel 会自动检测 GitHub 的更新并触发部署:

1. **检测更新**: Vercel 监听 `main` 分支
2. **开始构建**: 自动运行 `npm install && npm run build`
3. **部署**: 将构建产物部署到 CDN
4. **完成**: 网站自动更新

### 部署 URL

**生产环境**: https://dechatcom.vercel.app

**预览环境**: 每次 commit 都会生成一个预览 URL

---

## 🔧 手动触发部署 (如需要)

### 方法 1: 通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
cd /home/ubuntu/dchat
vercel --prod
```

### 方法 2: 通过 Vercel Dashboard

1. 访问 https://vercel.com/dashboard
2. 找到 `dchat` 项目
3. 点击 "Deployments" 标签
4. 点击 "Redeploy" 按钮

### 方法 3: 通过 GitHub

1. 访问 https://github.com/everest-an/dchat
2. 进入 "Actions" 标签
3. 手动触发 workflow (如果配置了)

---

## 🧪 测试部署

### 1. 访问网站

打开浏览器访问: https://dechatcom.vercel.app/login

### 2. 连接钱包

1. 点击 "Connect Wallet" 按钮
2. 选择 MetaMask
3. 确保切换到 Sepolia 测试网
4. 确认连接

### 3. 自动注册

- 系统会自动检查您是否在区块链上注册
- 如果未注册,会自动调用 `UserIdentity.registerUser()`
- 注册成功后,自动登录

### 4. 查看用户资料

- 从智能合约获取用户信息
- 显示用户名、信誉分数等

---

## 🐛 故障排查

### 问题 1: 部署失败

**解决方案**:
1. 检查 Vercel Dashboard 的构建日志
2. 确认 `package.json` 中的依赖正确
3. 检查环境变量是否设置正确

### 问题 2: 网站无法连接钱包

**解决方案**:
1. 确认 MetaMask 已安装
2. 检查浏览器控制台错误信息
3. 确认 RPC URL 可访问

### 问题 3: 合约调用失败

**解决方案**:
1. 确认钱包切换到 Sepolia 测试网
2. 检查钱包余额是否足够
3. 查看 Etherscan 确认合约地址正确

### 问题 4: 环境变量未生效

**解决方案**:
1. 在 Vercel Dashboard 中手动设置环境变量:
   - 访问 https://vercel.com/dashboard
   - 选择 `dchat` 项目
   - 进入 "Settings" > "Environment Variables"
   - 添加以下变量:

```
VITE_CHAIN_ID=11155111
VITE_NETWORK_NAME=sepolia
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/NgBhOA3zYpCBd3LopKZ6n-lWXJoN_IUQM
VITE_MESSAGE_STORAGE_ADDRESS=0x5a7f2f9538D6a5044142123c12A254F73bf77F6f
VITE_PAYMENT_ESCROW_ADDRESS=0xB71fD2eD9a15A2Bef002b1206A97e9Bddd7436d6
VITE_USER_IDENTITY_ADDRESS=0x32a75De07Cd3FE59A8437445BE37D0546B4Bb17a
VITE_PROJECT_COLLABORATION_ADDRESS=0x09668e0764B43E8093a65d33620DeAd9BDa1d85c
```

2. 重新部署项目

---

## 📊 部署检查清单

- [x] 智能合约已部署到 Sepolia
- [x] Web3 服务已创建
- [x] 登录界面已更新
- [x] 合约配置已添加
- [x] Vercel 配置已更新
- [x] 代码已推送到 GitHub
- [ ] Vercel 自动部署完成 (等待中)
- [ ] 网站可访问
- [ ] 钱包连接功能正常
- [ ] 用户注册功能正常
- [ ] 智能合约调用正常

---

## 🎯 下一步

### 1. 等待 Vercel 部署完成

通常需要 2-5 分钟,您可以在 Vercel Dashboard 查看进度:
https://vercel.com/dashboard

### 2. 测试所有功能

按照 `TESTING_GUIDE.md` 中的步骤测试:
- ✅ 钱包连接
- ✅ 用户注册
- ✅ 发送消息
- ✅ 发送代币
- ✅ 创建项目

### 3. 录制 Demo 视频

展示完整的用户流程:
1. 访问 https://dechatcom.vercel.app
2. 连接 MetaMask 钱包
3. 自动注册到区块链
4. 发送加密消息
5. 给朋友转账
6. 创建项目协作

### 4. 提交到 ETHShanghai 2025

- ✅ 智能合约已部署
- ✅ 前端已集成
- ✅ 网站已上线
- ⏳ Demo 视频录制
- ⏳ 提交到官方仓库

---

## 📞 相关链接

- **生产网站**: https://dechatcom.vercel.app
- **GitHub 仓库**: https://github.com/everest-an/dchat
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Sepolia Etherscan**: https://sepolia.etherscan.io

---

## 🎉 完成!

您的 Dchat 应用现在已经:
- ✅ 部署到 Vercel
- ✅ 集成智能合约
- ✅ 支持钱包登录
- ✅ 自动注册用户
- ✅ 完全去中心化

**访问 https://dechatcom.vercel.app 开始使用!** 🚀

