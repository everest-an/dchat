/**
 * Key Management Service
 * 管理用户加密密钥的生成、存储和检索
 * 支持本地存储和后端 API 两种模式
 * 增强：支持签名密钥用于消息认证
 */

import { generateKeyPair } from '../utils/encryption'
import EncryptionService from './EncryptionService'

const KEYS_STORAGE_PREFIX = 'dchat_keys_'
const SIGNING_KEYS_STORAGE_PREFIX = 'dchat_signing_keys_'
const PUBLIC_KEYS_CACHE_PREFIX = 'dchat_pk_cache_'
const SIGNING_KEYS_CACHE_PREFIX = 'dchat_sk_cache_'
const CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5 分钟缓存过期

// API 配置
const API_URL = import.meta.env.VITE_API_URL || 'https://backend-op1c06n9l-everest-ans-projects.vercel.app'

export const KeyManagementService = {
  /**
   * Initialize keys for the current user if they don't exist
   * @param {string} account - User wallet address
   * @param {string} userId - Optional user ID
   * @returns {Promise<{publicKey: string, privateKey: string, signingPublicKey?: string, signingPrivateKey?: CryptoKey}>}
   */
  async initializeKeys(account, userId = null) {
    if (!account) throw new Error('Account is required')
    
    const storageKey = `${KEYS_STORAGE_PREFIX}${account.toLowerCase()}`
    const storedKeys = localStorage.getItem(storageKey)
    
    if (storedKeys) {
      const keys = JSON.parse(storedKeys)
      
      // 检查是否有签名密钥
      const signingKeys = await this.getSigningKeys(account)
      if (!signingKeys) {
        // 生成签名密钥
        const newSigningKeys = await this.initializeSigningKeys(account)
        keys.signingPublicKey = newSigningKeys.signingPublicKey
        keys.signingPrivateKey = newSigningKeys.signingPrivateKey
      } else {
        keys.signingPublicKey = signingKeys.signingPublicKey
        keys.signingPrivateKey = signingKeys.signingPrivateKey
      }
      
      // 确保公钥已注册到后端
      await this.registerPublicKeyToBackend(account, keys.publicKey, userId, keys.signingPublicKey)
      return keys
    }
    
    // Generate new key pair
    const keyPair = await generateKeyPair()
    
    // Store keys locally
    localStorage.setItem(storageKey, JSON.stringify(keyPair))
    
    // Generate signing keys
    const signingKeys = await this.initializeSigningKeys(account)
    
    // Register public key to backend
    await this.registerPublicKeyToBackend(account, keyPair.publicKey, userId, signingKeys.signingPublicKey)
    
    console.log(`✅ Keys initialized for ${account}`)
    return {
      ...keyPair,
      signingPublicKey: signingKeys.signingPublicKey,
      signingPrivateKey: signingKeys.signingPrivateKey
    }
  },

  /**
   * Initialize signing keys for message authentication
   * @param {string} account - User wallet address
   * @returns {Promise<{signingPublicKey: string, signingPrivateKey: CryptoKey}>}
   */
  async initializeSigningKeys(account) {
    if (!account) throw new Error('Account is required')
    
    const storageKey = `${SIGNING_KEYS_STORAGE_PREFIX}${account.toLowerCase()}`
    const storedKeys = localStorage.getItem(storageKey)
    
    if (storedKeys) {
      try {
        const keys = JSON.parse(storedKeys)
        // 重新导入私钥
        const privateKeyBuffer = this.base64ToArrayBuffer(keys.privateKeyBase64)
        const signingPrivateKey = await crypto.subtle.importKey(
          "pkcs8",
          privateKeyBuffer,
          {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
          },
          true,
          ["sign"]
        )
        return {
          signingPublicKey: keys.publicKey,
          signingPrivateKey
        }
      } catch (e) {
        console.warn('Failed to load signing keys, regenerating:', e)
      }
    }
    
    // Generate new signing key pair
    const signingKeyPair = await EncryptionService.generateSigningKeyPair()
    
    // Export private key for storage
    const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", signingKeyPair.privateKey)
    const privateKeyBase64 = this.arrayBufferToBase64(privateKeyBuffer)
    
    // Store signing keys locally
    localStorage.setItem(storageKey, JSON.stringify({
      publicKey: signingKeyPair.publicKey,
      privateKeyBase64
    }))
    
    console.log(`✅ Signing keys initialized for ${account}`)
    return {
      signingPublicKey: signingKeyPair.publicKey,
      signingPrivateKey: signingKeyPair.privateKey
    }
  },

  /**
   * Get signing keys from local storage
   * @param {string} account - User wallet address
   * @returns {Promise<{signingPublicKey: string, signingPrivateKey: CryptoKey}|null>}
   */
  async getSigningKeys(account) {
    if (!account) return null
    
    const storageKey = `${SIGNING_KEYS_STORAGE_PREFIX}${account.toLowerCase()}`
    const storedKeys = localStorage.getItem(storageKey)
    
    if (!storedKeys) return null
    
    try {
      const keys = JSON.parse(storedKeys)
      const privateKeyBuffer = this.base64ToArrayBuffer(keys.privateKeyBase64)
      const signingPrivateKey = await crypto.subtle.importKey(
        "pkcs8",
        privateKeyBuffer,
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
        },
        true,
        ["sign"]
      )
      return {
        signingPublicKey: keys.publicKey,
        signingPrivateKey
      }
    } catch (e) {
      console.error('Failed to load signing keys:', e)
      return null
    }
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
   * @param {string} signingPublicKey - Optional signing public key
   */
  async registerPublicKeyToBackend(walletAddress, publicKey, userId = null, signingPublicKey = null) {
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
          signingPublicKey,
          userId,
          keyFormat: 'BASE64'
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log(`✅ Public key registered to backend for ${walletAddress}`)
        // 同时保存到本地注册表作为备份
        this.saveToLocalRegistry(walletAddress, publicKey, signingPublicKey)
      } else {
        console.warn('⚠️ Backend registration failed, using local registry:', data.error)
        this.saveToLocalRegistry(walletAddress, publicKey, signingPublicKey)
      }
    } catch (error) {
      console.warn('⚠️ Backend unavailable, using local registry:', error.message)
      this.saveToLocalRegistry(walletAddress, publicKey, signingPublicKey)
    }
  },

  /**
   * Save public key to local registry (fallback)
   */
  saveToLocalRegistry(walletAddress, publicKey, signingPublicKey = null) {
    const registryKey = `dchat_public_registry_${walletAddress.toLowerCase()}`
    localStorage.setItem(registryKey, publicKey)
    
    if (signingPublicKey) {
      const signingRegistryKey = `dchat_signing_registry_${walletAddress.toLowerCase()}`
      localStorage.setItem(signingRegistryKey, signingPublicKey)
    }
  },

  /**
   * Fetch public key from backend API
   * @param {string} address - Wallet address
   * @returns {Promise<{publicKey: string, signingPublicKey?: string, keyFormat: string}|null>}
   */
  async fetchPublicKeyFromBackend(address) {
    try {
      const response = await fetch(`${API_URL}/api/public-keys/address/${address.toLowerCase()}`)
      const data = await response.json()
      
      if (data.success && data.data?.publicKey) {
        return {
          publicKey: data.data.publicKey,
          signingPublicKey: data.data.signingPublicKey,
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
          this.cachePublicKey(addr, keyData.publicKey, keyData.signingPublicKey)
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
      this.cachePublicKey(normalizedAddress, backendResult.publicKey, backendResult.signingPublicKey)
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
   * Get signing public key for a user
   * @param {string} address - User wallet address
   * @returns {Promise<string|null>} PEM formatted signing public key
   */
  async getSigningPublicKey(address) {
    if (!address) return null
    
    const normalizedAddress = address.toLowerCase()
    
    // 1. 检查缓存
    const cacheKey = `${SIGNING_KEYS_CACHE_PREFIX}${normalizedAddress}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const cacheData = JSON.parse(cached)
        if (Date.now() - cacheData.cachedAt < CACHE_EXPIRY_MS) {
          return cacheData.signingPublicKey
        }
      } catch (e) {
        // ignore
      }
    }
    
    // 2. 从后端获取
    const backendResult = await this.fetchPublicKeyFromBackend(normalizedAddress)
    if (backendResult?.signingPublicKey) {
      localStorage.setItem(cacheKey, JSON.stringify({
        signingPublicKey: backendResult.signingPublicKey,
        cachedAt: Date.now()
      }))
      return backendResult.signingPublicKey
    }
    
    // 3. 从本地注册表获取
    const registryKey = `dchat_signing_registry_${normalizedAddress}`
    return localStorage.getItem(registryKey)
  },

  /**
   * Cache public key with expiry
   */
  cachePublicKey(address, publicKey, signingPublicKey = null) {
    const cacheKey = `${PUBLIC_KEYS_CACHE_PREFIX}${address.toLowerCase()}`
    const cacheData = {
      publicKey,
      cachedAt: Date.now()
    }
    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    
    if (signingPublicKey) {
      const signingCacheKey = `${SIGNING_KEYS_CACHE_PREFIX}${address.toLowerCase()}`
      localStorage.setItem(signingCacheKey, JSON.stringify({
        signingPublicKey,
        cachedAt: Date.now()
      }))
    }
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
      const signingCacheKey = `${SIGNING_KEYS_CACHE_PREFIX}${address.toLowerCase()}`
      localStorage.removeItem(cacheKey)
      localStorage.removeItem(signingCacheKey)
    }
  },

  /**
   * Clear all public key caches
   */
  clearAllCaches() {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(PUBLIC_KEYS_CACHE_PREFIX) || key?.startsWith(SIGNING_KEYS_CACHE_PREFIX)) {
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
    
    // Generate new signing keys
    const newSigningStorageKey = `${SIGNING_KEYS_STORAGE_PREFIX}${account.toLowerCase()}`
    localStorage.removeItem(newSigningStorageKey) // Clear old signing keys
    const signingKeys = await this.initializeSigningKeys(account)
    
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
          newSigningPublicKey: signingKeys.signingPublicKey,
          keyFormat: 'BASE64'
        })
      })
    } catch (error) {
      console.warn('⚠️ Key rotation backend update failed:', error.message)
    }
    
    // Update local registry
    this.saveToLocalRegistry(account, newKeyPair.publicKey, signingKeys.signingPublicKey)
    
    // Clear cache
    this.clearCache(account)
    
    console.log(`✅ Keys rotated for ${account}`)
    return {
      ...newKeyPair,
      signingPublicKey: signingKeys.signingPublicKey,
      signingPrivateKey: signingKeys.signingPrivateKey
    }
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
  },

  // Utility functions
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  },

  base64ToArrayBuffer(base64) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }
}

export default KeyManagementService
