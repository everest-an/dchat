# Smart Contract Deployment Guide

## Overview

This guide covers the deployment of dchat.pro's smart contracts to Ethereum Sepolia testnet.

## Contracts to Deploy

### Core Contracts (Already Deployed)
- ✅ **UserIdentityV2** - `0x6BCF16f82F8d3A37b7b6fd59DeE9adf95B1BA5a1`
- ✅ **MessageStorageV2** - `0x906626694a065bEECf51F2C776f272bDB67Ce174`

### New Group Functionality Contracts (To Deploy)
- ⏳ **GroupChatV2** - Group management and permissions
- ⏳ **GroupPayment** - Group payments, AA payments, crowdfunding
- ⏳ **RedPacket** - Crypto red packets

## Prerequisites

1. **Node.js and npm** installed
2. **Hardhat** environment set up
3. **Sepolia testnet ETH** for gas fees
4. **Infura or Alchemy** API key
5. **Private key** of deployer account

## Setup

### 1. Install Dependencies

```bash
cd contracts
npm install
```

### 2. Configure Environment Variables

Create `.env` file in `contracts/` directory:

```env
# Network Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_here

# Etherscan API Key (for verification)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Deployer Address
DEPLOYER_ADDRESS=0x66794fC75C351ad9677cB00B2043868C11dfcadA
```

### 3. Verify Hardhat Configuration

Check `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
```

## Deployment Steps

### Step 1: Compile Contracts

```bash
npx hardhat compile
```

Expected output:
```
Compiled 3 Solidity files successfully
```

### Step 2: Test Contracts (Optional but Recommended)

```bash
npx hardhat test
```

### Step 3: Deploy to Sepolia Testnet

```bash
npx hardhat run scripts/deploy-group-contracts.js --network sepolia
```

Expected output:
```
🚀 Starting deployment of Group Functionality Contracts...

📝 Deploying contracts with account: 0x66794fC75C351ad9677cB00B2043868C11dfcadA
💰 Account balance: 1000000000000000000

📦 Deploying GroupChatV2...
✅ GroupChatV2 deployed to: 0x...

📦 Deploying GroupPayment...
✅ GroupPayment deployed to: 0x...

📦 Deploying RedPacket...
✅ RedPacket deployed to: 0x...

📄 Deployment data saved to: deployment-group-contracts.json

============================================================
📋 DEPLOYMENT SUMMARY
============================================================
Network: sepolia
Deployer: 0x66794fC75C351ad9677cB00B2043868C11dfcadA

📝 Contract Addresses:
  GroupChatV2:    0x...
  GroupPayment:   0x...
  RedPacket:      0x...

🔗 Etherscan Links:
  GroupChatV2:    https://sepolia.etherscan.io/address/0x...
  GroupPayment:   https://sepolia.etherscan.io/address/0x...
  RedPacket:      https://sepolia.etherscan.io/address/0x...
============================================================

⏳ Waiting for block confirmations before verification...
🔍 Verifying contracts on Etherscan...
✅ GroupChatV2 verified
✅ GroupPayment verified
✅ RedPacket verified

✨ Deployment completed successfully!
```

### Step 4: Update Frontend Configuration

After deployment, update `frontend/src/config/contracts.js`:

```javascript
export const CONTRACT_ADDRESSES = {
  // Existing contracts
  UserIdentity: '0x6BCF16f82F8d3A37b7b6fd59DeE9adf95B1BA5a1',
  MessageStorage: '0x906626694a065bEECf51F2C776f272bDB67Ce174',
  
  // New group contracts
  GroupChat: '0x...', // Replace with deployed address
  GroupPayment: '0x...', // Replace with deployed address
  RedPacket: '0x...', // Replace with deployed address
};
```

### Step 5: Update Backend Configuration

Update `backend/.env`:

```env
# Group Contracts
CONTRACT_GROUP_CHAT=0x...
CONTRACT_GROUP_PAYMENT=0x...
CONTRACT_RED_PACKET=0x...
```

## Manual Verification (If Automatic Fails)

If automatic verification fails, verify manually:

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

Example:
```bash
npx hardhat verify --network sepolia 0x1234567890abcdef1234567890abcdef12345678
```

## Gas Cost Estimation

Estimated gas costs for deployment on Sepolia:

| Contract | Estimated Gas | Cost (at 20 gwei) |
|----------|--------------|-------------------|
| GroupChatV2 | ~3,500,000 | ~0.07 ETH |
| GroupPayment | ~3,000,000 | ~0.06 ETH |
| RedPacket | ~2,800,000 | ~0.056 ETH |
| **Total** | **~9,300,000** | **~0.186 ETH** |

## Post-Deployment Checklist

- [ ] Verify all contracts on Etherscan
- [ ] Update frontend contract addresses
- [ ] Update backend contract addresses
- [ ] Test contract interactions on testnet
- [ ] Update documentation with new addresses
- [ ] Commit deployment data to repository
- [ ] Test group creation functionality
- [ ] Test group payment functionality
- [ ] Test red packet functionality

## Testing Deployed Contracts

### Test Group Creation

```javascript
const groupChat = await ethers.getContractAt("GroupChatV2", GROUP_CHAT_ADDRESS);
const tx = await groupChat.createGroup(
  "Test Group",
  "ipfs://avatar_hash",
  "Test group description",
  true, // isPublic
  100   // maxMembers
);
await tx.wait();
console.log("Group created!");
```

### Test Red Packet

```javascript
const redPacket = await ethers.getContractAt("RedPacket", RED_PACKET_ADDRESS);
const tx = await redPacket.createRandomRedPacket(
  "group_1",
  5, // count
  "Happy New Year!",
  { value: ethers.utils.parseEther("0.05") }
);
await tx.wait();
console.log("Red packet created!");
```

## Troubleshooting

### Issue: Insufficient Funds

**Error**: `insufficient funds for intrinsic transaction cost`

**Solution**: 
- Get Sepolia ETH from faucet: https://sepoliafaucet.com/
- Or use Alchemy faucet: https://sepoliafaucet.com/

### Issue: Nonce Too Low

**Error**: `nonce has already been used`

**Solution**:
```bash
# Reset Hardhat network
npx hardhat clean
# Or manually set nonce in deployment script
```

### Issue: Verification Failed

**Error**: `Already Verified` or `Contract source code already verified`

**Solution**: This is not an error - the contract is already verified!

### Issue: Contract Size Too Large

**Error**: `Contract code size exceeds 24576 bytes`

**Solution**: 
- Enable optimizer in `hardhat.config.js`
- Increase optimizer runs to 200+
- Split large contracts into smaller modules

## Security Considerations

1. **Private Key Security**
   - Never commit `.env` file
   - Use hardware wallet for mainnet
   - Rotate keys after deployment

2. **Contract Verification**
   - Always verify contracts on Etherscan
   - Enables public audit
   - Builds user trust

3. **Access Control**
   - Review admin functions
   - Implement timelock for critical functions
   - Use multi-sig for mainnet

4. **Testing**
   - Run full test suite before deployment
   - Test on testnet first
   - Conduct security audit for mainnet

## Mainnet Deployment (Future)

When ready for mainnet:

1. **Security Audit** - Hire professional auditors
2. **Bug Bounty** - Launch bug bounty program
3. **Insurance** - Consider smart contract insurance
4. **Gradual Rollout** - Start with limited features
5. **Monitoring** - Set up 24/7 monitoring
6. **Emergency Pause** - Implement pause functionality

## Resources

- **Hardhat Documentation**: https://hardhat.org/docs
- **Etherscan Sepolia**: https://sepolia.etherscan.io/
- **Sepolia Faucet**: https://sepoliafaucet.com/
- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts/
- **Solidity Documentation**: https://docs.soliditylang.org/

## Support

For deployment issues:
- GitHub Issues: https://github.com/everest-an/dchat/issues
- Email: everest9812@gmail.com

## License

MIT License - See LICENSE file for details
