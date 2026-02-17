# DChat 部署指南

本文档提供 DChat 应用的完整部署流程。

## 📋 目录

1. [前置要求](#前置要求)
2. [智能合约部署](#智能合约部署)
3. [前端配置](#前端配置)
4. [Vercel 部署](#vercel-部署)
5. [环境变量配置](#环境变量配置)
6. [测试验证](#测试验证)

---

## 前置要求

### 开发环境

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- MetaMask 钱包

### 账户准备

1. **以太坊测试网账户**
   - 准备一个 Sepolia 测试网账户
   - 获取测试 ETH: https://sepoliafaucet.com/

2. **Vercel 账户**
   - 注册 Vercel 账户: https://vercel.com/signup
   - 连接 GitHub 账户

3. **Alchemy API Key** (可选,用于更好的 RPC 性能)
   - 注册 Alchemy: https://www.alchemy.com/
   - 创建 Sepolia 应用并获取 API Key

---

## 智能合约部署

### 1. 安装依赖

```bash
cd contracts
npm install
```

### 2. 配置环境变量

创建 `contracts/.env` 文件:

```env
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key (可选,用于验证合约)
```

⚠️ **安全提示**: 
- 不要将私钥提交到 Git
- 使用测试网账户,不要使用主网私钥
- `.env` 文件已添加到 `.gitignore`

### 3. 编译合约

```bash
npx hardhat compile
```

### 4. 部署合约

部署所有合约到 Sepolia 测试网:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

部署成功后,会生成 `deployment-addresses.json` 文件,包含所有合约地址。

### 5. 验证合约 (可选)

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

---

## 前端配置

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 配置环境变量

创建 `frontend/.env` 文件:

```env
# 网络配置
VITE_CHAIN_ID=11155111
VITE_NETWORK_NAME=sepolia
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_api_key

# 合约地址 (从 deployment-addresses.json 复制)
VITE_MESSAGE_STORAGE_ADDRESS=0x...
VITE_PAYMENT_ESCROW_ADDRESS=0x...
VITE_USER_IDENTITY_ADDRESS=0x...
VITE_PROJECT_COLLABORATION_ADDRESS=0x...
VITE_LIVING_PORTFOLIO_ADDRESS=0x...
VITE_VERIFIED_CREDENTIALS_ADDRESS=0x...
```

### 3. 本地开发测试

```bash
npm run dev
```

访问 http://localhost:5173 测试应用。

### 4. 构建生产版本

```bash
npm run build
```

构建产物位于 `frontend/dist` 目录。

---

## Vercel 部署

### 方法 1: 通过 Vercel CLI (推荐)

#### 1. 安装 Vercel CLI

```bash
npm install -g vercel
```

#### 2. 登录 Vercel

```bash
vercel login
```

#### 3. 部署项目

在项目根目录执行:

```bash
vercel
```

首次部署会询问项目配置:
- Project name: `dchat`
- Directory: `./` (项目根目录)
- Build command: 自动检测
- Output directory: `frontend/dist`

#### 4. 配置环境变量

```bash
# 添加环境变量
vercel env add VITE_CHAIN_ID production
vercel env add VITE_NETWORK_NAME production
vercel env add VITE_RPC_URL production
# ... 添加所有必需的环境变量
```

或在 Vercel Dashboard 中配置:
1. 进入项目设置
2. 选择 Environment Variables
3. 添加所有环境变量

#### 5. 生产部署

```bash
vercel --prod
```

### 方法 2: 通过 GitHub 集成

#### 1. 推送代码到 GitHub

```bash
git add .
git commit -m "Add Web3 features"
git push origin main
```

#### 2. 在 Vercel 导入项目

1. 访问 https://vercel.com/new
2. 选择 Import Git Repository
3. 选择 `dchat` 仓库
4. 配置构建设置:
   - Framework Preset: Vite
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/dist`
   - Install Command: `echo 'Skipping root install'`

#### 3. 配置环境变量

在 Vercel 项目设置中添加所有环境变量(参考上面的列表)。

#### 4. 部署

点击 Deploy 按钮,Vercel 会自动构建和部署。

---

## 环境变量配置

### 必需的环境变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `VITE_CHAIN_ID` | 链 ID | `11155111` (Sepolia) |
| `VITE_NETWORK_NAME` | 网络名称 | `sepolia` |
| `VITE_RPC_URL` | RPC 端点 | `https://eth-sepolia.g.alchemy.com/v2/...` |
| `VITE_MESSAGE_STORAGE_ADDRESS` | MessageStorage 合约地址 | `0x...` |
| `VITE_PAYMENT_ESCROW_ADDRESS` | PaymentEscrow 合约地址 | `0x...` |
| `VITE_USER_IDENTITY_ADDRESS` | UserIdentity 合约地址 | `0x...` |
| `VITE_PROJECT_COLLABORATION_ADDRESS` | ProjectCollaboration 合约地址 | `0x...` |
| `VITE_LIVING_PORTFOLIO_ADDRESS` | LivingPortfolio 合约地址 | `0x...` |
| `VITE_VERIFIED_CREDENTIALS_ADDRESS` | VerifiedCredentials 合约地址 | `0x...` |

### 可选的环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_IPFS_GATEWAY` | IPFS 网关 URL | `https://ipfs.io/ipfs/` |
| `VITE_EXPLORER_URL` | 区块浏览器 URL | `https://sepolia.etherscan.io` |

---

## 测试验证

### 1. 功能测试清单

部署完成后,按以下清单测试所有功能:

#### Web3 连接
- [ ] MetaMask 钱包连接
- [ ] 网络切换到 Sepolia
- [ ] 账户余额显示
- [ ] 断开连接功能

#### Living Portfolio
- [ ] 创建作品集
- [ ] 添加项目
- [ ] 更新可用性状态
- [ ] 查看凭证

#### Passive Discovery
- [ ] 订阅用户
- [ ] 接收通知
- [ ] 取消订阅
- [ ] 查看订阅列表

#### Opportunity Matching
- [ ] 创建匹配需求
- [ ] 查看匹配结果
- [ ] 匹配分数显示
- [ ] 联系匹配用户

#### Payment Escrow
- [ ] 创建托管支付
- [ ] 释放资金
- [ ] 申请退款
- [ ] 提起争议

### 2. 性能测试

- [ ] 页面加载速度 < 3s
- [ ] 合约交互响应时间 < 5s
- [ ] 移动端适配正常
- [ ] 不同浏览器兼容性

### 3. 安全测试

- [ ] 私钥不会暴露
- [ ] 交易需要用户确认
- [ ] 输入验证正常
- [ ] XSS/CSRF 防护

---

## 常见问题

### Q1: 合约部署失败

**A**: 检查以下几点:
- 账户是否有足够的测试 ETH
- RPC URL 是否正确
- 私钥格式是否正确(不要包含 0x 前缀)

### Q2: 前端无法连接合约

**A**: 检查:
- 合约地址是否正确配置
- MetaMask 是否连接到 Sepolia 网络
- 浏览器控制台是否有错误信息

### Q3: Vercel 构建失败

**A**: 常见原因:
- 环境变量未配置
- 构建命令错误
- 依赖安装失败(尝试使用 `--legacy-peer-deps`)

### Q4: 交易失败

**A**: 可能原因:
- Gas 费用不足
- 合约逻辑错误
- 网络拥堵
- 查看 Etherscan 获取详细错误信息

---

## 更新部署

### 更新智能合约

⚠️ **注意**: 智能合约部署后无法修改,只能重新部署。

1. 修改合约代码
2. 重新编译: `npx hardhat compile`
3. 重新部署: `npx hardhat run scripts/deploy.js --network sepolia`
4. 更新前端环境变量中的合约地址
5. 重新部署前端

### 更新前端

#### 通过 Vercel CLI:
```bash
git add .
git commit -m "Update frontend"
git push
vercel --prod
```

#### 通过 GitHub:
```bash
git add .
git commit -m "Update frontend"
git push origin main
```

Vercel 会自动检测推送并重新部署。

---

## 监控和维护

### 1. Vercel Analytics

在 Vercel Dashboard 中查看:
- 访问量统计
- 性能指标
- 错误日志

### 2. 合约监控

使用 Etherscan 监控:
- 交易历史
- 事件日志
- 合约状态

### 3. 日志查看

```bash
# Vercel 日志
vercel logs

# 本地开发日志
npm run dev
```

---

## 安全建议

1. **私钥管理**
   - 使用环境变量存储私钥
   - 不要将私钥提交到代码仓库
   - 定期轮换密钥

2. **合约安全**
   - 进行安全审计
   - 使用 OpenZeppelin 等经过审计的库
   - 实施访问控制

3. **前端安全**
   - 验证所有用户输入
   - 使用 HTTPS
   - 实施 CSP (Content Security Policy)

4. **监控告警**
   - 设置异常交易告警
   - 监控合约余额
   - 跟踪错误率

---

## 支持和资源

- **项目文档**: [README.md](./README.md)
- **白皮书**: [docs/whitepaper/dchat-whitepaper.md](./docs/whitepaper/dchat-whitepaper.md)
- **GitHub Issues**: https://github.com/everest-an/dchat/issues
- **Vercel 文档**: https://vercel.com/docs
- **Hardhat 文档**: https://hardhat.org/docs

---

## 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件
