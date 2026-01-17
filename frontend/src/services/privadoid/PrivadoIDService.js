/**
 * Privado ID Service
 * Handles all Privado ID related API calls
 */

// Use correct backend URL
const API_BASE = import.meta.env?.VITE_API_URL || 'https://backend-op1c06n9l-everest-ans-projects.vercel.app';

// Demo verification data
const DEMO_VERIFICATIONS = [];
const DEMO_VERIFICATION_TYPES = [
  {
    type: 'kyc_humanity',
    label: 'Humanity Verification',
    description: 'Prove you are a real human using zero-knowledge proof',
    category: 'kyc'
  },
  {
    type: 'kyc_age',
    label: 'Age Verification',
    description: 'Prove you are over 18 years old',
    category: 'kyc'
  },
  {
    type: 'kyc_country',
    label: 'Country Verification',
    description: 'Prove your country of residence',
    category: 'kyc'
  },
  {
    type: 'kyb_registration',
    label: 'Company Registration',
    description: 'Verify your company registration',
    category: 'kyb'
  },
  {
    type: 'kyb_tax_id',
    label: 'Tax ID Verification',
    description: 'Verify your company tax identification',
    category: 'kyb'
  }
];

class PrivadoIDService {
  constructor() {
    this.demoMode = false;
  }

  /**
   * Get auth headers
   */
  getHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Make API request with demo mode fallback
   */
  async apiRequest(method, endpoint, data = null) {
    try {
      const options = {
        method,
        headers: this.getHeaders()
      };
      
      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(`${API_BASE}${endpoint}`, options);
      
      if (!response.ok) {
        if (response.status === 503 || response.status === 502) {
          this.demoMode = true;
          throw new Error('Backend unavailable');
        }
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
      }
      
      return await response.json();
    } catch (error) {
      if (error.message === 'Failed to fetch' || error.message === 'Backend unavailable') {
        this.demoMode = true;
        throw error;
      }
      throw error;
    }
  }

  /**
   * Get available verification types
   * @returns {Promise<Array>} List of verification types
   */
  async getVerificationTypes() {
    try {
      const result = await this.apiRequest('GET', '/api/verifications/types');
      return result.data || DEMO_VERIFICATION_TYPES;
    } catch (error) {
      console.warn('Using demo verification types:', error.message);
      return DEMO_VERIFICATION_TYPES;
    }
  }

  /**
   * Create a verification request
   * @param {Object} request - Verification request data
   * @returns {Promise<Object>} Verification request response with QR code and links
   */
  async createVerificationRequest(request) {
    try {
      const result = await this.apiRequest('POST', '/api/verifications/request', request);
      return result.data;
    } catch (error) {
      console.warn('Demo mode: simulating verification request');
      // Return demo QR code data
      const requestId = `demo_${Date.now()}`;
      return {
        request_id: requestId,
        qr_code_data: JSON.stringify({
          id: requestId,
          type: 'demo_verification',
          body: { reason: `Demo ${request.type} verification` }
        }),
        deep_link: `iden3comm://?demo=true&type=${request.type}`,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      };
    }
  }

  /**
   * Get user's verifications
   * @param {number} userId - User ID
   * @returns {Promise<Array>} List of user verifications
   */
  async getUserVerifications(userId) {
    try {
      const result = await this.apiRequest('GET', `/api/verifications/user/${userId}`);
      return result.data || [];
    } catch (error) {
      console.warn('Using demo verifications:', error.message);
      return DEMO_VERIFICATIONS;
    }
  }

  /**
   * Delete a verification
   * @param {number} verificationId - Verification ID
   * @returns {Promise<void>}
   */
  async deleteVerification(verificationId) {
    try {
      await this.apiRequest('DELETE', `/api/verifications/${verificationId}`);
    } catch (error) {
      console.warn('Demo mode: simulating verification deletion');
      // In demo mode, just log the deletion
    }
  }

  /**
   * Check verification request status
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} Status object
   */
  async checkVerificationStatus(requestId) {
    try {
      const result = await this.apiRequest('GET', `/api/verifications/status/${requestId}`);
      return result;
    } catch (error) {
      return { success: true, status: 'pending' };
    }
  }

  /**
   * Verify a proof (called by the wallet callback)
   * @param {Object} proofData - Proof data from Privado ID wallet
   * @returns {Promise<Object>} Verification result
   */
  async verifyProof(proofData) {
    try {
      const result = await this.apiRequest('POST', '/api/verifications/callback', proofData);
      return result;
    } catch (error) {
      console.error('Failed to verify proof:', error);
      throw error;
    }
  }

  /**
   * Check if running in demo mode
   */
  isDemoMode() {
    return this.demoMode;
  }
}

export default new PrivadoIDService();
