# Polkadot Payment Integration & Red Packet Feature

**Document Version:** 1.0  
**Last Updated:** November 16, 2024  
**Status:** Implementation Complete

---

## Overview

This document describes the Polkadot blockchain payment integration and red packet (红包) feature implementation for the Dchat backend. The system enables users to send and receive payments using Polkadot (DOT) tokens on both mainnet and testnet (Westend), with support for luck-based (random) or equal distribution of red packets.

---

## Architecture

### Components

The Polkadot payment system consists of the following components:

| Component | Purpose | File |
| :--- | :--- | :--- |
| **Polkadot Routes** | REST API endpoints for payment operations | `src/routes/payments_polkadot.py` |
| **Red Packet Routes** | REST API endpoints for red packet management | `src/routes/red_packets.py` |
| **Red Packet Model** | Database schema for red packets and claims | `src/models/red_packet.py` |
| **User Model** | User account information and relationships | `src/models/user.py` |

### Technology Stack

- **Blockchain:** Polkadot (mainnet and Westend testnet)
- **RPC Nodes:** Public Polkadot RPC endpoints
- **Backend Framework:** FastAPI
- **Database:** PostgreSQL (SQLAlchemy ORM)
- **Deployment:** Vercel

---

## API Endpoints

### Polkadot Payment Endpoints

#### 1. Health Check

**Endpoint:** `GET /api/web3/polkadot/health`

**Query Parameters:**
- `network` (optional): `mainnet` or `testnet` (default: testnet)

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "service": "polkadot_payment",
  "network": "testnet",
  "rpc_url": "wss://westend-rpc.polkadot.io",
  "timestamp": "2024-11-16T07:10:00Z"
}
```

#### 2. Construct Transaction

**Endpoint:** `POST /api/web3/polkadot/construct-transaction`

**Request Body:**
```json
{
  "sender_address": "1ABC...",
  "recipient_address": "1XYZ...",
  "amount": "1000000000000",
  "network": "testnet"
}
```

**Response:**
```json
{
  "success": true,
  "unsigned_transaction": {
    "sender_address": "1ABC...",
    "recipient_address": "1XYZ...",
    "amount": 1000000000000,
    "call_index": "0x0500",
    "era": "0x0400",
    "nonce": 0,
    "spec_version": 9430,
    "transaction_version": 21,
    "genesis_hash": "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
    "block_hash": "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3"
  },
  "network": "testnet",
  "message": "Unsigned transaction constructed. Please sign with your wallet."
}
```

**Notes:**
- Amount is in Planck units (1 DOT = 10^10 Planck)
- Transaction must be signed by the sender's private key before broadcasting
- Frontend should use Polkadot.js or similar library for signing

#### 3. Broadcast Transaction

**Endpoint:** `POST /api/web3/polkadot/broadcast-transaction`

**Request Body:**
```json
{
  "signed_transaction": "0x...",
  "network": "testnet"
}
```

**Response:**
```json
{
  "success": true,
  "transaction_hash": "0x...",
  "network": "testnet",
  "status": "pending",
  "message": "Transaction broadcast successfully. Please wait for confirmation."
}
```

#### 4. Get Transaction Status

**Endpoint:** `GET /api/web3/polkadot/transaction/{tx_hash}`

**Query Parameters:**
- `network` (optional): `mainnet` or `testnet`

**Response:**
```json
{
  "success": true,
  "transaction_hash": "0x...",
  "network": "testnet",
  "status": "finalized",
  "block_number": 15000000,
  "block_hash": "0x...",
  "timestamp": "2024-11-16T07:10:00Z"
}
```

---

### Red Packet Endpoints

#### 1. Create Red Packet

**Endpoint:** `POST /api/red-packets`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "token": "DOT",
  "total_amount": "10000000000000",
  "packet_count": 10,
  "distribution_type": "random",
  "message": "Happy New Year!",
  "chat_id": "chat_123",
  "sender_address": "1ABC..."
}
```

**Response:**
```json
{
  "success": true,
  "red_packet": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "sender_id": 1,
    "sender_address": "1ABC...",
    "token": "DOT",
    "total_amount": 10000000000000,
    "packet_count": 10,
    "distribution_type": "random",
    "message": "Happy New Year!",
    "chat_id": "chat_123",
    "status": "active",
    "created_at": "2024-11-16T07:10:00Z",
    "expires_at": "2024-11-17T07:10:00Z",
    "claimed_count": 0,
    "total_claimed": 0
  },
  "message": "Red packet created successfully"
}
```

**Notes:**
- `total_amount` is in Planck units
- `packet_count` must be between 1 and 100
- `distribution_type` can be "random" (luck-based) or "equal"
- Packet expires after 24 hours
- Sender must complete the payment transaction after creating the packet

#### 2. Claim Red Packet

**Endpoint:** `POST /api/red-packets/{packet_id}/claim`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "recipient_address": "1XYZ..."
}
```

**Response:**
```json
{
  "success": true,
  "claim": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "packet_id": "550e8400-e29b-41d4-a716-446655440000",
    "recipient_id": 2,
    "recipient_address": "1XYZ...",
    "amount": 1000000000000,
    "status": "claimed",
    "claimed_at": "2024-11-16T07:15:00Z"
  },
  "packet_status": "active",
  "message": "Successfully claimed 1000000000000 DOT"
}
```

**Notes:**
- Each user can only claim once per red packet
- Amount is determined by distribution type:
  - **Random:** Luck-based, between 1 and (remaining / remaining_packets) * 2
  - **Equal:** Fixed amount = total_amount / packet_count
- Packet status changes to "completed" when all packets are claimed

#### 3. Get Red Packet Details

**Endpoint:** `GET /api/red-packets/{packet_id}`

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "red_packet": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "sender_id": 1,
    "sender_address": "1ABC...",
    "token": "DOT",
    "total_amount": 10000000000000,
    "packet_count": 10,
    "distribution_type": "random",
    "message": "Happy New Year!",
    "chat_id": "chat_123",
    "status": "active",
    "created_at": "2024-11-16T07:10:00Z",
    "expires_at": "2024-11-17T07:10:00Z",
    "claimed_count": 3,
    "total_claimed": 3500000000000
  },
  "claims": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "packet_id": "550e8400-e29b-41d4-a716-446655440000",
      "recipient_id": 2,
      "recipient_address": "1XYZ...",
      "amount": 1000000000000,
      "status": "claimed",
      "claimed_at": "2024-11-16T07:15:00Z"
    }
  ],
  "remaining_amount": 6500000000000,
  "remaining_packets": 7,
  "is_expired": false,
  "is_claimable": true
}
```

#### 4. List Red Packets

**Endpoint:** `GET /api/red-packets`

**Authentication:** Required (Bearer token)

**Query Parameters:**
- `status` (optional): Filter by status (active, completed, expired, cancelled)
- `limit` (optional): Maximum number of packets to return (default: 20, max: 100)
- `offset` (optional): Number of packets to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "red_packets": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "sender_id": 1,
      "sender_address": "1ABC...",
      "token": "DOT",
      "total_amount": 10000000000000,
      "packet_count": 10,
      "distribution_type": "random",
      "message": "Happy New Year!",
      "chat_id": "chat_123",
      "status": "active",
      "created_at": "2024-11-16T07:10:00Z",
      "expires_at": "2024-11-17T07:10:00Z",
      "claimed_count": 3,
      "total_claimed": 3500000000000
    }
  ],
  "total_count": 5,
  "pagination": {
    "limit": 20,
    "offset": 0,
    "has_more": false
  }
}
```

#### 5. Cancel Red Packet

**Endpoint:** `POST /api/red-packets/{packet_id}/cancel`

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "red_packet": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "cancelled",
    "created_at": "2024-11-16T07:10:00Z"
  },
  "message": "Red packet cancelled. Unclaimed funds will be refunded."
}
```

**Notes:**
- Only the sender can cancel a red packet
- Cannot cancel if status is already "completed", "cancelled", or "expired"
- Unclaimed funds will be refunded to the sender

#### 6. Get My Claims

**Endpoint:** `GET /api/red-packets/claims/me`

**Authentication:** Required (Bearer token)

**Query Parameters:**
- `limit` (optional): Maximum number of claims to return (default: 20, max: 100)
- `offset` (optional): Number of claims to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "claims": [
    {
      "claim": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "packet_id": "550e8400-e29b-41d4-a716-446655440000",
        "recipient_id": 2,
        "recipient_address": "1XYZ...",
        "amount": 1000000000000,
        "status": "claimed",
        "claimed_at": "2024-11-16T07:15:00Z"
      },
      "packet": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "sender_id": 1,
        "sender_address": "1ABC...",
        "token": "DOT",
        "total_amount": 10000000000000,
        "message": "Happy New Year!"
      }
    }
  ],
  "total_count": 5,
  "pagination": {
    "limit": 20,
    "offset": 0,
    "has_more": false
  }
}
```

---

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Polkadot Network Configuration
POLKADOT_NETWORK=testnet                    # mainnet or testnet
POLKADOT_MAINNET_URL=wss://rpc.polkadot.io
POLKADOT_TESTNET_URL=wss://westend-rpc.polkadot.io

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost/dchat

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
```

### Supported Networks

| Network | RPC URL | Use Case |
| :--- | :--- | :--- |
| **Polkadot Mainnet** | `wss://rpc.polkadot.io` | Production payments with real DOT |
| **Westend Testnet** | `wss://westend-rpc.polkadot.io` | Development and testing with test DOT |

---

## Testing Guide

### Prerequisites

1. **Polkadot.js Extension:** Install the Polkadot.js browser extension
2. **Test Account:** Create a test account on Westend testnet
3. **Test DOT:** Obtain test DOT from the [Westend Faucet](https://faucet.polkadot.io/)
4. **API Client:** Use Postman, curl, or similar tool for API testing

### Test Workflow

#### Step 1: Create a Test Account

1. Open Polkadot.js extension
2. Create a new account and save the seed phrase
3. Switch to Westend testnet
4. Note the account address (starts with "1")

#### Step 2: Get Test DOT

1. Visit https://faucet.polkadot.io/
2. Select "Westend" network
3. Enter your test account address
4. Request test DOT
5. Wait for confirmation (usually 1-2 minutes)

#### Step 3: Create Red Packet

**Request:**
```bash
curl -X POST http://localhost:8000/api/red-packets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "DOT",
    "total_amount": "1000000000000",
    "packet_count": 5,
    "distribution_type": "random",
    "message": "Test Red Packet",
    "chat_id": "test_chat_1",
    "sender_address": "YOUR_TEST_ADDRESS"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "red_packet": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "total_amount": 1000000000000,
    "packet_count": 5
  }
}
```

#### Step 4: Construct Payment Transaction

**Request:**
```bash
curl -X POST http://localhost:8000/api/web3/polkadot/construct-transaction \
  -H "Content-Type: application/json" \
  -d '{
    "sender_address": "YOUR_TEST_ADDRESS",
    "recipient_address": "DCHAT_ESCROW_ADDRESS",
    "amount": "1000000000000",
    "network": "testnet"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "unsigned_transaction": {
    "sender_address": "YOUR_TEST_ADDRESS",
    "recipient_address": "DCHAT_ESCROW_ADDRESS",
    "amount": 1000000000000
  }
}
```

#### Step 5: Sign and Broadcast Transaction

1. Copy the unsigned transaction from Step 4
2. Use Polkadot.js to sign the transaction with your test account
3. Broadcast the signed transaction to the network

**Request:**
```bash
curl -X POST http://localhost:8000/api/web3/polkadot/broadcast-transaction \
  -H "Content-Type: application/json" \
  -d '{
    "signed_transaction": "0x...",
    "network": "testnet"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "transaction_hash": "0x...",
  "status": "pending"
}
```

#### Step 6: Claim Red Packet

**Request:**
```bash
curl -X POST http://localhost:8000/api/red-packets/550e8400-e29b-41d4-a716-446655440000/claim \
  -H "Authorization: Bearer RECIPIENT_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_address": "RECIPIENT_TEST_ADDRESS"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "claim": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "amount": 200000000000,
    "status": "claimed"
  }
}
```

#### Step 7: Verify Red Packet Status

**Request:**
```bash
curl -X GET http://localhost:8000/api/red-packets/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "red_packet": {
    "status": "active",
    "claimed_count": 1,
    "remaining_packets": 4
  }
}
```

---

## Security Considerations

### 1. Address Validation

All Polkadot addresses are validated for proper format before processing:
- Must be a valid SS58 address format
- Minimum length of 47 characters
- Proper checksum validation (handled by Polkadot.js)

### 2. Amount Validation

All amounts are validated to prevent invalid or malicious transactions:
- Must be positive integers
- Cannot exceed sender's balance
- Minimum amount enforced (1 Planck)

### 3. Authentication & Authorization

- All red packet endpoints require JWT authentication
- Users can only cancel their own red packets
- Claims are tied to specific user accounts
- Sender verification prevents unauthorized cancellations

### 4. Transaction Signing

- Transactions are unsigned on the backend
- Signing happens on the client side using Polkadot.js
- Backend never handles private keys
- Signed transactions are verified before broadcasting

### 5. Database Security

- All user addresses are indexed for quick lookups
- Foreign key constraints prevent orphaned records
- Cascade delete ensures data consistency
- Timestamps track all operations for audit trails

---

## Error Handling

### Common Error Responses

| Error | Status Code | Cause | Solution |
| :--- | :--- | :--- | :--- |
| Missing required fields | 400 | Incomplete request body | Provide all required fields |
| Invalid address format | 400 | Malformed Polkadot address | Use valid SS58 address |
| Red packet not found | 404 | Invalid packet ID | Verify packet ID exists |
| User not found | 404 | Invalid user ID | Ensure user is authenticated |
| Already claimed | 400 | User claimed this packet | Each user can claim once |
| Packet expired | 400 | 24 hours have passed | Resend a new red packet |
| Insufficient balance | 400 | Not enough funds | Add more DOT to account |
| Network error | 503 | RPC node unavailable | Retry or use different node |

---

## Future Enhancements

### Phase 2 (Next Sprint)

- [ ] Multi-token support (USDT, USDC on Polkadot)
- [ ] Automatic refund processing for expired packets
- [ ] WebSocket notifications for packet claims
- [ ] Advanced analytics dashboard
- [ ] Rate limiting per user

### Phase 3 (Later)

- [ ] Cross-chain support (Ethereum, Cosmos)
- [ ] NFT red packets
- [ ] Recurring red packets (scheduled)
- [ ] Group red packets with shared ownership
- [ ] Leaderboard and achievements

---

## Deployment

### Vercel Deployment

The Polkadot payment integration is automatically deployed to Vercel on every push to the `vercel-beta` branch.

**Latest Deployment:**
- Commit: `b642eb1`
- Status: Ready
- URL: https://dchatbackendvercel-9hgr7an2q-everest-ans-projects.vercel.app

### Environment Setup

1. Set environment variables in Vercel dashboard
2. Ensure database is accessible from Vercel
3. Test endpoints after deployment

---

## Support & Documentation

For additional help:
- **GitHub:** https://github.com/everest-an/dchat
- **Polkadot Docs:** https://wiki.polkadot.network/
- **Polkadot.js:** https://polkadot.js.org/
- **Westend Faucet:** https://faucet.polkadot.io/

---

*Document prepared by: Manus AI*  
*Last Updated: November 16, 2024*
