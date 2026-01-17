/**
 * Privado ID Service
 * Handles all Privado ID related API calls
 */

import apiClient from '../apiClient';

class PrivadoIDService {
  /**
   * Get available verification types
   * @returns {Promise<Array>} List of verification types
   */
  async getVerificationTypes() {
    try {
      const response = await apiClient.get('/verifications/types');
      return response.data;
    } catch (error) {
      console.error('Failed to get verification types:', error);
      throw error;
    }
  }

  /**
   * Create a verification request
   * @param {Object} request - Verification request data
   * @param {string} request.type - Type of verification
   * @param {Object} request.required_claim - Required claim data
   * @param {string} request.schema - Credential schema URL
   * @returns {Promise<Object>} Verification request response with QR code and links
   */
  async createVerificationRequest(request) {
    try {
      const response = await apiClient.post('/verifications/request', request);
      return response.data;
    } catch (error) {
      console.error('Failed to create verification request:', error);
      throw error;
    }
  }

  /**
   * Get user's verifications
   * @param {number} userId - User ID
   * @returns {Promise<Array>} List of user verifications
   */
  async getUserVerifications(userId) {
    try {
      const response = await apiClient.get(`/verifications/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get user verifications:', error);
      throw error;
    }
  }

  /**
   * Delete a verification
   * @param {number} verificationId - Verification ID
   * @returns {Promise<void>}
   */
  async deleteVerification(verificationId) {
    try {
      await apiClient.delete(`/verifications/${verificationId}`);
    } catch (error) {
      console.error('Failed to delete verification:', error);
      throw error;
    }
  }

  /**
   * Verify a proof (called by the wallet callback)
   * @param {Object} proofData - Proof data from Privado ID wallet
   * @returns {Promise<Object>} Verification result
   */
  async verifyProof(proofData) {
    try {
      const response = await apiClient.post('/verifications/verify', proofData);
      return response.data;
    } catch (error) {
      console.error('Failed to verify proof:', error);
      throw error;
    }
  }
}

export default new PrivadoIDService();
