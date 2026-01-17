import { generateKeyPair } from '../utils/encryption'

const KEYS_STORAGE_PREFIX = 'dchat_keys_'
const PUBLIC_KEYS_CACHE_PREFIX = 'dchat_pk_cache_'

export const KeyManagementService = {
  /**
   * Initialize keys for the current user if they don't exist
   * @param {string} account - User wallet address
   * @returns {Promise<{publicKey: string, privateKey: string}>}
   */
  async initializeKeys(account) {
    if (!account) throw new Error('Account is required')
    
    const storageKey = `${KEYS_STORAGE_PREFIX}${account.toLowerCase()}`
    const storedKeys = localStorage.getItem(storageKey)
    
    if (storedKeys) {
      return JSON.parse(storedKeys)
    }
    
    // Generate new key pair
    const keyPair = await generateKeyPair()
    
    // Store keys locally (in a real app, private key should be encrypted with user's signature)
    localStorage.setItem(storageKey, JSON.stringify(keyPair))
    
    // Publish public key to backend/contract (mock implementation for now)
    await this.publishPublicKey(account, keyPair.publicKey)
    
    return keyPair
  },

  /**
   * Get user's keys
   * @param {string} account - User wallet address
   * @returns {{publicKey: string, privateKey: string}|null}
   */
  getKeys(account) {
    if (!account) return null
    const storageKey = `${KEYS_STORAGE_PREFIX}${account.toLowerCase()}`
    const storedKeys = localStorage.getItem(storageKey)
    return storedKeys ? JSON.parse(storedKeys) : null
  },

  /**
   * Publish public key to the network
   * @param {string} account - User wallet address
   * @param {string} publicKey - Base64 encoded public key
   */
  async publishPublicKey(account, publicKey) {
    // In a real implementation, this would send the public key to a smart contract or backend
    // For now, we'll simulate it by storing in localStorage as a "public registry"
    const registryKey = `dchat_public_registry_${account.toLowerCase()}`
    localStorage.setItem(registryKey, publicKey)
    console.log(`Public key published for ${account}`)
  },

  /**
   * Get public key for a recipient
   * @param {string} address - Recipient wallet address
   * @returns {Promise<string|null>} Base64 encoded public key
   */
  async getPublicKey(address) {
    if (!address) return null
    
    // If sending to self, return own public key directly from local storage
    // This ensures File Transfer Assistant works even if public key registry is slow/offline
    const currentUser = localStorage.getItem('user')
    if (currentUser) {
      const userData = JSON.parse(currentUser)
      if (userData.walletAddress && userData.walletAddress.toLowerCase() === address.toLowerCase()) {
        const myKeys = this.getKeys(address)
        if (myKeys) return myKeys.publicKey
      }
    }
    
    // Check cache first
    const cacheKey = `${PUBLIC_KEYS_CACHE_PREFIX}${address.toLowerCase()}`
    const cachedKey = localStorage.getItem(cacheKey)
    if (cachedKey) return cachedKey
    
    // Fetch from registry (simulated)
    const registryKey = `dchat_public_registry_${address.toLowerCase()}`
    const publicKey = localStorage.getItem(registryKey)
    
    if (publicKey) {
      // Cache it
      localStorage.setItem(cacheKey, publicKey)
      return publicKey
    }
    
    return null
  }
}
