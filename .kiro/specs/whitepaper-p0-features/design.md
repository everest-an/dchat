# Design Document: Whitepaper P0 Features

## Overview

本设计文档描述了 Dchat 白皮书中 P0 级别核心功能的技术实现方案。这些功能包括端到端加密、公钥管理、IPFS 去中心化存储、智能机会匹配和细粒度隐私控制。

设计目标是在现有代码基础上进行增强和集成，而不是重写现有功能。

## Architecture

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  ChatRoom    │  │   Profile    │  │  Opportunity │          │
│  │  (Enhanced)  │  │  (Enhanced)  │  │    Feed      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                 │                   │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              Service Layer (Enhanced)                 │      │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐       │      │
│  │  │ Encryption │ │   IPFS     │ │  Privacy   │       │      │
│  │  │  Service   │ │  Service   │ │  Service   │       │      │
│  │  └────────────┘ └────────────┘ └────────────┘       │      │
│  │  ┌────────────┐ ┌────────────┐                      │      │
│  │  │ KeyMgmt    │ │ Opportunity│                      │      │
│  │  │  Service   │ │  Service   │                      │      │
│  │  └────────────┘ └────────────┘                      │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PublicKey   │  │   Privacy    │  │  Matching    │          │
│  │  Controller  │  │  Controller  │  │  Controller  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                 │                   │
│  ┌──────────────────────────────────────────────────────┐      │
│  │                   Supabase Database                   │      │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐       │      │
│  │  │ public_keys│ │  privacy   │ │ opportunity│       │      │
│  │  │   table    │ │  settings  │ │  matches   │       │      │
│  │  └────────────┘ └────────────┘ └────────────┘       │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     External Services                            │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   Pinata     │  │   LinkedIn   │                            │
│  │   (IPFS)     │  │     API      │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. 端到端加密系统 (E2E Encryption)

#### 1.1 EncryptionService (增强)

现有的 `EncryptionService.js` 已实现基础加密功能，需要增强以下能力：

```javascript
// frontend/src/services/EncryptionService.js (增强)

class EncryptionService {
  // 现有方法保持不变
  
  // 新增: 消息签名
  async signMessage(message, privateKey) {
    // 使用 RSASSA-PKCS1-v1_5 签名
  }
  
  // 新增: 验证签名
  async verifySignature(message, signature, publicKey) {
    // 验证消息签名
  }
  
  // 新增: 创建加密消息信封
  async createMessageEnvelope(message, recipientPublicKey, senderPrivateKey) {
    // 返回 { encryptedContent, signature, senderKeyHash, timestamp, iv }
  }
  
  // 新增: 解密并验证消息信封
  async openMessageEnvelope(envelope, recipientPrivateKey, senderPublicKey) {
    // 验证签名后解密
  }
}
```

#### 1.2 ChatRoom 集成

```javascript
// frontend/src/components/ChatRoom.jsx (修改)

// 发送消息时
const sendMessage = async () => {
  // 1. 获取接收者公钥
  const recipientPublicKey = await KeyManagementService.getPublicKey(recipientAddress)
  
  // 2. 创建加密消息信封
  const envelope = await EncryptionService.createMessageEnvelope(
    message,
    recipientPublicKey,
    myPrivateKey
  )
  
  // 3. 发送加密消息
  await messageService.sendMessage(envelope)
}

// 接收消息时
const decryptMessage = async (envelope) => {
  // 1. 获取发送者公钥
  const senderPublicKey = await KeyManagementService.getPublicKey(envelope.senderAddress)
  
  // 2. 验证并解密
  const { message, verified } = await EncryptionService.openMessageEnvelope(
    envelope,
    myPrivateKey,
    senderPublicKey
  )
  
  // 3. 显示消息 (如果未验证则显示警告)
  return { message, verified }
}
```

### 2. 公钥管理系统 (Public Key Manager)

#### 2.1 后端 API

```javascript
// backend/src/controllers/publicKeyController.js (新建)

const publicKeyController = {
  // 注册公钥
  async registerPublicKey(req, res) {
    const { userId, walletAddress, publicKey, keyFormat } = req.body
    // 验证密钥格式
    // 存储到 Supabase
  },
  
  // 通过钱包地址获取公钥
  async getPublicKeyByAddress(req, res) {
    const { address } = req.params
    // 从缓存或数据库获取
  },
  
  // 通过用户 ID 获取公钥
  async getPublicKeyByUserId(req, res) {
    const { userId } = req.params
    // 从缓存或数据库获取
  },
  
  // 轮换密钥
  async rotateKey(req, res) {
    const { userId, newPublicKey } = req.body
    // 保存旧密钥到历史
    // 更新当前密钥
  },
  
  // 获取密钥历史
  async getKeyHistory(req, res) {
    const { userId } = req.params
    // 返回密钥历史列表
  }
}
```

#### 2.2 数据库表结构

```sql
-- backend/src/scripts/init-supabase.sql (追加)

-- 公钥存储表
CREATE TABLE IF NOT EXISTS public_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  wallet_address VARCHAR(42) NOT NULL,
  public_key TEXT NOT NULL,
  key_format VARCHAR(10) DEFAULT 'PEM', -- PEM or JWK
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rotated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(wallet_address, is_current) WHERE is_current = true
);

-- 公钥历史表 (用于解密旧消息)
CREATE TABLE IF NOT EXISTS public_key_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  wallet_address VARCHAR(42) NOT NULL,
  public_key TEXT NOT NULL,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_public_keys_address ON public_keys(wallet_address);
CREATE INDEX idx_public_keys_user ON public_keys(user_id);
```

### 3. IPFS 去中心化存储 (增强)

#### 3.1 IPFSService (增强)

```javascript
// frontend/src/services/IPFSService.js (增强)

class IPFSService {
  // 现有方法保持不变
  
  // 新增: 加密文件上传
  async uploadEncryptedFile(file, recipientPublicKey) {
    // 1. 验证文件大小和类型
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('File size exceeds 50MB limit')
    }
    
    // 2. 生成对称密钥
    const symmetricKey = await EncryptionService.generateSymmetricKey()
    
    // 3. 使用对称密钥加密文件
    const encryptedFile = await this.encryptFile(file, symmetricKey)
    
    // 4. 使用接收者公钥加密对称密钥
    const encryptedKey = await EncryptionService.encryptWithPublicKey(
      symmetricKey,
      recipientPublicKey
    )
    
    // 5. 上传到 IPFS
    const cid = await this.uploadFile(encryptedFile)
    
    // 6. 返回 CID 和加密密钥
    return {
      cid,
      encryptedKey,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    }
  }
  
  // 新增: 解密文件下载
  async downloadDecryptedFile(cid, encryptedKey, privateKey) {
    // 1. 从 IPFS 获取加密文件
    const encryptedFile = await this.fetchFile(cid)
    
    // 2. 使用私钥解密对称密钥
    const symmetricKey = await EncryptionService.decryptWithPrivateKey(
      encryptedKey,
      privateKey
    )
    
    // 3. 使用对称密钥解密文件
    const decryptedFile = await this.decryptFile(encryptedFile, symmetricKey)
    
    return decryptedFile
  }
  
  // 新增: 生成缩略图
  async generateThumbnail(file) {
    if (!file.type.startsWith('image/')) return null
    // 生成小尺寸预览图
  }
}
```

#### 3.2 文件消息 UI 组件

```javascript
// frontend/src/components/FileMessage.jsx (新建)

const FileMessage = ({ message, onDownload }) => {
  const { cid, fileName, fileSize, fileType, thumbnail } = message.fileData
  
  return (
    <div className="file-message">
      {thumbnail && <img src={thumbnail} alt="preview" />}
      <div className="file-info">
        <span className="file-name">{fileName}</span>
        <span className="file-size">{formatFileSize(fileSize)}</span>
      </div>
      <button onClick={() => onDownload(message)}>
        <Download size={16} />
      </button>
    </div>
  )
}
```

### 4. 智能机会匹配 (Opportunity Matching)

#### 4.1 前端服务

```javascript
// frontend/src/services/OpportunityService.js (新建)

class OpportunityService {
  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL
  }
  
  // 获取匹配的机会
  async getMatches(userId, limit = 20) {
    const response = await fetch(`${this.apiUrl}/api/matching/opportunities/${userId}?limit=${limit}`)
    return response.json()
  }
  
  // 获取匹配分数详情
  async getMatchDetails(userId, opportunityId) {
    const response = await fetch(`${this.apiUrl}/api/matching/score/${userId}/${opportunityId}`)
    return response.json()
  }
  
  // 表达兴趣
  async expressInterest(userId, opportunityId, message) {
    const response = await fetch(`${this.apiUrl}/api/matching/interest`, {
      method: 'POST',
      body: JSON.stringify({ userId, opportunityId, message })
    })
    return response.json()
  }
  
  // 创建机会
  async createOpportunity(opportunity) {
    const response = await fetch(`${this.apiUrl}/api/matching/opportunities`, {
      method: 'POST',
      body: JSON.stringify(opportunity)
    })
    return response.json()
  }
}
```

#### 4.2 机会 Feed 组件

```javascript
// frontend/src/components/OpportunityFeed.jsx (新建)

const OpportunityFeed = () => {
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadOpportunities()
  }, [])
  
  const loadOpportunities = async () => {
    const matches = await OpportunityService.getMatches(userId)
    setOpportunities(matches)
    setLoading(false)
  }
  
  return (
    <div className="opportunity-feed">
      <h2>推荐机会</h2>
      {opportunities.map(opp => (
        <OpportunityCard 
          key={opp.id}
          opportunity={opp}
          onInterest={handleInterest}
        />
      ))}
    </div>
  )
}
```

### 5. 细粒度隐私控制 (Privacy Control)

#### 5.1 隐私服务

```javascript
// frontend/src/services/PrivacyService.js (新建)

const PRIVACY_LEVELS = {
  PUBLIC: 0,      // 公开
  NETWORK: 1,     // 职业网络
  CONNECTIONS: 2, // 直接联系人
  CLOSE: 3        // 亲密合作者
}

class PrivacyService {
  // 获取用户隐私设置
  async getPrivacySettings(userId) {
    const response = await fetch(`${this.apiUrl}/api/privacy/settings/${userId}`)
    return response.json()
  }
  
  // 更新字段隐私级别
  async updateFieldPrivacy(userId, field, level) {
    const response = await fetch(`${this.apiUrl}/api/privacy/field`, {
      method: 'PUT',
      body: JSON.stringify({ userId, field, level })
    })
    return response.json()
  }
  
  // 设置联系人分组
  async setConnectionTier(userId, connectionId, tier) {
    const response = await fetch(`${this.apiUrl}/api/privacy/connection-tier`, {
      method: 'PUT',
      body: JSON.stringify({ userId, connectionId, tier })
    })
    return response.json()
  }
  
  // 获取过滤后的用户资料
  async getFilteredProfile(viewerId, profileId) {
    const response = await fetch(`${this.apiUrl}/api/profile/${profileId}?viewer=${viewerId}`)
    return response.json()
  }
}
```

#### 5.2 隐私设置 UI

```javascript
// frontend/src/components/PrivacySettings.jsx (新建)

const PrivacySettings = () => {
  const [settings, setSettings] = useState({})
  
  const fields = [
    { key: 'name', label: '姓名' },
    { key: 'company', label: '公司' },
    { key: 'role', label: '职位' },
    { key: 'projects', label: '项目' },
    { key: 'skills', label: '技能' },
    { key: 'contact', label: '联系方式' },
    { key: 'availability', label: '可用性' }
  ]
  
  return (
    <div className="privacy-settings">
      <h2>隐私设置</h2>
      {fields.map(field => (
        <div key={field.key} className="privacy-field">
          <span>{field.label}</span>
          <select 
            value={settings[field.key] || 0}
            onChange={(e) => handleChange(field.key, e.target.value)}
          >
            <option value={0}>公开</option>
            <option value={1}>职业网络</option>
            <option value={2}>直接联系人</option>
            <option value={3}>亲密合作者</option>
          </select>
        </div>
      ))}
    </div>
  )
}
```

## Data Models

### 加密消息信封

```typescript
interface MessageEnvelope {
  encryptedContent: string    // Base64 编码的加密内容
  encryptedKey: string        // Base64 编码的加密 AES 密钥
  iv: string                  // Base64 编码的初始化向量
  signature: string           // Base64 编码的数字签名
  senderKeyHash: string       // 发送者公钥哈希
  timestamp: number           // Unix 时间戳
  version: string             // 协议版本 "1.0"
}
```

### 文件消息

```typescript
interface FileMessage {
  type: 'file'
  cid: string                 // IPFS CID
  encryptedKey: string        // 加密的对称密钥
  fileName: string
  fileSize: number
  fileType: string
  thumbnail?: string          // Base64 缩略图 (图片)
}
```

### 机会匹配

```typescript
interface Opportunity {
  id: string
  creatorId: string
  title: string
  description: string
  category: 'project' | 'resource' | 'partnership' | 'hiring' | 'knowledge'
  requiredSkills: Skill[]
  budget?: { min: number, max: number }
  timeline?: { start: Date, end: Date }
  hoursPerWeek?: number
  status: 'open' | 'in_progress' | 'closed'
  createdAt: Date
}

interface MatchResult {
  opportunityId: string
  providerId: string
  totalScore: number
  dimensionScores: {
    skillMatch: number
    availability: number
    reputation: number
    price: number
    network: number
    responsiveness: number
  }
  matchedSkills: MatchedSkill[]
  matchQuality: string
  recommendations: string[]
}
```

### 隐私设置

```typescript
interface PrivacySettings {
  userId: string
  fieldSettings: {
    [field: string]: PrivacyLevel
  }
  connectionTiers: {
    [connectionId: string]: ConnectionTier
  }
  connectionGroups: {
    [groupName: string]: string[]  // 联系人 ID 列表
  }
}

enum PrivacyLevel {
  PUBLIC = 0,
  NETWORK = 1,
  CONNECTIONS = 2,
  CLOSE = 3
}

enum ConnectionTier {
  EXTENDED = 0,
  NETWORK = 1,
  CONNECTION = 2,
  CLOSE_COLLABORATOR = 3
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 加密解密往返一致性 (Round-Trip)

*For any* valid message and valid key pair, encrypting the message with the public key and then decrypting with the corresponding private key SHALL produce the original message.

**Validates: Requirements 1.5, 1.9**

### Property 2: 签名验证正确性

*For any* message signed with a private key, verifying the signature with the corresponding public key SHALL succeed. Verifying with any other public key SHALL fail.

**Validates: Requirements 1.6, 1.8**

### Property 3: 公钥存储检索一致性 (Round-Trip)

*For any* valid public key registered with a wallet address, retrieving the public key by that address SHALL return the same key.

**Validates: Requirements 2.2, 2.3, 2.5**

### Property 4: 密钥格式验证

*For any* string that is not a valid PEM or JWK formatted public key, registration SHALL fail with a validation error.

**Validates: Requirements 2.4**

### Property 5: 密钥轮换历史保留

*For any* key rotation operation, the previous key SHALL be preserved in history and remain accessible for decrypting old messages.

**Validates: Requirements 2.7, 2.8**

### Property 6: 文件加密解密往返一致性 (Round-Trip)

*For any* valid file within size limits, encrypting and uploading to IPFS, then downloading and decrypting SHALL produce a file identical to the original.

**Validates: Requirements 3.2, 3.3, 3.7, 3.8**

### Property 7: 文件大小验证

*For any* file exceeding 50MB, the upload operation SHALL fail with a size validation error.

**Validates: Requirements 3.1**

### Property 8: 匹配分数范围

*For any* user and opportunity, the calculated match score SHALL be between 0 and 100 inclusive.

**Validates: Requirements 4.1**

### Property 9: 匹配分数权重总和

*For any* match calculation, the sum of dimension weights SHALL equal 1.0 (100%).

**Validates: Requirements 4.1**

### Property 10: 隐私过滤正确性

*For any* viewer with privacy level L viewing a profile, only fields with privacy level <= L SHALL be visible.

**Validates: Requirements 5.3, 5.4**

### Property 11: 隐私设置即时生效

*For any* privacy setting change, subsequent profile views SHALL immediately reflect the new settings.

**Validates: Requirements 5.7**

## Error Handling

### 加密错误

| 错误类型 | 错误码 | 用户提示 | 处理方式 |
|---------|--------|---------|---------|
| 公钥未找到 | E001 | "无法发送消息：接收者尚未设置加密密钥" | 阻止发送，提示用户 |
| 签名验证失败 | E002 | "⚠️ 消息可能被篡改" | 显示警告，允许查看 |
| 解密失败 | E003 | "无法解密消息" | 显示错误，建议重新获取 |
| 密钥生成失败 | E004 | "密钥生成失败，请刷新页面重试" | 提示重试 |

### IPFS 错误

| 错误类型 | 错误码 | 用户提示 | 处理方式 |
|---------|--------|---------|---------|
| 文件过大 | F001 | "文件大小超过 50MB 限制" | 阻止上传 |
| 上传失败 | F002 | "文件上传失败，请重试" | 允许重试 |
| 下载失败 | F003 | "文件下载失败 (CID: xxx)" | 显示 CID 供手动获取 |
| 格式不支持 | F004 | "不支持的文件格式" | 阻止上传 |

### 匹配错误

| 错误类型 | 错误码 | 用户提示 | 处理方式 |
|---------|--------|---------|---------|
| 资料不完整 | M001 | "请完善您的资料以获取匹配推荐" | 引导完善资料 |
| 无匹配结果 | M002 | "暂无匹配的机会" | 显示空状态 |
| 服务不可用 | M003 | "匹配服务暂时不可用" | 显示缓存结果或重试 |

## Testing Strategy

### 单元测试

- **EncryptionService**: 测试密钥生成、加密、解密、签名、验证
- **IPFSService**: 测试文件上传、下载、缩略图生成
- **PrivacyService**: 测试隐私级别过滤
- **OpportunityService**: 测试匹配分数计算

### 属性测试 (Property-Based Testing)

使用 `fast-check` 库进行属性测试：

```javascript
// 加密往返测试
fc.assert(
  fc.property(fc.string(), async (message) => {
    const { publicKey, privateKey } = await generateKeyPair()
    const encrypted = await encrypt(message, publicKey)
    const decrypted = await decrypt(encrypted, privateKey)
    return decrypted === message
  }),
  { numRuns: 100 }
)

// 匹配分数范围测试
fc.assert(
  fc.property(
    fc.record({ skills: fc.array(fc.string()) }),
    fc.record({ skills: fc.array(fc.string()) }),
    (seeker, provider) => {
      const score = calculateMatchScore(seeker, provider)
      return score >= 0 && score <= 100
    }
  ),
  { numRuns: 100 }
)
```

### 集成测试

- 端到端加密消息流程
- 文件上传下载流程
- 机会匹配和通知流程
- 隐私设置和资料过滤流程

