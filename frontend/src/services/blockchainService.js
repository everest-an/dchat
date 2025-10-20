/**
 * Blockchain Service for Dchat
 * Handles smart contract interactions using ethers.js
 */

import { ethers } from 'ethers';

// Contract ABIs (simplified for demo)
const MESSAGE_STORAGE_ABI = [
  "function storeMessage(address _receiver, bytes32 _contentHash, string memory _ipfsHash) external returns (uint256)",
  "function getUserMessageIds(address _user) external view returns (uint256[])",
  "function getMessage(uint256 _messageId) external view returns (tuple(address sender, address receiver, bytes32 contentHash, string ipfsHash, uint256 timestamp, bool isDeleted))",
  "function getConversation(address _user1, address _user2) external view returns (uint256[])",
  "event MessageStored(uint256 indexed messageId, address indexed sender, address indexed receiver, bytes32 contentHash, string ipfsHash, uint256 timestamp)"
];

const USER_REGISTRY_ABI = [
  "function registerUser(string memory _username, string memory _publicKey, string memory _profileIPFS) external",
  "function getUser(address _userAddress) external view returns (tuple(address walletAddress, string username, string publicKey, string profileIPFS, uint256 registeredAt, bool isActive))",
  "function getPublicKey(address _userAddress) external view returns (string memory)",
  "function isUserRegistered(address _userAddress) external view returns (bool)",
  "event UserRegistered(address indexed userAddress, string username, string publicKey, uint256 timestamp)"
];

const PAYMENT_CHANNEL_ABI = [
  "function sendPayment(address _receiver, string memory _message) external payable",
  "function getPayment(uint256 _paymentId) external view returns (tuple(address sender, address receiver, uint256 amount, uint256 timestamp, string message, bool isCompleted))",
  "function getUserPayments(address _user) external view returns (uint256[])",
  "event PaymentSent(uint256 indexed paymentId, address indexed sender, address indexed receiver, uint256 amount, string message, uint256 timestamp)"
];

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.messageStorageContract = null;
    this.userRegistryContract = null;
    this.paymentChannelContract = null;
    this.currentAccount = null;
    
    // Contract addresses (to be deployed on Sepolia testnet)
    this.contractAddresses = {
      messageStorage: process.env.REACT_APP_MESSAGE_STORAGE_ADDRESS || '0x0000000000000000000000000000000000000000',
      userRegistry: process.env.REACT_APP_USER_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
      paymentChannel: process.env.REACT_APP_PAYMENT_CHANNEL_ADDRESS || '0x0000000000000000000000000000000000000000'
    };
  }

  /**
   * Connect to MetaMask wallet
   * @returns {Promise<string>} Connected wallet address
   */
  async connectWallet() {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed');
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      // Create provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.currentAccount = accounts[0];

      // Check network
      const network = await this.provider.getNetwork();
      if (network.chainId !== 11155111n) { // Sepolia chainId
        await this.switchToSepolia();
      }

      // Initialize contracts
      this.initializeContracts();

      return this.currentAccount;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  /**
   * Switch to Sepolia testnet
   */
  async switchToSepolia() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chainId in hex
      });
    } catch (error) {
      // If network doesn't exist, add it
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaa36a7',
            chainName: 'Sepolia Test Network',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io']
          }]
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Initialize smart contracts
   */
  initializeContracts() {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    this.messageStorageContract = new ethers.Contract(
      this.contractAddresses.messageStorage,
      MESSAGE_STORAGE_ABI,
      this.signer
    );

    this.userRegistryContract = new ethers.Contract(
      this.contractAddresses.userRegistry,
      USER_REGISTRY_ABI,
      this.signer
    );

    this.paymentChannelContract = new ethers.Contract(
      this.contractAddresses.paymentChannel,
      PAYMENT_CHANNEL_ABI,
      this.signer
    );
  }

  /**
   * Register user on blockchain
   * @param {string} username
   * @param {string} publicKey
   * @param {string} profileIPFS
   * @returns {Promise<Object>} Transaction receipt
   */
  async registerUser(username, publicKey, profileIPFS = '') {
    try {
      const tx = await this.userRegistryContract.registerUser(
        username,
        publicKey,
        profileIPFS
      );
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  /**
   * Check if user is registered
   * @param {string} address
   * @returns {Promise<boolean>}
   */
  async isUserRegistered(address) {
    try {
      return await this.userRegistryContract.isUserRegistered(address);
    } catch (error) {
      console.error('Error checking user registration:', error);
      return false;
    }
  }

  /**
   * Get user's public key from blockchain
   * @param {string} address
   * @returns {Promise<string>}
   */
  async getUserPublicKey(address) {
    try {
      return await this.userRegistryContract.getPublicKey(address);
    } catch (error) {
      console.error('Error getting public key:', error);
      throw error;
    }
  }

  /**
   * Store encrypted message on blockchain
   * @param {string} receiverAddress
   * @param {string} contentHash
   * @param {string} ipfsHash
   * @returns {Promise<Object>} Transaction receipt
   */
  async storeMessage(receiverAddress, contentHash, ipfsHash) {
    try {
      // Convert content hash to bytes32
      const contentHashBytes = ethers.zeroPadValue(
        ethers.toBeHex(contentHash),
        32
      );

      const tx = await this.messageStorageContract.storeMessage(
        receiverAddress,
        contentHashBytes,
        ipfsHash
      );
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error storing message:', error);
      throw error;
    }
  }

  /**
   * Get conversation between two users
   * @param {string} user1Address
   * @param {string} user2Address
   * @returns {Promise<Array>} Array of message IDs
   */
  async getConversation(user1Address, user2Address) {
    try {
      const messageIds = await this.messageStorageContract.getConversation(
        user1Address,
        user2Address
      );
      return messageIds.map(id => Number(id));
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }

  /**
   * Get message by ID
   * @param {number} messageId
   * @returns {Promise<Object>} Message object
   */
  async getMessage(messageId) {
    try {
      const message = await this.messageStorageContract.getMessage(messageId);
      return {
        sender: message.sender,
        receiver: message.receiver,
        contentHash: message.contentHash,
        ipfsHash: message.ipfsHash,
        timestamp: Number(message.timestamp),
        isDeleted: message.isDeleted
      };
    } catch (error) {
      console.error('Error getting message:', error);
      throw error;
    }
  }

  /**
   * Send ETH payment
   * @param {string} receiverAddress
   * @param {string} amount - Amount in ETH
   * @param {string} message
   * @returns {Promise<Object>} Transaction receipt
   */
  async sendPayment(receiverAddress, amount, message = '') {
    try {
      const amountWei = ethers.parseEther(amount);
      const tx = await this.paymentChannelContract.sendPayment(
        receiverAddress,
        message,
        { value: amountWei }
      );
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error sending payment:', error);
      throw error;
    }
  }

  /**
   * Get user's payment history
   * @param {string} userAddress
   * @returns {Promise<Array>} Array of payment IDs
   */
  async getUserPayments(userAddress) {
    try {
      const paymentIds = await this.paymentChannelContract.getUserPayments(
        userAddress
      );
      return paymentIds.map(id => Number(id));
    } catch (error) {
      console.error('Error getting user payments:', error);
      throw error;
    }
  }

  /**
   * Get current account
   * @returns {string} Current wallet address
   */
  getCurrentAccount() {
    return this.currentAccount;
  }

  /**
   * Get account balance
   * @returns {Promise<string>} Balance in ETH
   */
  async getBalance() {
    try {
      const balance = await this.provider.getBalance(this.currentAccount);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }
}

export default new BlockchainService();

