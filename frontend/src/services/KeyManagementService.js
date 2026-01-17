/**
 * Key Management Service
 * 管理用户加密密钥的生成、存储和检索
 * 支持本地存储和后端 API 两种模式
 */

import { generateKeyPair } from '../utils/encryption'

const KEYS_STORAGE_PREFIX = 'dchat_keys_'
const PUBLIC_KEYS_CACHE_PREFIX = 'dchat_pk_cache_'
const CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5 分钟缓存过期

// API 配置
const API_URL = import.meta.env.VITE_API_URL || 'https://backend-op1c06n9l-everest-ans-projects.vercel.app'

export const KeyManagementService = {
  /**
   * Initialize keys for the current user if they don't exist
   * @param {string} account - User wallet address
   * @param {string} userId - Optional user ID
   * @returns {Promise<{publicKey: string, privateKey: string}>}
   */
  async initializeKeys(account, userId = null) {
    if (!account) throw new Error('Account is required')
    
    const storageKey = `${KEYS_STORAGE_PREFIX}${account.toLowerCase()}`
    const storedKeys = localStorage.getItem(storageKey)
    
    if (storedKeys) {
      const keys = JSON.parse(storedKeys)
      // 确保公钥已注册到后端
      await this.registerPublicKeyToBackend(account, keys.publicKey, userId)
      return keys
    }
    
    // Generate new key pair
    const keyPair = await generateKeyPair()
    
    // Store keys locally
    localStorage.setItem(storageKey, JSON.stringify(keyPair))
    
    // Register public key to backend
    await this.registerPublicKeyToBackend(account, keyPair.publicKey, userId)
    
    console.log(`✅ Keys initialized for ${account}`)
    return keyPair
  },

  /**
   * Get user's keys from local storage
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
   * Register public key to backend API
   * @param {string} walletAddress - User wallet address
   * @param {string} publicKey - Base64 encoded public key
   * @param {string} userId - Optional user ID
   */
  async registerPublicKeyToBackend(walletAddress, publicKey, userId = null) {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_URL}/api/public-keys/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          walletAddress,
          publicKey,
          userId,
          keyFormat: 'BASE64'
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log(`✅ Public key registered to backend for ${walletAddress}`)
        // 同时保存到本地注册表作为备份
        this.saveToLocalRegistry(walletAddress, publicKey)
      } else {
        console.warn('⚠️ Backend registration failed, using local registry:', data.error)
        this.saveToLocalRegistry(walletAddress, publicKey)
      }
    } catch (error) {
      console.warn('⚠️ Backend unavailable, using local registry:', error.message)
      this.saveToLocalRegistry(walletAddress, publicKey)
    }
  },

  /**
   * Save public key to local registry (fallback)
   */
  saveToLocalRegistry(walletAddress, publicKey) {
    const registryKey = `dchat_public_registry_${walletAddress.toLowerCase()}`
    localStorage.setItem(registryKey, publicKey)
  },

  /**
   * Fetch public key from backend API
   * @param {string} address - Wallet address
   * @returns {Promise<{publicKey: string, keyFormat: string}|null>}
   */
  async fetchPublicKeyFromBackend(address) {
    try {
      const response = await fetch(`${API_URL}/api/public-keys/address/${address.toLowerCase()}`)
      const data = await response.json()
      
      if (data.success && data.data?.publicKey) {
        return {
          publicKey: data.data.publicKey,
          keyFormat: data.data.keyFormat || 'BASE64',
          verified: data.data.verified
        }
      }
      return null
    } catch (error) {
      console.warn('⚠️ Failed to fetch public key from backend:', error.message)
      return null
    }
  },

  /**
   * Batch fetch public keys from backend
   * @param {string[]} addresses - Array of wallet addresses
   * @returns {Promise<Object>} Map of address to public key
   */
  async fetchPublicKeysBatch(addresses) {
    try {
      const response = await fetch(`${API_URL}/api/public-keys/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses })
      })
      const data = await response.json()
      
      if (data.success) {
        // 缓存所有获取到的公钥
        Object.entries(data.data || {}).forEach(([addr, keyData]) => {
          this.cachePublicKey(addr, keyData.publicKey)
        })
        return data.data || {}
      }
      return {}
    } catch (error) {
      console.warn('⚠️ Failed to batch fetch public keys:', error.message)
      return {}
    }
  },

  /**
   * Get public key for a recipient (with caching)
   * @param {string} address - Recipient wallet address
   * @returns {Promise<string|null>} Base64 encoded public key
   */
  async getPublicKey(address) {
    if (!address) return null
    
    const normalizedAddress = address.toLowerCase()
    
    // 1. 如果是自己，直接返回本地密钥
    const currentUser = localStorage.getItem('user')
    if (currentUser) {
      try {
        const userData = JSON.parse(currentUser)
        if (userData.walletAddress?.toLowerCase() === normalizedAddress) {
          const myKeys = this.getKeys(address)
          if (myKeys) return myKeys.publicKey
        }
      } catch (e) {
        // ignore parse error
      }
    }
    
    // 2. 检查缓存（带过期时间）
    const cached = this.getCachedPublicKey(normalizedAddress)
    if (cached) return cached
    
    // 3. 从后端获取
    const backendResult = await this.fetchPublicKeyFromBackend(normalizedAddress)
    if (backendResult?.publicKey) {
      this.cachePublicKey(normalizedAddress, backendResult.publicKey)
      return backendResult.publicKey
    }
    
    // 4. 从本地注册表获取（fallback）
    const registryKey = `dchat_public_registry_${normalizedAddress}`
    const localKey = localStorage.getItem(registryKey)
    if (localKey) {
      this.cachePublicKey(normalizedAddress, localKey)
      return localKey
    }
    
    return null
  },

  /**
   * Cache public key with expiry
   */
  cachePublicKey(address, publicKey) {
    const cacheKey = `${PUBLIC_KEYS_CACHE_PREFIX}${address.toLowerCase()}`
    const cacheData = {
      publicKey,
      cachedAt: Date.now()
    }
    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
  },

  /**
   * Get cached public key (returns null if expired)
   */
  getCachedPublicKey(address) {
    const cacheKey = `${PUBLIC_KEYS_CACHE_PREFIX}${address.toLowerCase()}`
    const cached = localStorage.getItem(cacheKey)
    
    if (!cached) return null
    
    try {
      const cacheData = JSON.parse(cached)
      
      // 检查是否过期
      if (Date.now() - cacheData.cachedAt > CACHE_EXPIRY_MS) {
        localStorage.removeItem(cacheKey)
        return null
      }
      
      return cacheData.publicKey
    } catch {
      // 兼容旧格式（直接存储公钥字符串）
      return cached
    }
  },

  /**
   * Clear public key cache for an address
   */
  clearCache(address) {
    if (address) {
      const cacheKey = `${PUBLIC_KEYS_CACHE_PREFIX}${address.toLowerCase()}`
      localStorage.removeItem(cacheKey)
    }
  },

  /**
   * Clear all public key caches
   */
  clearAllCaches() {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(PUBLIC_KEYS_CACHE_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  },

  /**
   * Rotate keys (generate new key pair and register)
   * @param {string} account - User wallet address
   * @returns {Promise<{publicKey: string, privateKey: string}>}
   */
  async rotateKeys(account) {
    if (!account) throw new Error('Account is required')
    
    // Generate new key pair
    const newKeyPair = await generateKeyPair()
    
    // Store new keys locally
    const storageKey = `${KEYS_STORAGE_PREFIX}${account.toLowerCase()}`
    localStorage.setItem(storageKey, JSON.stringify(newKeyPair))
    
    // Register new public key to backend (with rotation)
    try {
      const token = localStorage.getItem('token')
      
      await fetch(`${API_URL}/api/public-keys/rotate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          walletAddress: account,
          newPublicKey: newKeyPair.publicKey,
          keyFormat: 'BASE64'
        })
      })
    } catch (error) {
      console.warn('⚠️ Key rotation backend update failed:', error.message)
    }
    
    // Update local registry
    this.saveToLocalRegistry(account, newKeyPair.publicKey)
    
    // Clear cache
    this.clearCache(account)
    
    console.log(`✅ Keys rotated for ${account}`)
    return newKeyPair
  },

  /**
   * Check if user has keys initialized
   * @param {string} account - User wallet address
   * @returns {boolean}
   */
  hasKeys(account) {
    if (!account) return false
    const storageKey = `${KEYS_STORAGE_PREFIX}${account.toLowerCase()}`
    return !!localStorage.getItem(storageKey)
  },

  /**
   * Legacy method for backward compatibility
   * @deprecated Use registerPublicKeyToBackend instead
   */
  async publishPublicKey(account, publicKey) {
    await this.registerPublicKeyToBackend(account, publicKey)
  }
}

export default KeyManagementService
