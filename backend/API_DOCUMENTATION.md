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
