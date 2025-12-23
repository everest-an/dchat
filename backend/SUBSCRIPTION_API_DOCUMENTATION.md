# Subscription API Documentation

**Version**: 1.0.0  
**Base URL**: `https://api.dchat.pro` or `http://localhost:5000`  
**Date**: 2025-11-05

---

## Table of Contents

1. [Authentication](#authentication)
2. [Subscription Management API](#subscription-management-api)
3. [NFT Avatar API](#nft-avatar-api)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Examples](#examples)

---

## Authentication

All protected endpoints require authentication via JWT token and wallet address.

### Headers

```http
Authorization: Bearer <jwt_token>
X-User-Address: <wallet_address>
```

### Getting a JWT Token

Use the `/api/auth/connect-wallet` endpoint to authenticate with your wallet and receive a JWT token.

---

## Subscription Management API

Base path: `/api/subscriptions`

### 1. Get Subscription Plans

Get available subscription plans with pricing.

**Endpoint**: `GET /api/subscriptions/plans`

**Authentication**: Not required

**Response**:
```json
{
  "success": true,
  "plans": [
    {
      "tier": "FREE",
      "name": "Free",
      "description": "For individuals getting started",
      "pricing": {
        "monthly": "0",
        "yearly": "0",
        "nft": "0",
        "monthlyUsd": "$0",
        "yearlyUsd": "$0",
        "nftUsd": "$0"
      },
      "features": [
        "Up to 100 group members",
        "100MB file uploads",
        "60 minutes call duration",
        "5GB storage",
        "Basic search",
        "Standard support"
      ]
    },
    {
      "tier": "PRO",
      "name": "Pro",
      "description": "For professionals and small teams",
      "pricing": {
        "monthly": "2500000000000000",
        "yearly": "25000000000000000",
        "nft": "100000000000000000",
        "monthlyEth": "0.0025",
        "yearlyEth": "0.025",
        "nftEth": "0.1",
        "monthlyUsd": "$4.99",
        "yearlyUsd": "$49.99",
        "nftUsd": "$199"
      },
      "features": [
        "Up to 500 group members",
        "1GB file uploads",
        "Unlimited call duration",
        "Call recording",
        "100GB storage",
        "Advanced search",
        "50 custom stickers",
        "NFT avatars",
        "Priority support"
      ]
    },
    {
      "tier": "ENTERPRISE",
      "name": "Enterprise",
      "description": "For large organizations",
      "pricing": {
        "monthly": "10000000000000000",
        "yearly": "100000000000000000",
        "nft": "500000000000000000",
        "monthlyEth": "0.01",
        "yearlyEth": "0.1",
        "nftEth": "0.5",
        "monthlyUsd": "$19.99",
        "yearlyUsd": "$199.99",
        "nftUsd": "$999"
      },
      "features": [
        "Unlimited group members",
        "10GB file uploads",
        "Unlimited call duration",
        "Call recording",
        "1TB storage",
        "Advanced search",
        "Unlimited custom stickers",
        "NFT avatars",
        "Custom branding",
        "API access",
        "Dedicated support"
      ]
    }
  ]
}
```

---

### 2. Get Current Subscription

Get the authenticated user's current subscription.

**Endpoint**: `GET /api/subscriptions/me`

**Authentication**: Required

**Headers**:
```http
Authorization: Bearer <jwt_token>
X-User-Address: <wallet_address>
```

**Response**:
```json
{
  "success": true,
  "subscription": {
    "id": 1,
    "blockchainId": 1,
    "userAddress": "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
    "tier": "PRO",
    "period": "MONTHLY",
    "status": "ACTIVE",
    "startTime": "2025-11-05T00:00:00",
    "endTime": "2025-12-05T00:00:00",
    "amount": "2500000000000000",
    "paymentToken": "ETH",
    "autoRenew": true,
    "transactionHash": "0x...",
    "createdAt": "2025-11-05T00:00:00",
    "updatedAt": "2025-11-05T00:00:00"
  }
}
```

**Response (No Subscription)**:
```json
{
  "success": true,
  "subscription": null,
  "tier": "FREE"
}
```

---

### 3. Create Subscription

Create a new subscription by syncing from blockchain.

**Endpoint**: `POST /api/subscriptions/create`

**Authentication**: Required

**Headers**:
```http
Authorization: Bearer <jwt_token>
X-User-Address: <wallet_address>
Content-Type: application/json
```

**Request Body**:
```json
{
  "tier": "PRO",
  "period": "MONTHLY",
  "paymentToken": "ETH",
  "transactionHash": "0x..."
}
```

**Response**:
```json
{
  "success": true,
  "subscription": {
    "id": 1,
    "blockchainId": 1,
    "userAddress": "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
    "tier": "PRO",
    "period": "MONTHLY",
    "status": "ACTIVE",
    "startTime": "2025-11-05T00:00:00",
    "endTime": "2025-12-05T00:00:00",
    "amount": "2500000000000000",
    "paymentToken": "ETH",
    "autoRenew": false,
    "transactionHash": "0x...",
    "createdAt": "2025-11-05T00:00:00",
    "updatedAt": "2025-11-05T00:00:00"
  },
  "message": "Subscription created successfully"
}
```

---

### 4. Renew Subscription

Renew an existing subscription.

**Endpoint**: `POST /api/subscriptions/renew`

**Authentication**: Required

**Headers**:
```http
Authorization: Bearer <jwt_token>
X-User-Address: <wallet_address>
Content-Type: application/json
```

**Request Body**:
```json
{
  "period": "MONTHLY",
  "paymentToken": "ETH",
  "transactionHash": "0x..."
}
```

**Response**:
```json
{
  "success": true,
  "subscription": { ... },
  "message": "Subscription renewed successfully"
}
```

---

### 5. Cancel Subscription

Cancel the current subscription.

**Endpoint**: `POST /api/subscriptions/cancel`

**Authentication**: Required

**Headers**:
```http
Authorization: Bearer <jwt_token>
X-User-Address: <wallet_address>
```

**Response**:
```json
{
  "success": true,
  "message": "Please cancel subscription via smart contract",
  "note": "Call cancelSubscription() on the SubscriptionManager contract"
}
```

---

### 6. Get Subscription History

Get the user's subscription history.

**Endpoint**: `GET /api/subscriptions/history`

**Authentication**: Required

**Headers**:
```http
Authorization: Bearer <jwt_token>
X-User-Address: <wallet_address>
```

**Response**:
```json
{
  "success": true,
  "subscriptions": [
    {
      "id": 2,
      "blockchainId": 2,
      "tier": "PRO",
      "period": "MONTHLY",
      "status": "EXPIRED",
      "startTime": "2025-10-05T00:00:00",
      "endTime": "2025-11-05T00:00:00",
      "amount": "2500000000000000",
      "paymentToken": "ETH",
      "transactionHash": "0x...",
      "createdAt": "2025-10-05T00:00:00"
    },
    {
      "id": 1,
      "blockchainId": 1,
      "tier": "PRO",
      "period": "MONTHLY",
      "status": "ACTIVE",
      "startTime": "2025-11-05T00:00:00",
      "endTime": "2025-12-05T00:00:00",
      "amount": "2500000000000000",
      "paymentToken": "ETH",
      "transactionHash": "0x...",
      "createdAt": "2025-11-05T00:00:00"
    }
  ]
}
```

---

### 7. Get User Tier

Get the user's current subscription tier.

**Endpoint**: `GET /api/subscriptions/tier`

**Authentication**: Required

**Headers**:
```http
Authorization: Bearer <jwt_token>
X-User-Address: <wallet_address>
```

**Response**:
```json
{
  "success": true,
  "tier": "PRO",
  "isActive": true
}
```

---

### 8. Get Tier Pricing

Get pricing for a specific tier.

**Endpoint**: `GET /api/subscriptions/pricing/<tier>`

**Authentication**: Not required

**Parameters**:
- `tier` (path): Subscription tier (PRO or ENTERPRISE)

**Example**: `GET /api/subscriptions/pricing/PRO`

**Response**:
```json
{
  "success": true,
  "tier": "PRO",
  "pricing": {
    "monthlyPrice": "2500000000000000",
    "yearlyPrice": "25000000000000000",
    "nftPrice": "100000000000000000",
    "monthlyPriceEth": "0.0025",
    "yearlyPriceEth": "0.025",
    "nftPriceEth": "0.1"
  }
}
```

---

## NFT Avatar API

Base path: `/api/avatars/nft`

### 1. Set NFT Avatar

Set an NFT as the user's avatar.

**Endpoint**: `POST /api/avatars/nft/set`

**Authentication**: Required (Pro or Enterprise tier)

**Headers**:
```http
Authorization: Bearer <jwt_token>
X-User-Address: <wallet_address>
Content-Type: application/json
```

**Request Body**:
```json
{
  "nftContract": "0x...",
  "tokenId": "123",
  "standard": "ERC721",
  "transactionHash": "0x..."
}
```

**Response**:
```json
{
  "success": true,
  "avatar": {
    "id": 1,
    "userAddress": "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
    "contractAddress": "0x...",
    "tokenId": "123",
    "standard": "ERC721",
    "isCurrent": true,
    "isValid": true,
    "transactionHash": "0x...",
    "setAt": "2025-11-05T00:00:00",
    "createdAt": "2025-11-05T00:00:00"
  },
  "message": "NFT avatar set successfully"
}
```

---

### 2. Get My NFT Avatar

Get the authenticated user's current NFT avatar.

**Endpoint**: `GET /api/avatars/nft/me`

**Authentication**: Required

**Headers**:
```http
Authorization: Bearer <jwt_token>
X-User-Address: <wallet_address>
```

**Response**:
```json
{
  "success": true,
  "avatar": {
    "id": 1,
    "userAddress": "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
    "contractAddress": "0x...",
    "tokenId": "123",
    "standard": "ERC721",
    "isCurrent": true,
    "isValid": true,
    "setAt": "2025-11-05T00:00:00"
  }
}
```

**Response (No Avatar)**:
```json
{
  "success": true,
  "avatar": null,
  "message": "No NFT avatar set"
}
```

---

### 3. Get User NFT Avatar (Public)

Get any user's NFT avatar.

**Endpoint**: `GET /api/avatars/nft/<user_address>`

**Authentication**: Not required

**Parameters**:
- `user_address` (path): User's wallet address

**Example**: `GET /api/avatars/nft/0x742d35cc6634c0532925a3b844bc9e7595f0beb0`

**Response**:
```json
{
  "success": true,
  "avatar": {
    "contractAddress": "0x...",
    "tokenId": "123",
    "standard": "ERC721",
    "setAt": "2025-11-05T00:00:00",
    "isValid": true
  }
}
```

---

### 4. Remove NFT Avatar

Remove the current NFT avatar.

**Endpoint**: `DELETE /api/avatars/nft/remove`

**Authentication**: Required

**Headers**:
```http
Authorization: Bearer <jwt_token>
X-User-Address: <wallet_address>
```

**Response**:
```json
{
  "success": true,
  "message": "NFT avatar removed from database",
  "note": "Call removeAvatar() on the NFTAvatarManager contract to remove from blockchain"
}
```

---

### 5. Get Avatar History

Get the user's NFT avatar history.

**Endpoint**: `GET /api/avatars/nft/history`

**Authentication**: Required

**Headers**:
```http
Authorization: Bearer <jwt_token>
X-User-Address: <wallet_address>
```

**Response**:
```json
{
  "success": true,
  "avatars": [
    {
      "id": 2,
      "contractAddress": "0x...",
      "tokenId": "456",
      "standard": "ERC721",
      "isCurrent": false,
      "setAt": "2025-10-05T00:00:00"
    },
    {
      "id": 1,
      "contractAddress": "0x...",
      "tokenId": "123",
      "standard": "ERC721",
      "isCurrent": true,
      "setAt": "2025-11-05T00:00:00"
    }
  ]
}
```

---

### 6. Verify Avatar Ownership

Verify if a user still owns their NFT avatar.

**Endpoint**: `GET /api/avatars/nft/verify/<user_address>`

**Authentication**: Not required

**Parameters**:
- `user_address` (path): User's wallet address

**Example**: `GET /api/avatars/nft/verify/0x742d35cc6634c0532925a3b844bc9e7595f0beb0`

**Response**:
```json
{
  "success": true,
  "isValid": true,
  "avatar": {
    "contractAddress": "0x...",
    "tokenId": "123",
    "standard": "ERC721",
    "setAt": "2025-11-05T00:00:00"
  }
}
```

---

### 7. Sync Avatar from Blockchain

Manually sync avatar data from blockchain to database.

**Endpoint**: `POST /api/avatars/nft/sync`

**Authentication**: Required

**Headers**:
```http
Authorization: Bearer <jwt_token>
X-User-Address: <wallet_address>
Content-Type: application/json
```

**Request Body**:
```json
{
  "transactionHash": "0x..."
}
```

**Response**:
```json
{
  "success": true,
  "avatar": { ... },
  "message": "Avatar synced successfully"
}
```

---

## Error Handling

All API endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

### Common Error Codes

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required or failed |
| 403 | Forbidden | Insufficient permissions (e.g., subscription tier too low) |
| 404 | Not Found | Resource not found |
| 429 | Rate Limit Exceeded | Too many requests |
| 500 | Internal Server Error | Server error |

### Subscription-Specific Errors

**403 Forbidden - Subscription Required**:
```json
{
  "success": false,
  "error": "Subscription required",
  "message": "This feature requires PRO subscription",
  "currentTier": "FREE",
  "requiredTier": "PRO",
  "upgradeUrl": "/subscription/plans"
}
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse.

**Default Limits**:
- Free tier: 60 requests per minute
- Pro tier: 120 requests per minute
- Enterprise tier: 300 requests per minute

**Rate Limit Headers**:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1699200000
```

When rate limit is exceeded:
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 60
}
```

---

## Examples

### Example 1: Subscribe to Pro Plan (Monthly)

**Step 1**: Get pricing
```bash
curl -X GET https://api.dchat.pro/api/subscriptions/pricing/PRO
```

**Step 2**: Call smart contract to subscribe (using Web3.js)
```javascript
const price = await subscriptionContract.methods.pricing(1).call(); // 1 = PRO
const tx = await subscriptionContract.methods.subscribe(
  1, // PRO tier
  0, // MONTHLY duration
  '0x0000000000000000000000000000000000000000', // ETH
  false // autoRenew
).send({
  from: userAddress,
  value: price.monthlyPrice
});
```

**Step 3**: Sync subscription to backend
```bash
curl -X POST https://api.dchat.pro/api/subscriptions/create \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-User-Address: 0x..." \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "PRO",
    "period": "MONTHLY",
    "paymentToken": "ETH",
    "transactionHash": "0x..."
  }'
```

---

### Example 2: Set NFT Avatar

**Step 1**: Call smart contract to set avatar (using Web3.js)
```javascript
const tx = await nftAvatarContract.methods.setAvatarERC721(
  nftContractAddress,
  tokenId
).send({ from: userAddress });
```

**Step 2**: Sync avatar to backend
```bash
curl -X POST https://api.dchat.pro/api/avatars/nft/set \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-User-Address: 0x..." \
  -H "Content-Type: application/json" \
  -d '{
    "nftContract": "0x...",
    "tokenId": "123",
    "standard": "ERC721",
    "transactionHash": "0x..."
  }'
```

---

### Example 3: Check User's Subscription Tier

```bash
curl -X GET https://api.dchat.pro/api/subscriptions/tier \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-User-Address: 0x..."
```

---

## Smart Contract Integration

### SubscriptionManager Contract

**Address (Sepolia)**: `0x5d154C1A6DE2B10aFcCd139A4aBa3bbCfd8A31c8`

**Key Functions**:
- `subscribe(tier, duration, paymentToken, autoRenew)` - Subscribe to a tier
- `cancelSubscription()` - Cancel subscription
- `renewSubscription(subscriptionId)` - Renew subscription
- `getUserSubscription(user)` - Get user's subscription
- `getUserTier(user)` - Get user's tier
- `isSubscriptionActive(user)` - Check if subscription is active

### NFTAvatarManager Contract

**Address (Sepolia)**: `0xF91E0E6afF5A93831F67838539245a44Ca384187`

**Key Functions**:
- `setAvatarERC721(nftContract, tokenId)` - Set ERC-721 NFT as avatar
- `setAvatarERC1155(nftContract, tokenId)` - Set ERC-1155 NFT as avatar
- `removeAvatar()` - Remove current avatar
- `getUserAvatar(user)` - Get user's avatar
- `verifyAvatarOwnership(user)` - Verify avatar ownership

---

## Support

For API support, please contact:
- Email: support@dchat.pro
- Discord: https://discord.gg/dchat
- GitHub: https://github.com/everest-an/dchat

---

**Last Updated**: 2025-11-05  
**API Version**: 1.0.0
