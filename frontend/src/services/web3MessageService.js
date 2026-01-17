/**
 * Web3 Message Service for Dchat
 * Integrates encryption, IPFS storage, and blockchain
 */

import encryptionService from './encryptionService';
import ipfsService from './IPFSService';
import blockchainService from './blockchainService';

class Web3MessageService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize Web3 messaging system
   * @returns {Promise<boolean>}
   */
  async initialize() {
    try {
      // Connect wallet
      await blockchainService.connectWallet();

      // Load or generate encryption keys
      let keys = await encryptionService.loadKeys();
      if (!keys) {
        console.log('Generating new encryption keys...');
        keys = await encryptionService.generateKeyPair();
        await encryptionService.storeKeys(keys.privateKey, keys.publicKey);

        // Check if user is registered on blockchain
        const currentAccount = blockchainService.getCurrentAccount();
        const isRegistered = await blockchainService.isUserRegistered(currentAccount);

        if (!isRegistered) {
          console.log('Registering user on blockchain...');
          // Generate a default username from address
          const username = `user_${currentAccount.slice(2, 8)}`;
          await blockchainService.registerUser(username, keys.publicKey);
        }
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing Web3 messaging:', error);
      throw error;
    }
  }

  /**
   * Send encrypted message
   * @param {string} receiverAddress - Recipient's wallet address
   * @param {string} messageText - Plain text message
   * @returns {Promise<Object>} Transaction receipt
   */
  async sendMessage(receiverAddress, messageText) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // 1. Get recipient's public key from blockchain
      const recipientPublicKey = await blockchainService.getUserPublicKey(
        receiverAddress
      );

      // 2. Encrypt message
      const encryptedPackage = await encryptionService.encryptMessage(
        messageText,
        recipientPublicKey
      );

      // 3. Upload encrypted message to IPFS
      const ipfsHash = await ipfsService.uploadEncryptedMessage(encryptedPackage);

      // 4. Generate content hash
      const contentHash = await encryptionService.generateContentHash(
        JSON.stringify(encryptedPackage)
      );

      // 5. Store message metadata on blockchain
      const receipt = await blockchainService.storeMessage(
        receiverAddress,
        contentHash,
        ipfsHash
      );

      console.log('✅ Message sent successfully:', {
        ipfsHash,
        contentHash,
        txHash: receipt.hash,
      });

      return {
        success: true,
        ipfsHash,
        contentHash,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt message
   * @param {number} messageId - Blockchain message ID
   * @returns {Promise<Object>} Decrypted message
   */
  async retrieveMessage(messageId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // 1. Get message metadata from blockchain
      const messageData = await blockchainService.getMessage(messageId);

      // 2. Retrieve encrypted message from IPFS
      const encryptedPackage = await ipfsService.retrieveEncryptedMessage(
        messageData.ipfsHash
      );

      // 3. Decrypt message
      const keys = await encryptionService.loadKeys();
      const decryptedText = await encryptionService.decryptMessage(
        encryptedPackage,
        keys.privateKey
      );

      return {
        messageId,
        sender: messageData.sender,
        receiver: messageData.receiver,
        text: decryptedText,
        timestamp: messageData.timestamp,
        ipfsHash: messageData.ipfsHash,
      };
    } catch (error) {
      console.error('Error retrieving message:', error);
      throw error;
    }
  }

  /**
   * Get conversation between current user and another user
   * @param {string} otherUserAddress
   * @returns {Promise<Array>} Array of decrypted messages
   */
  async getConversation(otherUserAddress) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const currentAccount = blockchainService.getCurrentAccount();

      // Get message IDs from blockchain
      const messageIds = await blockchainService.getConversation(
        currentAccount,
        otherUserAddress
      );

      // Retrieve and decrypt all messages
      const messages = await Promise.all(
        messageIds.map(async (id) => {
          try {
            return await this.retrieveMessage(id);
          } catch (error) {
            console.error(`Error retrieving message ${id}:`, error);
            return null;
          }
        })
      );

      // Filter out failed retrievals and sort by timestamp
      return messages
        .filter((msg) => msg !== null)
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }

  /**
   * Send payment with message
   * @param {string} receiverAddress
   * @param {string} amount - Amount in ETH
   * @param {string} message
   * @returns {Promise<Object>} Transaction receipt
   */
  async sendPayment(receiverAddress, amount, message = '') {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const receipt = await blockchainService.sendPayment(
        receiverAddress,
        amount,
        message
      );

      console.log('💰 Payment sent successfully:', receipt.hash);

      return {
        success: true,
        transactionHash: receipt.hash,
        amount,
        receiver: receiverAddress,
      };
    } catch (error) {
      console.error('Error sending payment:', error);
      throw error;
    }
  }

  /**
   * Get user's payment history
   * @returns {Promise<Array>} Array of payments
   */
  async getPaymentHistory() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const currentAccount = blockchainService.getCurrentAccount();
      const paymentIds = await blockchainService.getUserPayments(currentAccount);

      // Note: In production, you would fetch full payment details
      return paymentIds;
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  }

  /**
   * Get current user's wallet address
   * @returns {string}
   */
  getCurrentAddress() {
    return blockchainService.getCurrentAccount();
  }

  /**
   * Get current user's balance
   * @returns {Promise<string>} Balance in ETH
   */
  async getBalance() {
    return await blockchainService.getBalance();
  }

  /**
   * Check if initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }
}

export default new Web3MessageService();

