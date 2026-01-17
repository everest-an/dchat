# Dchat Commercial Deployment Guide

This guide details the steps required to deploy Dchat as a fully functional commercial product.

## 1. Prerequisites

Before deploying to production (e.g., Vercel), ensure you have the following accounts and keys:

### A. Blockchain Access (RPC Provider)

To interact with the Ethereum network (Sepolia Testnet or Mainnet), you need a reliable RPC provider.

1. Sign up at [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/).
2. Create a new App (ensure you select the correct network, e.g., Sepolia).
3. Copy the **HTTP URL** (e.g., `https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY`).

### B. Decentralized Storage (Pinata)

To store files (images, documents) and encrypted messages securely on IPFS.

1. Sign up at [Pinata](https://www.pinata.cloud/).
2. Go to **API Keys** -> **New Key**.
3. Enable `pinFileToIPFS`, `pinJSONToIPFS`, and `pinByHash`.
4. Copy the **JWT Token** (recommended) or API Key/Secret.

### C. WalletConnect (Optional but Recommended)

For better wallet compatibility (mobile wallets, QR code login).

1. Sign up at [WalletConnect Cloud](https://cloud.walletconnect.com/).
2. Create a Project and copy the **Project ID**.

## 2. Environment Variables Configuration

In your Vercel Project Settings (Settings -> Environment Variables), add the following:

| Variable Name | Required | Description | Example Value |
|--------------|----------|-------------|---------------|
| `VITE_RPC_URL` | **YES** | Your exclusive RPC URL | `https://eth-sepolia.g.alchemy.com/v2/...` |
| `VITE_PINATA_JWT` | **YES** | Pinata JWT Token for IPFS | `eyJhbGciOiJIUzI1Ni...` |
| `VITE_PINATA_GATEWAY` | No | Your Pinata Gateway URL | `https://gateway.pinata.cloud/ipfs/` |
| `VITE_WALLETCONNECT_PROJECT_ID`| No | For WalletConnect support | `a1b2c3d4...` |

> **Note**: If `VITE_PINATA_JWT` is missing, the app will fall back to "Mock Mode" (local storage only), which is NOT suitable for production.

## 3. Deployment Verification

After deployment, perform these checks to verify commercial readiness:

1. **File Upload**: Go to Chat, verify you can upload an image.
    * *Success*: Image uploads, you get an IPFS hash, and it persists after refresh.
    * *Failure*: Console logs "Mock mode" or upload fails.
2. **Encryption**: Send a message.
    * *Success*: Message is encrypted/decrypted transparently.
3. **Smart Contracts**:
    * The app is currently configured for **Sepolia Testnet**.
    * Contract addresses are defined in `src/config/contracts.js`.
    * Ensure your wallet is connected to Sepolia.

## 4. Mainnet Migration (Future Step)

To move from Testnet to Ethereum Mainnet:

1. Deploy contracts to Mainnet.
2. Update `CONTRACT_ADDRESSES` in `src/config/contracts.js`.
3. Update `VITE_RPC_URL` to a Mainnet RPC.
4. Update `VITE_CHAIN_ID` to `1` (Mainnet).
