/**
 * Web3PaymentService.js
 * 
 * Integrates with backend Web3 API for blockchain-based payments and red packets
 * Supports group collection, AA payment, crowdfunding, and red packets
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const WEB3_API_BASE = `${API_BASE_URL}/api/web3`;

class Web3PaymentService {
  constructor() {
    this.paymentsEndpoint = `${WEB3_API_BASE}/payments`;
  }

  /**
   * Get JWT token from localStorage
   */
  getAuthToken() {
    return localStorage.getItem('dchat_jwt_token');
  }

  /**
   * Get user's private key
   */
  getPrivateKey() {
    return localStorage.getItem('dchat_private_key');
  }

  /**
   * Make authenticated API request
   */
  async apiRequest(endpoint, options = {}) {
    const token = this.getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.paymentsEndpoint}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  }

  // ============= Group Payments =============

  /**
   * Create a group collection (free amount contribution)
   * @param {Object} collectionData
   * @param {string} collectionData.groupId - Group ID
   * @param {string} collectionData.title - Collection title
   * @param {string} collectionData.description - Collection description
   * @param {Array<string>} collectionData.participants - Array of participant addresses
   * @returns {Promise<Object>} Transaction result
   */
  async createGroupCollection(collectionData) {
    try {
      console.log('💰 Creating group collection:', collectionData);

      const privateKey = this.getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found. Please connect your wallet.');
      }

      const response = await this.apiRequest('/group-collection', {
        method: 'POST',
        body: JSON.stringify({
          ...collectionData,
          privateKey
        })
      });

      console.log('✅ Group collection created:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to create group collection:', error);
      throw error;
    }
  }

  /**
   * Create an AA payment (split bill)
   * @param {Object} paymentData
   * @param {string} paymentData.groupId - Group ID
   * @param {string} paymentData.title - Payment title
   * @param {string} paymentData.description - Payment description
   * @param {Array<string>} paymentData.participants - Array of participant addresses
   * @param {string} paymentData.amountPerPerson - Amount per person in ETH
   * @returns {Promise<Object>} Transaction result
   */
  async createAAPayment(paymentData) {
    try {
      console.log('🧾 Creating AA payment:', paymentData);

      const privateKey = this.getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found. Please connect your wallet.');
      }

      const response = await this.apiRequest('/aa-payment', {
        method: 'POST',
        body: JSON.stringify({
          ...paymentData,
          privateKey
        })
      });

      console.log('✅ AA payment created:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to create AA payment:', error);
      throw error;
    }
  }

  /**
   * Create a crowdfunding campaign
   * @param {Object} crowdfundingData
   * @param {string} crowdfundingData.groupId - Group ID
   * @param {string} crowdfundingData.title - Campaign title
   * @param {string} crowdfundingData.description - Campaign description
   * @param {string} crowdfundingData.targetAmount - Target amount in ETH
   * @param {number} crowdfundingData.deadline - Deadline timestamp
   * @param {string} crowdfundingData.initialContribution - Initial contribution in ETH
   * @returns {Promise<Object>} Transaction result
   */
  async createCrowdfunding(crowdfundingData) {
    try {
      console.log('🎯 Creating crowdfunding:', crowdfundingData);

      const privateKey = this.getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found. Please connect your wallet.');
      }

      const response = await this.apiRequest('/crowdfunding', {
        method: 'POST',
        body: JSON.stringify({
          ...crowdfundingData,
          privateKey
        })
      });

      console.log('✅ Crowdfunding created:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to create crowdfunding:', error);
      throw error;
    }
  }

  /**
   * Contribute to a payment
   * @param {string} paymentId - Payment ID
   * @param {string} amount - Amount to contribute in ETH
   * @returns {Promise<Object>} Transaction result
   */
  async contribute(paymentId, amount) {
    try {
      console.log(`💸 Contributing ${amount} ETH to payment ${paymentId}`);

      const privateKey = this.getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found. Please connect your wallet.');
      }

      const response = await this.apiRequest(`/contribute/${paymentId}`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          privateKey
        })
      });

      console.log('✅ Contribution successful:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to contribute:', error);
      throw error;
    }
  }

  /**
   * Get payment details
   * @param {string} paymentId - Payment ID
   * @returns {Promise<Object>} Payment data
   */
  async getPayment(paymentId) {
    try {
      const response = await this.apiRequest(`/payment/${paymentId}`);
      return response.payment;
    } catch (error) {
      console.error(`❌ Failed to get payment ${paymentId}:`, error);
      throw error;
    }
  }

  // ============= Red Packets =============

  /**
   * Create a random red packet (luck-based)
   * @param {Object} packetData
   * @param {string} packetData.groupId - Group ID
   * @param {string} packetData.message - Red packet message
   * @param {number} packetData.count - Number of red packets
   * @param {string} packetData.totalAmount - Total amount in ETH
   * @returns {Promise<Object>} Transaction result
   */
  async createRandomRedPacket(packetData) {
    try {
      console.log('🧧 Creating random red packet:', packetData);

      const privateKey = this.getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found. Please connect your wallet.');
      }

      const response = await this.apiRequest('/redpacket/random', {
        method: 'POST',
        body: JSON.stringify({
          ...packetData,
          privateKey
        })
      });

      console.log('✅ Random red packet created:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to create random red packet:', error);
      throw error;
    }
  }

  /**
   * Create a fixed red packet (equal distribution)
   * @param {Object} packetData
   * @param {string} packetData.groupId - Group ID
   * @param {string} packetData.message - Red packet message
   * @param {number} packetData.count - Number of red packets
   * @param {string} packetData.totalAmount - Total amount in ETH
   * @returns {Promise<Object>} Transaction result
   */
  async createFixedRedPacket(packetData) {
    try {
      console.log('🧧 Creating fixed red packet:', packetData);

      const privateKey = this.getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found. Please connect your wallet.');
      }

      const response = await this.apiRequest('/redpacket/fixed', {
        method: 'POST',
        body: JSON.stringify({
          ...packetData,
          privateKey
        })
      });

      console.log('✅ Fixed red packet created:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to create fixed red packet:', error);
      throw error;
    }
  }

  /**
   * Create an exclusive red packet (specific recipients)
   * @param {Object} packetData
   * @param {string} packetData.groupId - Group ID
   * @param {string} packetData.message - Red packet message
   * @param {Array<string>} packetData.recipients - Array of recipient addresses
   * @param {string} packetData.totalAmount - Total amount in ETH
   * @returns {Promise<Object>} Transaction result
   */
  async createExclusiveRedPacket(packetData) {
    try {
      console.log('🎁 Creating exclusive red packet:', packetData);

      const privateKey = this.getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found. Please connect your wallet.');
      }

      const response = await this.apiRequest('/redpacket/exclusive', {
        method: 'POST',
        body: JSON.stringify({
          ...packetData,
          privateKey
        })
      });

      console.log('✅ Exclusive red packet created:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to create exclusive red packet:', error);
      throw error;
    }
  }

  /**
   * Claim a red packet
   * @param {string} packetId - Red packet ID
   * @returns {Promise<Object>} Transaction result with claimed amount
   */
  async claimRedPacket(packetId) {
    try {
      console.log(`🎉 Claiming red packet: ${packetId}`);

      const privateKey = this.getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found. Please connect your wallet.');
      }

      const response = await this.apiRequest(`/redpacket/claim/${packetId}`, {
        method: 'POST',
        body: JSON.stringify({ privateKey })
      });

      console.log('✅ Red packet claimed successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to claim red packet:', error);
      throw error;
    }
  }

  /**
   * Get red packet details
   * @param {string} packetId - Red packet ID
   * @returns {Promise<Object>} Red packet data
   */
  async getRedPacket(packetId) {
    try {
      const response = await this.apiRequest(`/redpacket/${packetId}`);
      return response.packet;
    } catch (error) {
      console.error(`❌ Failed to get red packet ${packetId}:`, error);
      throw error;
    }
  }

  /**
   * Get red packet claim records
   * @param {string} packetId - Red packet ID
   * @returns {Promise<Array>} Array of claim records
   */
  async getClaimRecords(packetId) {
    try {
      const response = await this.apiRequest(`/redpacket/${packetId}/records`);
      return response.records || [];
    } catch (error) {
      console.error(`❌ Failed to get claim records for ${packetId}:`, error);
      throw error;
    }
  }

  /**
   * Check API health
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.paymentsEndpoint}/health`);
      return await response.json();
    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
const web3PaymentService = new Web3PaymentService();
export default web3PaymentService;
