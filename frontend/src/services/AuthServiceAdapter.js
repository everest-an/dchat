/**
 * Authentication Service Adapter for Go Backend
 * Provides wallet-based authentication with JWT tokens
 */

import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';

class AuthServiceAdapter {
  constructor() {
    this.TOKEN_KEY = 'dchat_auth_token';
    this.USER_KEY = 'dchat_user';
  }

  /**
   * Get nonce for wallet signature
   * @param {string} walletAddress - Wallet address
   * @returns {Promise<string>} Nonce string
   */
  async getNonce(walletAddress) {
    try {
      const response = await fetch(`${API_CONFIG.API_BASE_URL}${API_ENDPOINTS.AUTH.NONCE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wallet_address: walletAddress }),
      });

      if (!response.ok) {
        throw new Error('Failed to get nonce');
      }

      const data = await response.json();
      return data.nonce;
    } catch (error) {
      console.error('Get nonce error:', error);
      throw error;
    }
  }

  /**
   * Login with wallet signature
   * @param {string} walletAddress - Wallet address
   * @param {string} signature - Signed message
   * @returns {Promise<Object>} User data and token
   */
  async walletLogin(walletAddress, signature) {
    try {
      const response = await fetch(`${API_CONFIG.API_BASE_URL}${API_ENDPOINTS.AUTH.WALLET_LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          signature: signature,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      
      // Save token and user data
      this.saveToken(data.token);
      this.saveUser(data.user);

      return data;
    } catch (error) {
      console.error('Wallet login error:', error);
      throw error;
    }
  }

  /**
   * Get current user
   * @returns {Promise<Object>} User data
   */
  async getCurrentUser() {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_CONFIG.API_BASE_URL}${API_ENDPOINTS.USER.ME}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get user');
      }

      const data = await response.json();
      this.saveUser(data.user);
      return data.user;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  /**
   * Save authentication token
   * @param {string} token - JWT token
   */
  saveToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Get authentication token
   * @returns {string|null} JWT token
   */
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Save user data
   * @param {Object} user - User object
   */
  saveUser(user) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Get user data
   * @returns {Object|null} User object
   */
  getUser() {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Clear all auth data
   */
  clearAuth() {
    this.logout();
  }
}

// Export singleton instance
export const authServiceAdapter = new AuthServiceAdapter();
export default authServiceAdapter;
