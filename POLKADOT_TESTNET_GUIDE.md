# Polkadot Westend Testnet Red Packet Payment - Complete Guide

**Version:** 1.0  
**Date:** November 16, 2024  
**Purpose:** Step-by-step guide for testing red packet payments on Polkadot Westend testnet

---

## Quick Start

This guide walks you through the complete process of creating and claiming red packets on Polkadot Westend testnet, from account setup to payment verification.

---

## Part 1: Setup (5-10 minutes)

### Step 1.1: Install Polkadot.js Extension

1. Go to https://polkadot.js.org/extension/
2. Click "Install" for your browser (Chrome, Firefox, Edge, etc.)
3. Confirm the installation in your browser's extension menu
4. Pin the extension for easy access

### Step 1.2: Create Test Accounts

**Create Sender Account:**
1. Click the Polkadot.js extension icon
2. Click "+" to create a new account
3. Click "Create new account"
4. Save the 12-word seed phrase in a secure location
5. Set a password (remember this for signing transactions)
6. Name the account "Dchat Sender"
7. Click "Save"
8. **Copy the address** (starts with "1") - you'll need this

**Create Recipient Account:**
1. Repeat steps 1-7 above
2. Name this account "Dchat Recipient"
3. **Copy the address** - you'll need this

### Step 1.3: Switch to Westend Testnet

1. Click the Polkadot.js extension icon
2. Look for the network selector (usually shows "Polkadot" by default)
3. Click on the network dropdown
4. Select "Westend" from the list
5. Confirm both accounts now show Westend addresses

### Step 1.4: Get Test DOT

**For Sender Account:**
1. Visit https://faucet.polkadot.io/
2. Select "Westend" from the network dropdown
3. Paste your sender account address
4. Click "Claim"
5. Wait 1-2 minutes for confirmation
6. Check your balance in Polkadot.js extension

**For Recipient Account:**
1. Repeat the same process with your recipient account address
2. Ensure you have test DOT in both accounts

**Verification:**
- Open Polkadot.js extension
- You should see "1.00 WND" or similar balance in both accounts
- If not, wait a few minutes and refresh

---

## Part 2: API Testing (10-15 minutes)

### Step 2.1: Get Authentication Token

First, you need to authenticate with the Dchat API.

**Request:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sender@example.com",
    "password": "your_password"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "sender@example.com"
  }
}
```

**Save the token** - you'll use it for all subsequent requests.

### Step 2.2: Create Red Packet

Now create a red packet with 5 packets of 1 WND each (5 WND total).

**Request:**
```bash
curl -X POST http://localhost:8000/api/red-packets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "DOT",
    "total_amount": "5000000000000",
    "packet_count": 5,
    "distribution_type": "random",
    "message": "Test Red Packet - Westend Testnet",
    "chat_id": "test_chat_westend_001",
    "sender_address": "YOUR_SENDER_ADDRESS"
  }'
```

**Important Notes:**
- Amount is in Planck: 1 DOT = 10^10 Planck
- 5 WND = 5 × 10^10 Planck = 50000000000 Planck
- For this test, we use 5000000000000 Planck = 500 WND (adjust based on your balance)

**Expected Response:**
```json
{
  "success": true,
  "red_packet": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "sender_id": 1,
    "sender_address": "YOUR_SENDER_ADDRESS",
    "token": "DOT",
    "total_amount": 5000000000000,
    "packet_count": 5,
    "distribution_type": "random",
    "message": "Test Red Packet - Westend Testnet",
    "chat_id": "test_chat_westend_001",
    "status": "active",
    "created_at": "2024-11-16T07:20:00Z",
    "expires_at": "2024-11-17T07:20:00Z",
    "claimed_count": 0,
    "total_claimed": 0
  },
  "message": "Red packet created successfully"
}
```

**Save the packet ID** - you'll need it for claiming.

### Step 2.3: Construct Payment Transaction

Now construct the unsigned transaction to fund the red packet.

**Request:**
```bash
curl -X POST http://localhost:8000/api/web3/polkadot/construct-transaction \
  -H "Content-Type: application/json" \
  -d '{
    "sender_address": "YOUR_SENDER_ADDRESS",
    "recipient_address": "1ESCROW_ADDRESS_PLACEHOLDER",
    "amount": "5000000000000",
    "network": "testnet"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "unsigned_transaction": {
    "sender_address": "YOUR_SENDER_ADDRESS",
    "recipient_address": "1ESCROW_ADDRESS_PLACEHOLDER",
    "amount": 5000000000000,
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

### Step 2.4: Sign Transaction with Polkadot.js

1. Copy the entire `unsigned_transaction` object from the response
2. Open Polkadot.js extension
3. Navigate to "Accounts" tab
4. Find your sender account
5. Click the three dots menu
6. Select "Sign message"
7. Paste the transaction data
8. Click "Sign the message"
9. Enter your password when prompted
10. Copy the signed transaction (hex format starting with "0x")

### Step 2.5: Broadcast Signed Transaction

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
  "transaction_hash": "0x1234567890abcdef...",
  "network": "testnet",
  "status": "pending",
  "message": "Transaction broadcast successfully. Please wait for confirmation."
}
```

**Save the transaction hash** - you can check its status on Westend explorer.

### Step 2.6: Verify Transaction Status

**Request:**
```bash
curl -X GET "http://localhost:8000/api/web3/polkadot/transaction/0x1234567890abcdef..." \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "transaction_hash": "0x1234567890abcdef...",
  "network": "testnet",
  "status": "finalized",
  "block_number": 15000000,
  "block_hash": "0x...",
  "timestamp": "2024-11-16T07:25:00Z"
}
```

**Status Progression:**
- `pending` → Transaction submitted, waiting for inclusion
- `confirmed` → Transaction included in a block
- `finalized` → Transaction finalized (safe from reorg)

---

## Part 3: Claim Red Packet (5-10 minutes)

### Step 3.1: Get Recipient Authentication Token

**Request (as recipient):**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "recipient@example.com",
    "password": "your_password"
  }'
```

**Save the recipient's JWT token.**

### Step 3.2: Claim the Red Packet

**Request:**
```bash
curl -X POST http://localhost:8000/api/red-packets/550e8400-e29b-41d4-a716-446655440000/claim \
  -H "Authorization: Bearer RECIPIENT_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_address": "YOUR_RECIPIENT_ADDRESS"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "claim": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "packet_id": "550e8400-e29b-41d4-a716-446655440000",
    "recipient_id": 2,
    "recipient_address": "YOUR_RECIPIENT_ADDRESS",
    "amount": 1234567890000,
    "status": "claimed",
    "claimed_at": "2024-11-16T07:30:00Z"
  },
  "packet_status": "active",
  "message": "Successfully claimed 1234567890000 DOT"
}
```

**Note:** Amount varies based on random distribution. Each user can claim only once.

### Step 3.3: Verify Packet Status

**Request:**
```bash
curl -X GET http://localhost:8000/api/red-packets/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer SENDER_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "red_packet": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "total_amount": 5000000000000,
    "packet_count": 5,
    "claimed_count": 1,
    "total_claimed": 1234567890000
  },
  "claims": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "recipient_address": "YOUR_RECIPIENT_ADDRESS",
      "amount": 1234567890000,
      "claimed_at": "2024-11-16T07:30:00Z"
    }
  ],
  "remaining_amount": 3765432110000,
  "remaining_packets": 4,
  "is_claimable": true
}
```

---

## Part 4: Complete the Payment Flow (Optional)

### Step 4.1: Additional Claims

Repeat Part 3 with different users to claim more packets:

1. Create another test account (Recipient 2)
2. Get test DOT for this account
3. Login and get JWT token
4. Claim the red packet using their address
5. Verify the claim was successful

### Step 4.2: Cancel Red Packet

If you want to test cancellation:

**Request:**
```bash
curl -X POST http://localhost:8000/api/red-packets/550e8400-e29b-41d4-a716-446655440000/cancel \
  -H "Authorization: Bearer SENDER_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "red_packet": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "cancelled"
  },
  "message": "Red packet cancelled. Unclaimed funds will be refunded."
}
```

---

## Part 5: Verification & Monitoring

### Step 5.1: Check Westend Explorer

1. Visit https://westend.subscan.io/
2. Search for your transaction hash
3. Verify the transaction details:
   - From: Your sender address
   - To: Escrow address
   - Amount: 5 WND
   - Status: Finalized

### Step 5.2: View Account Balances

1. Open Polkadot.js extension
2. Check sender account balance (should be reduced by 5 WND + fees)
3. Check recipient account balance (should be increased by claimed amount)

### Step 5.3: Get Claim History

**Request:**
```bash
curl -X GET "http://localhost:8000/api/red-packets/claims/me?limit=10" \
  -H "Authorization: Bearer RECIPIENT_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "claims": [
    {
      "claim": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "amount": 1234567890000,
        "claimed_at": "2024-11-16T07:30:00Z"
      },
      "packet": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "message": "Test Red Packet - Westend Testnet"
      }
    }
  ],
  "total_count": 1
}
```

---

## Troubleshooting

### Issue: "Insufficient Balance"

**Cause:** Sender doesn't have enough test DOT

**Solution:**
1. Request more test DOT from faucet
2. Wait 2-3 minutes for confirmation
3. Refresh Polkadot.js extension
4. Try again

### Issue: "Invalid Address Format"

**Cause:** Address is not a valid Polkadot address

**Solution:**
1. Copy address directly from Polkadot.js extension
2. Ensure it starts with "1" (Westend format)
3. Don't modify or truncate the address

### Issue: "Transaction Pending Too Long"

**Cause:** Network congestion or node issues

**Solution:**
1. Wait 5-10 minutes
2. Check status again
3. Try with a different RPC node
4. Check Westend explorer for transaction status

### Issue: "Already Claimed"

**Cause:** User already claimed this red packet

**Solution:**
1. Use a different user account
2. Create a new red packet
3. Check claim history to see previous claims

### Issue: "Red Packet Expired"

**Cause:** 24 hours have passed since creation

**Solution:**
1. Create a new red packet
2. Ensure recipients claim within 24 hours
3. Check expiration time in packet details

---

## Performance Metrics

### Expected Timings

| Operation | Expected Time | Notes |
| :--- | :--- | :--- |
| Get test DOT | 1-2 minutes | Faucet processing time |
| Create red packet | < 1 second | Database operation |
| Construct transaction | < 1 second | Backend operation |
| Sign transaction | 5-10 seconds | User interaction time |
| Broadcast transaction | < 1 second | Network submission |
| Transaction finalization | 6-12 seconds | Block time on Westend |
| Claim red packet | < 1 second | Database operation |

### Network Statistics

| Metric | Value |
| :--- | :--- |
| **Westend Block Time** | ~6 seconds |
| **Finality Time** | ~60 seconds |
| **Transaction Fee** | ~0.0001 WND |
| **Max Packet Count** | 100 packets |
| **Expiration Time** | 24 hours |

---

## Advanced Testing

### Test Random Distribution

Create multiple red packets with different amounts and verify random distribution:

```bash
# Packet 1: 100 WND, 10 packets (avg 10 WND each)
# Packet 2: 50 WND, 5 packets (avg 10 WND each)
# Packet 3: 200 WND, 20 packets (avg 10 WND each)
```

Have multiple users claim and verify amounts are random but within expected ranges.

### Test Equal Distribution

Create a red packet with equal distribution:

```bash
curl -X POST http://localhost:8000/api/red-packets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "DOT",
    "total_amount": "10000000000000",
    "packet_count": 10,
    "distribution_type": "equal",
    "message": "Equal Distribution Test",
    "sender_address": "YOUR_ADDRESS"
  }'
```

Verify all claims receive exactly 1000000000000 Planck (1 WND).

### Stress Testing

Create multiple red packets and have many users claim simultaneously to test:
- Database performance
- Concurrent claim handling
- Race condition prevention

---

## Success Criteria

You have successfully completed the test when:

✅ Test accounts created on Westend testnet  
✅ Test DOT obtained from faucet  
✅ Red packet created via API  
✅ Payment transaction constructed  
✅ Transaction signed with Polkadot.js  
✅ Transaction broadcast successfully  
✅ Transaction finalized on Westend  
✅ Red packet claimed by recipient  
✅ Claim verified in database  
✅ Claim history retrieved successfully  

---

## Next Steps

After successful testing:

1. **Deploy to Production:** Switch to mainnet configuration
2. **Set Up Escrow:** Configure escrow address for fund management
3. **Add Frontend:** Integrate with Dchat frontend UI
4. **Monitor Transactions:** Set up monitoring and alerting
5. **User Documentation:** Create user guides for red packet feature

---

## Support

For issues or questions:

- **GitHub Issues:** https://github.com/everest-an/dchat/issues
- **Polkadot Support:** https://polkadot.network/support/
- **Westend Faucet:** https://faucet.polkadot.io/
- **Explorer:** https://westend.subscan.io/

---

*Guide prepared by: Manus AI*  
*Last Updated: November 16, 2024*  
*Tested on: Polkadot Westend Testnet*
