# 🎉 Dchat 智能合约部署完成!

## 📋 部署信息

**网络**: Ethereum Sepolia Testnet  
**部署者**: 0x66794fC75C351ad9677cB00B2043868C11dfcadA  
**部署时间**: 2025-10-20T11:33:49.405Z  
**剩余余额**: 0.099 ETH

---

## 📝 合约地址

### 1. MessageStorage (消息存储合约)
**地址**: `0x5a7f2f9538D6a5044142123c12A254F73bf77F6f`  
**Etherscan**: https://sepolia.etherscan.io/address/0x5a7f2f9538D6a5044142123c12A254F73bf77F6f

**功能**:
- 存储加密消息哈希到区块链
- IPFS 集成用于消息内容存储
- 聊天会话管理
- 消息软删除功能

### 2. PaymentEscrow (支付托管合约)
**地址**: `0xB71fD2eD9a15A2Bef002b1206A97e9Bddd7436d6`  
**Etherscan**: https://sepolia.etherscan.io/address/0xB71fD2eD9a15A2Bef002b1206A97e9Bddd7436d6

**功能**:
- 即时点对点支付
- 托管支付功能
- 平台费用管理(0.5%)
- 支付历史追踪

### 3. UserIdentity (用户身份合约)
**地址**: `0x32a75De07Cd3FE59A8437445BE37D0546B4Bb17a`  
**Etherscan**: https://sepolia.etherscan.io/address/0x32a75De07Cd3FE59A8437445BE37D0546B4Bb17a

**功能**:
- 用户资料管理
- LinkedIn 身份验证
- 邮箱验证
- 信誉评分系统

### 4. ProjectCollaboration (项目协作合约)
**地址**: `0x09668e0764B43E8093a65d33620DeAd9BDa1d85c`  
**Etherscan**: https://sepolia.etherscan.io/address/0x09668e0764B43E8093a65d33620DeAd9BDa1d85c

**功能**:
- 项目创建和管理
- 协作者管理
- 里程碑追踪
- 资源共享

---

## 🚀 如何使用

### 1. 连接 MetaMask

1. 打开 MetaMask 浏览器扩展
2. 切换到 **Sepolia 测试网**
3. 确保您的钱包有足够的 Sepolia ETH

**获取测试 ETH**:
- Sepolia Faucet: https://sepoliafaucet.com/
- Alchemy Faucet: https://sepoliafaucet.com/
- Infura Faucet: https://www.infura.io/faucet/sepolia

### 2. 访问 Dchat 应用

**在线 Demo**: https://dechatcom.vercel.app

或本地运行:

```bash
# 克隆仓库
git clone https://github.com/everest-an/dchat.git
cd dchat

# 安装依赖
cd frontend
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

### 3. 注册用户

```javascript
// 使用 UserIdentity 合约
const userIdentity = new ethers.Contract(
  '0x32a75De07Cd3FE59A8437445BE37D0546B4Bb17a',
  UserIdentityABI,
  signer
);

// 注册用户
await userIdentity.registerUser('YourUsername', 'emailHash');
```

### 4. 发送消息

```javascript
// 使用 MessageStorage 合约
const messageStorage = new ethers.Contract(
  '0x5a7f2f9538D6a5044142123c12A254F73bf77F6f',
  MessageStorageABI,
  signer
);

// 存储消息
const tx = await messageStorage.storeMessage(
  recipientAddress,
  messageHash,
  ipfsHash
);
await tx.wait();
```

### 5. 创建支付

```javascript
// 使用 PaymentEscrow 合约
const paymentEscrow = new ethers.Contract(
  '0xB71fD2eD9a15A2Bef002b1206A97e9Bddd7436d6',
  PaymentEscrowABI,
  signer
);

// 创建即时支付
const tx = await paymentEscrow.createPayment(
  payeeAddress,
  'Payment for services',
  { value: ethers.parseEther('0.01') }
);
await tx.wait();
```

### 6. 创建项目

```javascript
// 使用 ProjectCollaboration 合约
const projectCollab = new ethers.Contract(
  '0x09668e0764B43E8093a65d33620DeAd9BDa1d85c',
  ProjectCollaborationABI,
  signer
);

// 创建项目
const tx = await projectCollab.createProject(
  'My Project',
  'Project description',
  true // isPublic
);
await tx.wait();
```

---

## 🔧 前端集成

### 环境变量配置

创建 `frontend/.env.local` 文件:

```env
VITE_CHAIN_ID=11155111
VITE_NETWORK_NAME=sepolia
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<ALCHEMY_API_KEY>

VITE_MESSAGE_STORAGE_ADDRESS=0x5a7f2f9538D6a5044142123c12A254F73bf77F6f
VITE_PAYMENT_ESCROW_ADDRESS=0xB71fD2eD9a15A2Bef002b1206A97e9Bddd7436d6
VITE_USER_IDENTITY_ADDRESS=0x32a75De07Cd3FE59A8437445BE37D0546B4Bb17a
VITE_PROJECT_COLLABORATION_ADDRESS=0x09668e0764B43E8093a65d33620DeAd9BDa1d85c
```

### 使用合约配置

```javascript
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, RPC_URL } from './config/contracts';
import { ethers } from 'ethers';

// 连接到 Sepolia
const provider = new ethers.JsonRpcProvider(RPC_URL);

// 获取合约实例
const messageStorage = new ethers.Contract(
  CONTRACT_ADDRESSES.MessageStorage,
  CONTRACT_ABIS.MessageStorage,
  provider
);

// 使用 signer 进行交易
const signer = await provider.getSigner();
const messageStorageWithSigner = messageStorage.connect(signer);
```

---

## 📊 测试用例

### 测试 1: 注册用户

```bash
# 使用 Hardhat console
npx hardhat console --network sepolia

# 在 console 中
const UserIdentity = await ethers.getContractFactory("UserIdentity");
const userIdentity = await UserIdentity.attach("0x32a75De07Cd3FE59A8437445BE37D0546B4Bb17a");

// 注册用户
await userIdentity.registerUser("Alice", "alice@example.com");

// 查询用户
const profile = await userIdentity.getUserProfile("YOUR_ADDRESS");
console.log(profile);
```

### 测试 2: 发送消息

```bash
# 存储消息
const messageHash = ethers.keccak256(ethers.toUtf8Bytes("Hello World"));
const ipfsHash = "QmTest123...";
const recipientAddress = "0x...";

await messageStorage.storeMessage(recipientAddress, messageHash, ipfsHash);

// 查询消息
const sentMessages = await messageStorage.getUserSentMessages("YOUR_ADDRESS");
console.log(sentMessages);
```

### 测试 3: 创建支付

```bash
# 创建支付
const payeeAddress = "0x...";
const amount = ethers.parseEther("0.01");

await paymentEscrow.createPayment(payeeAddress, "Test payment", { value: amount });
```

---

## 🐛 故障排查

### 问题 1: MetaMask 连接失败

**解决方案**:
1. 确保 MetaMask 已安装并解锁
2. 切换到 Sepolia 测试网
3. 刷新页面

### 问题 2: 交易失败

**解决方案**:
1. 检查钱包余额是否足够
2. 增加 Gas Limit
3. 查看 Etherscan 上的交易详情

### 问题 3: 合约调用失败

**解决方案**:
1. 确认合约地址正确
2. 检查 ABI 是否匹配
3. 确认网络是 Sepolia

---

## 📚 相关链接

- **GitHub 仓库**: https://github.com/everest-an/dchat
- **在线 Demo**: https://dechatcom.vercel.app
- **Sepolia Etherscan**: https://sepolia.etherscan.io
- **Sepolia Faucet**: https://sepoliafaucet.com
- **Alchemy Dashboard**: https://dashboard.alchemy.com

---

## 🎯 下一步

1. ✅ 智能合约已部署
2. ✅ 前端配置已更新
3. ⏳ 测试所有功能
4. ⏳ 录制 Demo 视频
5. ⏳ 提交到 ETHShanghai 2025

---

**Dchat - 用 Web3 技术构建安全商务通讯的未来!** 🚀

