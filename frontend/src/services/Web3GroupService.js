/**
 * Web3GroupService.js
 * 
 * Integrates with backend Web3 API for blockchain-based group management
 * Uses smart contracts deployed on Sepolia testnet
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const WEB3_API_BASE = `${API_BASE_URL}/api/web3`;

class Web3GroupService {
  constructor() {
    this.groupsEndpoint = `${WEB3_API_BASE}/groups`;
  }

  /**
   * Get JWT token from localStorage
   */
  getAuthToken() {
    return localStorage.getItem('dchat_jwt_token');
  }

  /**
   * Get user's private key (should be securely stored)
   * WARNING: In production, use a more secure method
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

    const response = await fetch(`${this.groupsEndpoint}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  }

  /**
   * Create a new group on blockchain
   * @param {Object} groupData - Group creation data
   * @param {string} groupData.groupName - Name of the group
   * @param {string} groupData.groupAvatar - IPFS hash or URL of group avatar
   * @param {string} groupData.description - Group description
   * @param {boolean} groupData.isPublic - Whether group is public
   * @param {number} groupData.maxMembers - Maximum number of members
   * @returns {Promise<Object>} Transaction result
   */
  async createGroup(groupData) {
    try {
      console.log('📝 Creating group on blockchain:', groupData);

      const privateKey = this.getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found. Please connect your wallet.');
      }

      const response = await this.apiRequest('/create', {
        method: 'POST',
        body: JSON.stringify({
          groupName: groupData.groupName || groupData.name,
          groupAvatar: groupData.groupAvatar || groupData.avatar || '',
          description: groupData.description || '',
          isPublic: groupData.isPublic !== undefined ? groupData.isPublic : true,
          maxMembers: groupData.maxMembers || 100,
          privateKey
        })
      });

      return response;
    } catch (error) {
      console.error('❌ Failed to create group:', error);
      throw error;
    }
  }

  /**
   * Get group information from blockchain
   * @param {string} groupId - Group ID
   * @returns {Promise<Object>} Group data
   */
  async getGroup(groupId) {
    try {
      const response = await this.apiRequest(`/${groupId}`);
      return response.group;
    } catch (error) {
      console.error(`❌ Failed to get group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Join a group
   * @param {string} groupId - Group ID to join
   * @returns {Promise<Object>} Transaction result
   */
  async joinGroup(groupId) {
    try {
      console.log(`📥 Joining group: ${groupId}`);

      const privateKey = this.getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found. Please connect your wallet.');
      }

      const response = await this.apiRequest(`/${groupId}/join`, {
        method: 'POST',
        body: JSON.stringify({ privateKey })
      });

      return response;
    } catch (error) {
      console.error('❌ Failed to join group:', error);
      throw error;
    }
  }

  /**
   * Invite a member to the group
   * @param {string} groupId - Group ID
   * @param {string} memberAddress - Ethereum address of member to invite
   * @returns {Promise<Object>} Transaction result
   */
  async inviteMember(groupId, memberAddress) {
    try {
      console.log(`📨 Inviting member ${memberAddress} to group ${groupId}`);

      const privateKey = this.getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found. Please connect your wallet.');
      }

      const response = await this.apiRequest(`/${groupId}/invite`, {
        method: 'POST',
        body: JSON.stringify({
          memberAddress,
          privateKey
        })
      });

      return response;
    } catch (error) {
      console.error('❌ Failed to invite member:', error);
      throw error;
    }
  }

  /**
   * Leave a group
   * @param {string} groupId - Group ID to leave
   * @returns {Promise<Object>} Transaction result
   */
  async leaveGroup(groupId) {
    try {
      console.log(`📤 Leaving group: ${groupId}`);

      const privateKey = this.getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found. Please connect your wallet.');
      }

      const response = await this.apiRequest(`/${groupId}/leave`, {
        method: 'POST',
        body: JSON.stringify({ privateKey })
      });

      return response;
    } catch (error) {
      console.error('❌ Failed to leave group:', error);
      throw error;
    }
  }

  /**
   * Remove a member from the group (admin only)
   * @param {string} groupId - Group ID
   * @param {string} memberAddress - Ethereum address of member to remove
   * @returns {Promise<Object>} Transaction result
   */
  async removeMember(groupId, memberAddress) {
    try {
      console.log(`🚫 Removing member ${memberAddress} from group ${groupId}`);

      const privateKey = this.getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found. Please connect your wallet.');
      }

      const response = await this.apiRequest(`/${groupId}/members/${memberAddress}`, {
        method: 'DELETE',
        body: JSON.stringify({ privateKey })
      });

      return response;
    } catch (error) {
      console.error('❌ Failed to remove member:', error);
      throw error;
    }
  }

  /**
   * Update group settings (owner only)
   * @param {string} groupId - Group ID
   * @param {Object} settings - New settings
   * @returns {Promise<Object>} Transaction result
   */
  async updateGroupSettings(groupId, settings) {
    try {
      console.log(`⚙️ Updating group ${groupId} settings:`, settings);

      const privateKey = this.getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not found. Please connect your wallet.');
      }

      const response = await this.apiRequest(`/${groupId}/settings`, {
        method: 'PUT',
        body: JSON.stringify({
          ...settings,
          privateKey
        })
      });

      return response;
    } catch (error) {
      console.error('❌ Failed to update group settings:', error);
      throw error;
    }
  }

  /**
   * Get all groups for a user
   * @param {string} userAddress - Ethereum address of user
   * @returns {Promise<Array>} Array of group IDs
   */
  async getUserGroups(userAddress) {
    try {
      const response = await this.apiRequest(`/user/${userAddress}`);
      return response.groupIds || [];
    } catch (error) {
      console.error(`❌ Failed to get user groups for ${userAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get all members of a group
   * @param {string} groupId - Group ID
   * @returns {Promise<Array>} Array of member addresses
   */
  async getGroupMembers(groupId) {
    try {
      const response = await this.apiRequest(`/${groupId}/members`);
      return response.members || [];
    } catch (error) {
      console.error(`❌ Failed to get group members for ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Check API health
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.groupsEndpoint}/health`);
      return await response.json();
    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
const web3GroupService = new Web3GroupService();
export default web3GroupService;
