# Dchat - Web3 Business Communication Platform

> **🌐 Live Demo**: [https://dchat.pro](https://dchat.pro) | [Short Link](https://tinyurl.com/2apne32a)  
> **📝 Team**: Everest  
> **🏆 ClawHunt 2026 Hackathon Project**

---

## 🚀 Quick Links

- **🌐 Official Website**: [https://dchat.pro](https://dchat.pro)
- **🔗 Short Link**: [https://tinyurl.com/2apne32a](https://tinyurl.com/2apne32a)
- **📜 Smart Contracts**: [View Contracts](#-smart-contracts)
- **📖 Documentation**: [Full Documentation](./docs/)
- **🎥 Demo Video**: [Coming Soon]

---

## 📋 Overview

Dchat is a Web3-native business communication platform that combines end-to-end encryption, blockchain storage, and professional networking features. Built for the future of secure business communications, Dchat leverages blockchain technology to ensure data sovereignty, privacy, and seamless crypto payments.

---

## 🎯 Problems Solved

Traditional business communication platforms face several critical challenges:

- **Data Privacy Concerns**: Centralized servers store sensitive business communications
- **Lack of Data Sovereignty**: Users don't own or control their data
- **Payment Friction**: Complex payment processes for international business transactions
- **Identity Verification**: Difficulty verifying professional identities and company information
- **Vendor Lock-in**: Inability to migrate data between platforms

Dchat addresses these issues through blockchain technology, end-to-end encryption, and decentralized storage.

---

## ✨ Key Features

- **Wallet Authentication**: Secure login via Web3 wallets (MetaMask, WalletConnect)
- **LinkedIn Integration**: Sync professional profiles and company information
- **End-to-End Encryption**: Quantum-resistant encryption for all communications
- **Blockchain Storage**: Decentralized message storage ensuring data sovereignty
- **Project Collaboration**: Share projects, find partners, showcase resources
- **Professional Networking**: Business moments and verified company profiles
- **Integrated Payments**: Crypto payments within chat conversations
- **Smart Contract Integration**: Automated payment escrow and project collaboration

---

## 🔗 Smart Contracts

### 📜 Deployed Contracts

Dchat utilizes multiple smart contracts on **Ethereum** (Sepolia Testnet) for various functionalities.

#### **Ethereum Contracts**

| Contract Name | Network | Address | Purpose |
|--------------|---------|---------|---------|
| **UserIdentity** | Sepolia Testnet | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | User identity and verification |
| **MessageStorage** | Sepolia Testnet | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | Decentralized message storage |
| **PaymentEscrow** | Sepolia Testnet | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` | Payment escrow for transactions |
| **ProjectCollaboration** | Sepolia Testnet | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` | Project collaboration and management |

#### **Contract Features**

**UserIdentity Contract**:
- ✅ Decentralized identity management
- ✅ Professional profile verification
- ✅ Company information storage
- ✅ Reputation system

**MessageStorage Contract**:
- ✅ Encrypted message storage on blockchain
- ✅ IPFS integration for large files
- ✅ Message retrieval and verification
- ✅ Data sovereignty guarantee

**PaymentEscrow Contract**:
- ✅ Secure payment escrow
- ✅ Multi-party payment splitting
- ✅ Automated dispute resolution
- ✅ Milestone-based payments

**ProjectCollaboration Contract**:
- ✅ Project creation and management
- ✅ Team member management
- ✅ Resource sharing
- ✅ Milestone tracking

### 📊 Smart Contract Examples

#### **Example 1: User Registration**
```javascript
// Register a new user with professional profile
await userIdentity.registerUser(
  "John Doe",
  "Software Engineer",
  "Tech Corp",
  "john.doe@example.com"
);
```

#### **Example 2: Store Encrypted Message**
```javascript
// Store encrypted message on blockchain
const messageHash = await messageStorage.storeMessage(
  recipientAddress,
  encryptedContent,
  ipfsHash
);
```

#### **Example 3: Create Payment Escrow**
```javascript
// Create escrow for project payment
await paymentEscrow.createEscrow(
  recipientAddress,
  ethers.utils.parseEther("1.0"), // 1 ETH
  30 * 24 * 60 * 60 // 30 days timeout
);
```

#### **Example 4: Project Collaboration**
```javascript
// Create a new project
await projectCollaboration.createProject(
  "DApp Development",
  "Building a decentralized application",
  [member1, member2, member3]
);
```

### 🔧 Contract Deployment

For detailed deployment instructions, see:
- [Smart Contract README](./contracts/README.md)
- [Blockchain Integration Guide](./BLOCKCHAIN_INTEGRATION.md)
- [Deployment Complete Report](./DEPLOYMENT_COMPLETE.md)

---

## 🏗️ Technical Architecture

### Frontend
- **Framework**: React with Vite
- **Styling**: Tailwind CSS
- **Web3 Integration**: ethers.js for blockchain interaction
- **State Management**: React Context API
- **Responsive Design**: Mobile-first approach with desktop support

### Backend
- **Framework**: Flask (Python)
- **API**: RESTful API with CORS support
- **Authentication**: JWT-based authentication
- **Database**: SQLite (development) / PostgreSQL (production)
- **Blockchain**: Web3.py for smart contract interaction

### Blockchain
- **Primary Network**: Ethereum (Sepolia Testnet)
- **Storage**: IPFS for large files
- **Wallet**: MetaMask, WalletConnect support
- **Smart Contracts**: Solidity 0.8.x

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- MetaMask or compatible Web3 wallet
- Git

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/everest-an/dchat.git
cd dchat
```

2. **Frontend Setup**
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

3. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

4. **Visit the application**
```
Frontend: http://localhost:5173
Backend API: http://localhost:5000
```

For detailed setup instructions, see [Installation Guide](#-installation--setup)

---

## 📚 Documentation

Comprehensive documentation is available in the [docs](./docs/) directory:

- **[📖 Whitepaper](./docs/whitepaper/dchat-whitepaper.md)** - Technical and business overview
- **[💼 Business Plan](./docs/business/business-plan.md)** - Market analysis and strategy  
- **[🎯 Pitch Deck](./docs/pitch-deck/Dchat_Hackathon_Pitch.pdf)** - Hackathon presentation
- **[👥 User Manual](./docs/user-manual/dchat_user_manual_en.md)** - User guide and features
- **[🔧 Technical Specs](./docs/technical/technical-specifications.md)** - Architecture details
- **[🎨 Design System](./docs/design/dchat_design_system.md)** - UI/UX guidelines
- **[🔗 Blockchain Integration](./BLOCKCHAIN_INTEGRATION.md)** - Smart contract integration
- **[📋 Testing Guide](./TESTING_GUIDE.md)** - Testing procedures

Visit the [Documentation Index](./docs/README.md) for a complete overview.

---

## 🎨 Features Showcase

### 💬 Secure Messaging
End-to-end encrypted messaging with blockchain-backed storage for maximum security and data sovereignty.

### 🔐 Web3 Authentication
Seamless wallet-based authentication with no passwords required. Support for MetaMask and WalletConnect.

### 💼 Professional Networking
LinkedIn integration for verified professional profiles and company information.

### 🤝 Project Collaboration
Create projects, invite team members, share resources, and track milestones on-chain.

### 💰 Integrated Payments
Send and receive crypto payments directly in chat conversations with escrow protection.

### 📊 Business Moments
Share business updates, achievements, and opportunities with your professional network.

---

## 🧪 Testing

### Smart Contract Testing
```bash
cd contracts
npm test
```

### Frontend Testing
```bash
cd frontend
npm run test
```

### Integration Testing
See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for comprehensive testing procedures.

---

## 🌐 Live Demo

**Visit our live demo**: [https://dchat.pro](https://dchat.pro)  
**Quick Access**: [https://tinyurl.com/2apne32a](https://tinyurl.com/2apne32a)

**Test Features**:
- ✅ Wallet connection (MetaMask)
- ✅ Secure messaging
- ✅ Project collaboration
- ✅ Professional networking
- ✅ Crypto payments
- ✅ LinkedIn integration

**Test Accounts**:
- Connect with your MetaMask wallet on Sepolia testnet
- Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)

---

## 📦 Deployment

### Vercel Deployment (Frontend)
```bash
npm run build
vercel deploy
```

### Backend Deployment
See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed deployment instructions.

### Smart Contract Deployment
```bash
cd contracts
node deploy.js
```

---

## 🔄 Recent Updates

See [CHANGELOG.md](./CHANGELOG.md) for recent updates and version history.

**Latest Features** (v2.0):
- ✅ Smart contract integration
- ✅ Payment escrow system
- ✅ Project collaboration contracts
- ✅ Enhanced encryption
- ✅ IPFS storage integration

---

## 👥 Team

**Team Name**: Everest

**Contact**:
- GitHub: [@everest-an](https://github.com/everest-an)
- Project Repository: [Dchat](https://github.com/everest-an/dchat)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🏆 ETHShanghai 2025

This project is submitted to **ETHShanghai 2025 Hackathon**.

**Track**: Public Goods × Open Source

**Submission Date**: October 20, 2025

---

## 🔗 Additional Resources

- **Official Website**: [https://dchat.pro](https://dchat.pro)
- **Smart Contracts**: [Contract Documentation](./contracts/README.md)
- **API Documentation**: [Backend API](./backend/README.md)
- **Whitepaper**: [Full Whitepaper](./docs/whitepaper/dchat-whitepaper.md)
- **Pitch Deck**: [Hackathon Pitch](./docs/pitch-deck/Dchat_Hackathon_Pitch.pdf)

---

## 🌟 Why Dchat?

Dchat represents the future of business communication by combining:

1. **Privacy**: End-to-end encryption ensures your conversations remain private
2. **Sovereignty**: Blockchain storage gives you full control of your data
3. **Trust**: Smart contracts enable trustless business transactions
4. **Efficiency**: Integrated payments streamline business operations
5. **Transparency**: On-chain verification builds trust in professional networks

Join us in building the future of secure, decentralized business communication! 🚀

