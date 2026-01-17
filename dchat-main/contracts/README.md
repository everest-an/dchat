# Dchat Smart Contracts

完整的智能合约套件,用于 Dchat Web3 原生商务通讯平台。

## 📋 合约概述

### 1. MessageStorage.sol
**功能:** 去中心化消息存储

**核心特性:**
- 存储加密消息哈希到区块链
- IPFS 集成用于消息内容存储
- 聊天会话管理
- 消息软删除功能
- 用户消息历史追踪

**主要函数:**
```solidity
function storeMessage(bytes32 _messageHash, address _recipient, string memory _ipfsHash) external returns (bytes32)
function deleteMessage(bytes32 _messageId) external
function getMessage(bytes32 _messageId) external view returns (Message memory)
function getUserSentMessages(address _user) external view returns (bytes32[] memory)
function getUserReceivedMessages(address _user) external view returns (bytes32[] memory)
```

**Gas 优化:**
- 使用 bytes32 存储哈希
- 映射结构优化查询效率
- 事件日志减少存储成本

---

### 2. PaymentEscrow.sol
**功能:** 聊天内加密货币支付和托管

**核心特性:**
- 即时点对点支付
- 托管支付功能
- 平台费用管理
- 支付历史追踪
- 争议处理机制

**主要函数:**
```solidity
function createPayment(address _recipient, string memory _description) external payable returns (bytes32)
function createEscrow(address _payee, uint256 _releaseTime, string memory _terms) external payable returns (bytes32)
function releaseEscrow(bytes32 _escrowId) external
function refundEscrow(bytes32 _escrowId) external
```

**安全特性:**
- 重入攻击保护
- 双方确认机制
- 时间锁定释放
- 平台费率上限

---

### 3. UserIdentity.sol
**功能:** 用户身份验证和信誉系统

**核心特性:**
- 用户资料管理
- LinkedIn 身份验证
- 邮箱验证
- 公司资料管理
- 信誉评分系统
- 用户-公司关联

**主要函数:**
```solidity
function registerUser(string memory _username, string memory _emailHash) external
function verifyLinkedIn(string memory _linkedInId) external
function verifyEmail() external
function registerCompany(string memory _companyId, string memory _companyName, string memory _industry) external
function updateReputation(address _toUser, int256 _score, string memory _comment) external
```

**信誉机制:**
- 初始信誉分数: 100
- LinkedIn 验证: +50
- 邮箱验证: +20
- 用户评价: ±5

---

### 4. ProjectCollaboration.sol
**功能:** 项目协作和资源共享

**核心特性:**
- 项目创建和管理
- 协作者管理
- 里程碑追踪
- 资源共享
- 进度管理
- 公开/私有项目

**主要函数:**
```solidity
function createProject(string memory _name, string memory _description, bool _isPublic) external returns (bytes32)
function addCollaborator(bytes32 _projectId, address _collaborator, string memory _role) external
function addMilestone(bytes32 _projectId, string memory _title, string memory _description, uint256 _dueDate, uint256 _reward) external payable returns (bytes32)
function completeMilestone(bytes32 _projectId, uint256 _milestoneIndex) external
function addResource(bytes32 _projectId, string memory _resourceType, string memory _name, string memory _description) external returns (bytes32)
```

**项目状态:**
- Planning (规划中)
- Active (进行中)
- Paused (暂停)
- Completed (已完成)
- Cancelled (已取消)

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd contracts
npm install
```

### 2. 配置环境变量

创建 `.env` 文件:

```env
# Private Key (不要提交到 Git!)
PRIVATE_KEY=your_private_key_here

# RPC URLs
SEPOLIA_RPC_URL=https://rpc.sepolia.org
GOERLI_RPC_URL=https://rpc.goerli.eth.gateway.fm
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com

# Etherscan API Keys
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

### 3. 编译合约

```bash
npm run compile
```

### 4. 部署合约

**本地测试网:**
```bash
npm run deploy:local
```

**Sepolia 测试网:**
```bash
npm run deploy:sepolia
```

**Goerli 测试网:**
```bash
npm run deploy:goerli
```

**Mumbai 测试网:**
```bash
npm run deploy:mumbai
```

### 5. 验证合约

部署脚本会自动在 Etherscan 上验证合约。如需手动验证:

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

---

## 🧪 测试

运行测试套件:

```bash
npm run test
```

---

## 📊 Gas 成本估算

| 合约 | 部署成本 (Gas) | 部署成本 (ETH @ 50 Gwei) |
|------|---------------|-------------------------|
| MessageStorage | ~2,500,000 | ~0.125 ETH |
| PaymentEscrow | ~2,000,000 | ~0.100 ETH |
| UserIdentity | ~3,000,000 | ~0.150 ETH |
| ProjectCollaboration | ~3,500,000 | ~0.175 ETH |
| **总计** | **~11,000,000** | **~0.550 ETH** |

**主要操作 Gas 成本:**

| 操作 | Gas 成本 | 成本 (ETH @ 50 Gwei) |
|------|---------|---------------------|
| 存储消息 | ~150,000 | ~0.0075 ETH |
| 创建支付 | ~100,000 | ~0.0050 ETH |
| 创建托管 | ~200,000 | ~0.0100 ETH |
| 注册用户 | ~180,000 | ~0.0090 ETH |
| 创建项目 | ~250,000 | ~0.0125 ETH |

---

## 🔐 安全特性

### 1. 访问控制
- 仅消息参与者可查看消息
- 仅项目所有者可管理项目
- 仅协作者可访问项目资源

### 2. 输入验证
- 地址有效性检查
- 金额范围验证
- 字符串长度限制
- 状态一致性检查

### 3. 重入保护
- 使用 Checks-Effects-Interactions 模式
- 状态更新在外部调用之前

### 4. 溢出保护
- Solidity 0.8.x 内置溢出检查
- 显式范围验证

---

## 📈 黑客松评审标准对应

### 1. 技术执行 (35%)

**代码质量:**
- ✅ 遵循 Solidity 最佳实践
- ✅ 完整的事件日志
- ✅ 详细的注释文档
- ✅ 模块化设计

**架构合理性:**
- ✅ 4 个独立合约,职责分离
- ✅ 可扩展的数据结构
- ✅ Gas 优化设计

**功能完整度:**
- ✅ 消息存储 ✓
- ✅ 支付托管 ✓
- ✅ 身份验证 ✓
- ✅ 项目协作 ✓

**测试网运行:**
- ✅ Sepolia 部署就绪
- ✅ Goerli 部署就绪
- ✅ Mumbai 部署就绪

### 2. 创新创造力 (30%)

**技术创新:**
- ✅ IPFS + 区块链混合存储
- ✅ LinkedIn + Web3 身份融合
- ✅ 量子抗性加密设计
- ✅ 信誉评分系统

**架构创新:**
- ✅ 模块化合约设计
- ✅ 事件驱动架构
- ✅ 链上/链下混合存储

### 3. 实用与影响力 (15%)

**解决真实问题:**
- ✅ 商务通讯安全
- ✅ 数据主权控制
- ✅ 支付信任问题
- ✅ 身份验证需求

**以太坊生态贡献:**
- ✅ 企业级应用示范
- ✅ 开源合约代码
- ✅ 最佳实践参考

### 4. 用户体验 (10%)

**简单直观:**
- ✅ 清晰的函数命名
- ✅ 完整的错误提示
- ✅ 事件日志追踪

**安全可靠:**
- ✅ 多重安全检查
- ✅ 状态一致性保证
- ✅ 失败回滚机制

### 5. 黑客松进展 (10%)

**开发速度:**
- ✅ 4 个完整合约
- ✅ 部署脚本完善
- ✅ 文档齐全

**可运行 Demo:**
- ✅ 本地测试通过
- ✅ 测试网部署就绪
- ✅ 前端集成接口

---

## 🔗 合约交互示例

### JavaScript (ethers.js)

```javascript
const { ethers } = require("ethers");

// 连接到合约
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const messageStorage = new ethers.Contract(
  MESSAGE_STORAGE_ADDRESS,
  MESSAGE_STORAGE_ABI,
  signer
);

// 存储消息
const messageHash = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("Encrypted message content")
);
const tx = await messageStorage.storeMessage(
  messageHash,
  recipientAddress,
  "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" // IPFS hash
);
await tx.wait();

// 获取消息
const message = await messageStorage.getMessage(messageId);
console.log("Message:", message);
```

---

## 📝 License

MIT License - 详见 [LICENSE](../LICENSE) 文件

---

## 🤝 贡献

欢迎提交 Pull Request 和 Issue!

---

## 📞 联系方式

- **GitHub:** https://github.com/everest-an/dchat
- **Demo:** https://dechatcom.vercel.app

---

**Dchat - 用 Web3 技术构建安全商务通讯的未来!** 🚀

