import axios from 'axios'

// 使用环境变量或默认后端 URL
const API_BASE_URL = import.meta.env?.VITE_API_URL || 
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || 
  'https://backend-op1c06n9l-everest-ans-projects.vercel.app'

/**
 * Web3 Authentication Service
 * Handles wallet-based authentication flow with backend
 */
class Web3AuthService {
  constructor() {
    this.apiUrl = API_BASE_URL
  }

  /**
   * Request a nonce from the backend for wallet authentication
   * @param {string} walletAddress - The user's wallet address
   * @returns {Promise<{nonce: string, message: string}>}
   */
  async requestNonce(walletAddress) {
    try {
      const response = await axios.post(`${this.apiUrl}/api/auth/nonce`, {
        wallet_address: walletAddress.toLowerCase()
      }, {
        timeout: 10000 // 10 second timeout
      })
      
      if (response.data && response.data.nonce) {
        return {
          nonce: response.data.nonce,
          message: response.data.message
        }
      }
      
      throw new Error('Invalid nonce response from server')
    } catch (error) {
      console.error('Error requesting nonce:', error)
      
      // 如果后端不可用，生成本地 nonce
      if (error.code === 'ECONNABORTED' || error.response?.status >= 500 || !error.response) {
        const localNonce = Math.floor(Math.random() * 1000000).toString()
        const message = `Sign this message to login to Dchat.\n\nNonce: ${localNonce}\nTimestamp: ${Date.now()}`
        console.warn('Using local nonce due to backend unavailability')
        return { nonce: localNonce, message, isLocal: true }
      }
      
      throw new Error(error.response?.data?.error || 'Failed to request authentication nonce')
    }
  }

  /**
   * Verify the signed message with the backend
   * @param {string} walletAddress - The user's wallet address
   * @param {string} signature - The signed message
   * @returns {Promise<{token: string, user: object}>}
   */
  async verifySignature(walletAddress, message, signature, isLocal = false) {
    // 如果是本地模式，跳过后端验证
    if (isLocal) {
      const localUser = {
        id: `local_${walletAddress.slice(2, 10)}`,
        walletAddress: walletAddress,
        displayName: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        loginMethod: 'wallet-local'
      }
      const localToken = `local_${walletAddress}_${Date.now()}`
      
      localStorage.setItem('authToken', localToken)
      localStorage.setItem('user', JSON.stringify(localUser))
      
      return { token: localToken, user: localUser }
    }

    try {
      const response = await axios.post(`${this.apiUrl}/api/auth/wallet-login`, {
        wallet_address: walletAddress.toLowerCase(),
        walletAddress: walletAddress.toLowerCase(), // 兼容两种格式
        message: message,
        signature: signature
      }, {
        timeout: 10000
      })
      
      if (response.data && response.data.token) {
        // Store the JWT token
        localStorage.setItem('authToken', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        
        return {
          token: response.data.token,
          user: response.data.user
        }
      }
      
      throw new Error('Invalid verification response from server')
    } catch (error) {
      console.error('Error verifying signature:', error)
      throw new Error(error.response?.data?.error || 'Failed to verify signature')
    }
  }

  /**
   * Complete wallet authentication flow
   * @param {string} walletAddress - The user's wallet address
   * @param {Function} signMessageFn - Function to sign the message (from wallet provider)
   * @returns {Promise<{token: string, user: object}>}
   */
  async authenticateWallet(walletAddress, signMessageFn) {
    try {
      // Step 1: Request nonce from backend
      const { message, isLocal } = await this.requestNonce(walletAddress)
      
      // Step 2: Sign the message with wallet
      const signature = await signMessageFn(message)
      
      // Step 3: Verify signature with backend
      const authResult = await this.verifySignature(walletAddress, message, signature, isLocal)
      
      return authResult
    } catch (error) {
      console.error('Wallet authentication failed:', error)
      throw error
    }
  }

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!localStorage.getItem('authToken')
  }

  /**
   * Get current user
   * @returns {object|null}
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }

  /**
   * Get auth token
   * @returns {string|null}
   */
  getAuthToken() {
    return localStorage.getItem('authToken')
  }
}

export default new Web3AuthService()
