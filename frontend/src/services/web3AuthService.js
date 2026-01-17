import axios from 'axios'

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://dchat.pro/api'

/**
 * Web3 Authentication Service
 * Handles wallet-based authentication flow with backend
 */
class Web3AuthService {
  /**
   * Request a nonce from the backend for wallet authentication
   * @param {string} walletAddress - The user's wallet address
   * @returns {Promise<{nonce: string, message: string}>}
   */
  async requestNonce(walletAddress) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/nonce`, {
        wallet_address: walletAddress.toLowerCase()
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
      throw new Error(error.response?.data?.error || 'Failed to request authentication nonce')
    }
  }

  /**
   * Verify the signed message with the backend
   * @param {string} walletAddress - The user's wallet address
   * @param {string} signature - The signed message
   * @returns {Promise<{token: string, user: object}>}
   */
  async verifySignature(walletAddress, message, signature) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/wallet-login`, {
        wallet_address: walletAddress.toLowerCase(),
        message: message,
        signature: signature
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
      const { message } = await this.requestNonce(walletAddress)
      
      // Step 2: Sign the message with wallet
      const signature = await signMessageFn(message)
      
      // Step 3: Verify signature with backend
      const authResult = await this.verifySignature(walletAddress, message, signature)
      
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
