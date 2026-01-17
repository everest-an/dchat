# 🧪 Dchat 完整测试指南

本指南将帮助您测试 Dchat 的所有功能,包括钱包注册、消息发送、代币转账等。

---

## 📋 前提条件

1. ✅ MetaMask 浏览器扩展已安装
2. ✅ 切换到 Sepolia 测试网
3. ✅ 钱包地址: `0x66794fC75C351ad9677cB00B2043868C11dfcadA`
4. ✅ 钱包余额: 0.099 ETH (Sepolia)

---

## 🚀 测试流程

### 第1步: 准备测试账户

您需要至少 2 个钱包地址来测试消息和支付功能:

**主账户** (已有):
- 地址: `0x66794fC75C351ad9677cB00B2043868C11dfcadA`
- 余额: 0.099 ETH

**测试账户** (创建新的):
1. 在 MetaMask 中点击 "创建账户"
2. 记录新账户地址
3. 从主账户转一些 ETH 到测试账户 (0.01 ETH)

---

### 第2步: 注册用户

使用 UserIdentity 合约注册两个用户。

#### 方法 1: 使用 Hardhat Console

```bash
cd /home/ubuntu/dchat/contracts
npx hardhat console --network sepolia
```

在 console 中执行:

```javascript
// 获取合约实例
const UserIdentity = await ethers.getContractFactory("UserIdentity");
const userIdentity = await UserIdentity.attach("0x32a75De07Cd3FE59A8437445BE37D0546B4Bb17a");

// 注册主账户
await userIdentity.registerUser("Alice", ethers.keccak256(ethers.toUtf8Bytes("alice@example.com")));

// 查询用户信息
const profile = await userIdentity.getUserProfile("0x66794fC75C351ad9677cB00B2043868C11dfcadA");
console.log("User Profile:", profile);
```

#### 方法 2: 使用前端界面

1. 访问 https://3000-ixyjkiby886nvvzmloolq-6fee5f36.manusvm.computer/
2. 点击 "Connect Wallet"
3. 选择 MetaMask 并连接
4. 填写用户名和邮箱
5. 点击 "Register" 按钮

---

### 第3步: 发送加密消息

#### 使用 MessageStorage 合约

```javascript
// 在 Hardhat console 中
const MessageStorage = await ethers.getContractFactory("MessageStorage");
const messageStorage = await MessageStorage.attach("0x5a7f2f9538D6a5044142123c12A254F73bf77F6f");

// 准备消息
const message = "Hello from Alice to Bob!";
const messageHash = ethers.keccak256(ethers.toUtf8Bytes(message));
const ipfsHash = "QmTest123..."; // 实际应用中上传到 IPFS
const recipientAddress = "0x..."; // Bob 的地址

// 发送消息
const tx = await messageStorage.storeMessage(recipientAddress, messageHash, ipfsHash);
await tx.wait();
console.log("Message sent! Transaction:", tx.hash);

// 查询已发送的消息
const sentMessages = await messageStorage.getUserSentMessages("0x66794fC75C351ad9677cB00B2043868C11dfcadA");
console.log("Sent messages:", sentMessages);

// 查询消息详情
if (sentMessages.length > 0) {
  const messageDetails = await messageStorage.getMessage(sentMessages[0]);
  console.log("Message details:", messageDetails);
}
```

---

### 第4步: 发送代币和资产

#### 4.1 即时支付 (Instant Payment)

```javascript
// 在 Hardhat console 中
const PaymentEscrow = await ethers.getContractFactory("PaymentEscrow");
const paymentEscrow = await PaymentEscrow.attach("0xB71fD2eD9a15A2Bef002b1206A97e9Bddd7436d6");

// 发送 0.01 ETH 给朋友
const payeeAddress = "0x..."; // 朋友的地址
const amount = ethers.parseEther("0.01");

const tx = await paymentEscrow.createPayment(
  payeeAddress,
  "Payment for coffee ☕",
  { value: amount }
);
await tx.wait();
console.log("Payment sent! Transaction:", tx.hash);

// 查询支付历史
const paymentId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
  ["address", "address", "uint256"],
  [await ethers.provider.getSigner().getAddress(), payeeAddress, Date.now()]
));
const payment = await paymentEscrow.getPayment(paymentId);
console.log("Payment details:", payment);
```

#### 4.2 托管支付 (Escrow Payment)

```javascript
// 创建托管支付 (24小时后释放)
const releaseTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours
const amount = ethers.parseEther("0.02");

const tx = await paymentEscrow.createEscrow(
  payeeAddress,
  releaseTime,
  "Payment for freelance work",
  { value: amount }
);
await tx.wait();
console.log("Escrow created! Transaction:", tx.hash);

// 提前释放托管 (需要是 payer)
const escrowId = "0x..."; // 从事件中获取
await paymentEscrow.releaseEscrow(escrowId);

// 或者退款 (如果有问题)
await paymentEscrow.refundEscrow(escrowId);
```

---

### 第5步: 创建项目协作

```javascript
// 在 Hardhat console 中
const ProjectCollaboration = await ethers.getContractFactory("ProjectCollaboration");
const projectCollab = await ProjectCollaboration.attach("0x09668e0764B43E8093a65d33620DeAd9BDa1d85c");

// 创建项目
const tx = await projectCollab.createProject(
  "Dchat Mobile App",
  "Build iOS and Android apps for Dchat",
  true // public project
);
const receipt = await tx.wait();
console.log("Project created! Transaction:", tx.hash);

// 从事件中获取 projectId
const event = receipt.logs.find(log => log.fragment && log.fragment.name === 'ProjectCreated');
const projectId = event.args.projectId;
console.log("Project ID:", projectId);

// 添加协作者
const collaboratorAddress = "0x..."; // 朋友的地址
await projectCollab.addCollaborator(projectId, collaboratorAddress, 1); // 1 = Developer role

// 添加里程碑
const dueDate = Math.floor(Date.now() / 1000) + 2592000; // 30 days
const reward = ethers.parseEther("0.05");

await projectCollab.addMilestone(
  projectId,
  "Complete UI Design",
  "Design all app screens",
  dueDate,
  reward
);

// 更新进度
await projectCollab.updateProgress(projectId, 25); // 25% complete

// 查询项目信息
const project = await projectCollab.getProject(projectId);
console.log("Project details:", project);
```

---

## 🌐 前端测试

### 启动本地开发服务器

```bash
cd /home/ubuntu/dchat/frontend
npm install
npm run dev
```

访问 http://localhost:5173

### 测试功能清单

#### ✅ 钱包连接
1. 点击 "Connect Wallet" 按钮
2. 选择 MetaMask
3. 确认连接
4. 检查钱包地址显示是否正确

#### ✅ 用户注册
1. 填写用户名
2. 填写邮箱
3. 点击 "Register" 按钮
4. 确认 MetaMask 交易
5. 等待交易确认
6. 检查用户信息是否显示

#### ✅ 发送消息
1. 选择联系人或输入地址
2. 输入消息内容
3. 点击 "Send" 按钮
4. 确认 MetaMask 交易
5. 等待交易确认
6. 检查消息是否出现在聊天记录中

#### ✅ 发送代币
1. 在聊天界面点击 "Send Payment" 按钮
2. 输入金额 (例如: 0.01 ETH)
3. 输入描述 (例如: "Payment for lunch")
4. 选择支付类型 (即时或托管)
5. 确认 MetaMask 交易
6. 等待交易确认
7. 检查支付记录

#### ✅ 创建项目
1. 点击 "Projects" 标签
2. 点击 "Create Project" 按钮
3. 填写项目名称和描述
4. 选择公开/私有
5. 确认 MetaMask 交易
6. 等待交易确认
7. 检查项目是否出现在列表中

---

## 🔍 验证交易

### 在 Etherscan 上查看

1. 访问 https://sepolia.etherscan.io
2. 输入您的钱包地址: `0x66794fC75C351ad9677cB00B2043868C11dfcadA`
3. 查看所有交易记录

### 查看合约交互

**MessageStorage**:
https://sepolia.etherscan.io/address/0x5a7f2f9538D6a5044142123c12A254F73bf77F6f

**PaymentEscrow**:
https://sepolia.etherscan.io/address/0xB71fD2eD9a15A2Bef002b1206A97e9Bddd7436d6

**UserIdentity**:
https://sepolia.etherscan.io/address/0x32a75De07Cd3FE59A8437445BE37D0546B4Bb17a

**ProjectCollaboration**:
https://sepolia.etherscan.io/address/0x09668e0764B43E8093a65d33620DeAd9BDa1d85c

---

## 📱 完整测试场景

### 场景 1: Alice 和 Bob 的商务对话

1. **Alice 注册账户**
   ```javascript
   await userIdentity.registerUser("Alice", emailHash);
   ```

2. **Bob 注册账户**
   ```javascript
   // 切换到 Bob 的钱包
   await userIdentity.registerUser("Bob", emailHash);
   ```

3. **Alice 发送消息给 Bob**
   ```javascript
   await messageStorage.storeMessage(bobAddress, messageHash, ipfsHash);
   ```

4. **Alice 向 Bob 支付项目款项**
   ```javascript
   await paymentEscrow.createEscrow(bobAddress, releaseTime, "Project payment", { value: amount });
   ```

5. **Alice 创建项目并邀请 Bob**
   ```javascript
   const projectId = await projectCollab.createProject("Joint Venture", "...", true);
   await projectCollab.addCollaborator(projectId, bobAddress, 1);
   ```

6. **Bob 完成里程碑**
   ```javascript
   // 切换到 Bob 的钱包
   await projectCollab.completeMilestone(projectId, milestoneId);
   ```

7. **Alice 释放托管款项**
   ```javascript
   // 切换回 Alice 的钱包
   await paymentEscrow.releaseEscrow(escrowId);
   ```

---

## 🐛 常见问题

### Q1: 交易失败 "insufficient funds"

**解决方案**:
- 确保钱包有足够的 ETH
- 从 https://sepoliafaucet.com 获取测试 ETH

### Q2: MetaMask 显示 "Wrong Network"

**解决方案**:
- 在 MetaMask 中切换到 Sepolia 测试网
- 或者添加 Sepolia 网络:
  - Network Name: Sepolia
  - RPC URL: https://ethereum-sepolia-rpc.publicnode.com
  - Chain ID: 11155111
  - Currency Symbol: ETH

### Q3: 合约调用失败

**解决方案**:
- 检查合约地址是否正确
- 确认您已注册用户
- 增加 Gas Limit

### Q4: 消息无法显示

**解决方案**:
- 检查 IPFS 连接
- 确认消息已存储到区块链
- 查看 Etherscan 确认交易状态

---

## 📊 性能测试

### Gas 消耗测试

```javascript
// 测试各个函数的 Gas 消耗
const functions = [
  { name: "registerUser", fn: () => userIdentity.registerUser("Test", "hash") },
  { name: "storeMessage", fn: () => messageStorage.storeMessage(addr, hash, ipfs) },
  { name: "createPayment", fn: () => paymentEscrow.createPayment(addr, "test", { value: amt }) },
  { name: "createProject", fn: () => projectCollab.createProject("Test", "desc", true) },
];

for (const { name, fn } of functions) {
  const tx = await fn();
  const receipt = await tx.wait();
  console.log(`${name} Gas Used:`, receipt.gasUsed.toString());
}
```

---

## ✅ 测试检查清单

- [ ] 钱包连接成功
- [ ] 用户注册成功
- [ ] LinkedIn 验证 (可选)
- [ ] 邮箱验证 (可选)
- [ ] 发送消息成功
- [ ] 接收消息成功
- [ ] 即时支付成功
- [ ] 托管支付创建成功
- [ ] 托管支付释放成功
- [ ] 项目创建成功
- [ ] 添加协作者成功
- [ ] 添加里程碑成功
- [ ] 完成里程碑成功
- [ ] 更新项目进度成功
- [ ] 所有交易在 Etherscan 上可见
- [ ] Gas 费用合理
- [ ] 用户体验流畅

---

**祝测试顺利!如有问题,请查看 DEPLOYMENT_COMPLETE.md 或联系开发团队。** 🚀

