/**
 * Authentication Service Adapter for Go Backend
 * Provides wallet-based authentication with JWT tokens.
 * Uses the unified apiClient for all HTTP requests.
 */
import api from './apiClient'
import { API_ENDPOINTS } from '../config/api.config'
import { logError } from '../utils/errorHandler'

class AuthServiceAdapter {
  constructor() {
    this.TOKEN_KEY = 'dchat_auth_token'
    this.USER_KEY = 'dchat_user'
  }

  /**
   * Get nonce for wallet signature
   * @param {string} walletAddress - Wallet address
   * @returns {Promise<string>} Nonce string
   */
  async getNonce(walletAddress) {
    try {
      const data = await api.post(
        API_ENDPOINTS.AUTH.NONCE,
        { wallet_address: walletAddress },
        { skipAuth: true }
      )
      return data.nonce
    } catch (error) {
      logError('AuthServiceAdapter.getNonce', error)
      throw error
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
      const data = await api.post(
        API_ENDPOINTS.AUTH.WALLET_LOGIN,
        { wallet_address: walletAddress, signature },
        { skipAuth: true }
      )
      this.saveToken(data.token)
      this.saveUser(data.user)
      return data
    } catch (error) {
      logError('AuthServiceAdapter.walletLogin', error)
      throw error
    }
  }

  /**
   * Get current user
   * @returns {Promise<Object>} User data
   */
  async getCurrentUser() {
    try {
      if (!this.getToken()) throw new Error('No authentication token')
      const data = await api.get(API_ENDPOINTS.USER.ME)
      this.saveUser(data.user)
      return data.user
    } catch (error) {
      logError('AuthServiceAdapter.getCurrentUser', error)
      throw error
    }
  }

  /** Save authentication token */
  saveToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token)
  }

  /** Get authentication token */
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY)
  }

  /** Save user data (non-sensitive) */
  saveUser(user) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user))
  }

  /** Get user data */
  getUser() {
    try {
      const userData = localStorage.getItem(this.USER_KEY)
      return userData ? JSON.parse(userData) : null
    } catch {
      return null
    }
  }

  /** Check if user is authenticated */
  isAuthenticated() {
    return !!this.getToken()
  }

  /** Logout user and clear all auth data */
  logout() {
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.USER_KEY)
  }

  /** Alias for logout */
  clearAuth() {
    this.logout()
  }
}

// Export singleton instance
export const authServiceAdapter = new AuthServiceAdapter()
export default authServiceAdapter
