# AWS部署信息

## 部署状态

- **部署时间**: 2025-11-14
- **部署平台**: AWS EC2
- **区域**: ap-southeast-1 (新加坡)

## 访问信息

### 原始地址
- **EC2 IP**: http://16.176.34.213
- **域名**: dchat.pro (DNS已配置)

### 短链接
- **TinyURL**: https://tinyurl.com/2apne32a
- **生成时间**: 2025-11-14
- **指向**: http://16.176.34.213

## 当前问题

### 🚨 网站无法访问
根据检查,dchat.pro和EC2 IP都无法正常访问。原因:
1. GitHub Actions部署失败 (SSH密钥认证问题)
2. EC2实例上的服务未正常启动
3. 需要修复SSH密钥并重新部署

### 部署失败原因
```
Permission denied (publickey)
```
- SSH密钥 `protocol-bank-key.pem` 无法认证
- GitHub Secrets中的 `EC2_SSH_KEY` 可能已过期或不正确

## 下一步行动

### 立即修复
1. 验证EC2实例状态
2. 更新GitHub Secrets中的SSH密钥
3. 手动SSH连接到EC2进行部署
4. 配置域名DNS和SSL证书

### 访问链接汇总
- 主域名: https://dchat.pro (待修复)
- 短链接: https://tinyurl.com/2apne32a (指向EC2 IP)
- 直接IP: http://16.176.34.213 (待修复)

## 技术栈
- **前端**: React + TypeScript
- **后端**: Node.js + Express
- **数据库**: PostgreSQL
- **区块链**: Ethereum (Sepolia测试网)
- **存储**: IPFS
