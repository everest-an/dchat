// Web3 Service for Dchat
// Integrates with deployed smart contracts on Sepolia

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, RPC_URL, CHAIN_ID } from '../config/contracts';

class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.account = null;
  }

  // Initialize provider
  async initProvider() {
    if (window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      return true;
    }
    return false;
  }

  // Connect wallet
  async connectWallet() {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      this.account = accounts[0];
      
      // Initialize provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();

      // Check network
      const network = await this.provider.getNetwork();
      if (Number(network.chainId) !== CHAIN_ID) {
        await this.switchNetwork();
      }

      // Initialize contracts
      await this.initContracts();

      return {
        address: this.account,
        chainId: Number(network.chainId)
      };
    } catch (error) {
      console.error('Connect wallet error:', error);
      throw error;
    }
  }

  // Switch to Sepolia network
  async switchNetwork() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${CHAIN_ID.toString(16)}`,
            chainName: 'Sepolia Testnet',
            nativeCurrency: {
              name: 'Sepolia ETH',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: [RPC_URL],
            blockExplorerUrls: ['https://sepolia.etherscan.io']
          }],
        });
      } else {
        throw switchError;
      }
    }
  }

  // Initialize all contracts
  async initContracts() {
    if (!this.signer) {
      throw new Error('Signer not initialized');
    }

    this.contracts = {
      messageStorage: new ethers.Contract(
        CONTRACT_ADDRESSES.MessageStorage,
        CONTRACT_ABIS.MessageStorage,
        this.signer
      ),
      paymentEscrow: new ethers.Contract(
        CONTRACT_ADDRESSES.PaymentEscrow,
        CONTRACT_ABIS.PaymentEscrow,
        this.signer
      ),
      userIdentity: new ethers.Contract(
        CONTRACT_ADDRESSES.UserIdentity,
        CONTRACT_ABIS.UserIdentity,
        this.signer
      ),
      projectCollaboration: new ethers.Contract(
        CONTRACT_ADDRESSES.ProjectCollaboration,
        CONTRACT_ABIS.ProjectCollaboration,
        this.signer
      )
    };
  }

  // User Identity Methods
  async registerUser(username, email) {
    try {
      const emailHash = ethers.keccak256(ethers.toUtf8Bytes(email));
      const tx = await this.contracts.userIdentity.registerUser(username, emailHash);
      const receipt = await tx.wait();
      return {
        success: true,
        txHash: receipt.hash,
        username,
        email
      };
    } catch (error) {
      console.error('Register user error:', error);
      throw error;
    }
  }

  async getUserProfile(address) {
    try {
      const profile = await this.contracts.userIdentity.getUserProfile(address || this.account);
      return {
        address: profile.userAddress,
        username: profile.username,
        emailHash: profile.emailHash,
        linkedInId: profile.linkedInId,
        isLinkedInVerified: profile.isLinkedInVerified,
        isEmailVerified: profile.isEmailVerified,
        reputationScore: Number(profile.reputationScore),
        registrationTime: Number(profile.registrationTime)
      };
    } catch (error) {
      console.error('Get user profile error:', error);
      throw error;
    }
  }

  async isUserRegistered(address) {
    try {
      return await this.contracts.userIdentity.isUserRegistered(address || this.account);
    } catch (error) {
      console.error('Check user registered error:', error);
      return false;
    }
  }

  // Message Methods
  async sendMessage(recipientAddress, message, ipfsHash = '') {
    try {
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes(message));
      const tx = await this.contracts.messageStorage.storeMessage(
        recipientAddress,
        messageHash,
        ipfsHash || `ipfs_${Date.now()}`
      );
      const receipt = await tx.wait();
      
      // Get message ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contracts.messageStorage.interface.parseLog(log);
          return parsed && parsed.name === 'MessageStored';
        } catch {
          return false;
        }
      });

      const messageId = event ? this.contracts.messageStorage.interface.parseLog(event).args.messageId : null;

      return {
        success: true,
        txHash: receipt.hash,
        messageId,
        message,
        recipient: recipientAddress
      };
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  }

  async getSentMessages() {
    try {
      const messageIds = await this.contracts.messageStorage.getUserSentMessages(this.account);
      const messages = await Promise.all(
        messageIds.map(async (id) => {
          const msg = await this.contracts.messageStorage.getMessage(id);
          return {
            messageId: msg.messageId,
            sender: msg.sender,
            recipient: msg.recipient,
            messageHash: msg.messageHash,
            ipfsHash: msg.ipfsHash,
            timestamp: Number(msg.timestamp),
            isDeleted: msg.isDeleted
          };
        })
      );
      return messages;
    } catch (error) {
      console.error('Get sent messages error:', error);
      return [];
    }
  }

  async getReceivedMessages() {
    try {
      const messageIds = await this.contracts.messageStorage.getUserReceivedMessages(this.account);
      const messages = await Promise.all(
        messageIds.map(async (id) => {
          const msg = await this.contracts.messageStorage.getMessage(id);
          return {
            messageId: msg.messageId,
            sender: msg.sender,
            recipient: msg.recipient,
            messageHash: msg.messageHash,
            ipfsHash: msg.ipfsHash,
            timestamp: Number(msg.timestamp),
            isDeleted: msg.isDeleted
          };
        })
      );
      return messages;
    } catch (error) {
      console.error('Get received messages error:', error);
      return [];
    }
  }

  // Payment Methods
  async createPayment(payeeAddress, amount, description) {
    try {
      const tx = await this.contracts.paymentEscrow.createPayment(
        payeeAddress,
        description,
        { value: ethers.parseEther(amount.toString()) }
      );
      const receipt = await tx.wait();
      
      // Get payment ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contracts.paymentEscrow.interface.parseLog(log);
          return parsed && parsed.name === 'PaymentCreated';
        } catch {
          return false;
        }
      });

      const paymentId = event ? this.contracts.paymentEscrow.interface.parseLog(event).args.paymentId : null;

      return {
        success: true,
        txHash: receipt.hash,
        paymentId,
        amount,
        payee: payeeAddress,
        description
      };
    } catch (error) {
      console.error('Create payment error:', error);
      throw error;
    }
  }

  async createEscrow(payeeAddress, amount, releaseTime, description) {
    try {
      const tx = await this.contracts.paymentEscrow.createEscrow(
        payeeAddress,
        releaseTime,
        description,
        { value: ethers.parseEther(amount.toString()) }
      );
      const receipt = await tx.wait();
      
      // Get escrow ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contracts.paymentEscrow.interface.parseLog(log);
          return parsed && parsed.name === 'EscrowCreated';
        } catch {
          return false;
        }
      });

      const escrowId = event ? this.contracts.paymentEscrow.interface.parseLog(event).args.escrowId : null;

      return {
        success: true,
        txHash: receipt.hash,
        escrowId,
        amount,
        payee: payeeAddress,
        releaseTime,
        description
      };
    } catch (error) {
      console.error('Create escrow error:', error);
      throw error;
    }
  }

  async releaseEscrow(escrowId) {
    try {
      const tx = await this.contracts.paymentEscrow.releaseEscrow(escrowId);
      const receipt = await tx.wait();
      return {
        success: true,
        txHash: receipt.hash,
        escrowId
      };
    } catch (error) {
      console.error('Release escrow error:', error);
      throw error;
    }
  }

  // Project Methods
  async createProject(name, description, isPublic = true) {
    try {
      const tx = await this.contracts.projectCollaboration.createProject(
        name,
        description,
        isPublic
      );
      const receipt = await tx.wait();
      
      // Get project ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contracts.projectCollaboration.interface.parseLog(log);
          return parsed && parsed.name === 'ProjectCreated';
        } catch {
          return false;
        }
      });

      const projectId = event ? this.contracts.projectCollaboration.interface.parseLog(event).args.projectId : null;

      return {
        success: true,
        txHash: receipt.hash,
        projectId,
        name,
        description
      };
    } catch (error) {
      console.error('Create project error:', error);
      throw error;
    }
  }

  async getProject(projectId) {
    try {
      const project = await this.contracts.projectCollaboration.getProject(projectId);
      return {
        projectId: project.projectId,
        name: project.name,
        description: project.description,
        owner: project.owner,
        status: Number(project.status),
        progress: Number(project.progress),
        createdAt: Number(project.createdAt)
      };
    } catch (error) {
      console.error('Get project error:', error);
      throw error;
    }
  }

  // Utility Methods
  async getBalance(address) {
    try {
      const balance = await this.provider.getBalance(address || this.account);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Get balance error:', error);
      return '0';
    }
  }

  async signMessage(message) {
    try {
      const signature = await this.signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Sign message error:', error);
      throw error;
    }
  }

  disconnect() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.account = null;
  }
}

// Export singleton instance
export const web3Service = new Web3Service();
export default web3Service;

