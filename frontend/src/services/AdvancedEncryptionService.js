/**
 * TODO: Translate '高级加密服务'
 * Pro TODO: Translate '和' Enterprise TODO: Translate '用户专属功能'
 */

import { 
  generateKeyPair, 
  encryptMessage, 
  decryptMessage,
  generateSymmetricKey,
  encryptWithSymmetricKey,
  decryptWithSymmetricKey,
  hashData
} from '../utils/encryption'

class AdvancedEncryptionService {
  constructor() {
    this.STORAGE_KEY_PREFIX = 'dchat_encryption_'
  }

  /**
   * TODO: Translate '初始化用户加密'
   * TODO: Translate '为用户生成密钥对'(TODO: Translate '如果还没有')
   */
  async initializeUserEncryption(userAddress) {
    try {
      const existingKeys = this.getUserKeys(userAddress)
      if (existingKeys) {
        return existingKeys
      }
      console.log('Generating new key pair for user:', userAddress)
      const keyPair = await generateKeyPair()
      this.saveUserKeys(userAddress, keyPair)
      this.savePublicKeyToProfile(userAddress, keyPair.publicKey)
      
      return keyPair
    } catch (error) {
      console.error('Error initializing user encryption:', error)
      throw error
    }
  }

  /**
   * TODO: Translate '获取用户的密钥对'
   */
  getUserKeys(userAddress) {
    try {
      const keysJson = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}keys_${userAddress}`)
      return keysJson ? JSON.parse(keysJson) : null
    } catch (error) {
      console.error('Error getting user keys:', error)
      return null
    }
  }

  /**
   * TODO: Translate '保存用户的密钥对'
   */
  saveUserKeys(userAddress, keyPair) {
    try {
      localStorage.setItem(
        `${this.STORAGE_KEY_PREFIX}keys_${userAddress}`,
        JSON.stringify(keyPair)
      )
    } catch (error) {
      console.error('Error saving user keys:', error)
      throw error
    }
  }

  /**
   * TODO: Translate '获取用户的公钥'
   */
  getUserPublicKey(userAddress) {
    const keys = this.getUserKeys(userAddress)
    return keys ? keys.publicKey : null
  }

  /**
   * TODO: Translate '获取对方的公钥'
   * TODO: Translate '首先从本地缓存获取',TODO: Translate '如果没有则从智能合约获取'
   */
  async getRecipientPublicKey(recipientAddress) {
    try {
      const cachedKey = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}pubkey_${recipientAddress}`)
      if (cachedKey) {
        return cachedKey
      }

      // TODO: TODO: Translate '从智能合约获取'
      // const publicKey = await userIdentityContract.getPublicKey(recipientAddress)
      return null
    } catch (error) {
      console.error('Error getting recipient public key:', error)
      return null
    }
  }

  /**
   * TODO: Translate '缓存对方的公钥'
   */
  cacheRecipientPublicKey(recipientAddress, publicKey) {
    try {
      localStorage.setItem(`${this.STORAGE_KEY_PREFIX}pubkey_${recipientAddress}`, publicKey)
    } catch (error) {
      console.error('Error caching recipient public key:', error)
    }
  }

  /**
   * TODO: Translate '加密消息'
   * @param {string} message - TODO: Translate '原始消息'
   * @param {string} recipientAddress - TODO: Translate '接收者地址'
   * @param {string} senderAddress - TODO: Translate '发送者地址'
   * @returns {Promise<{encrypted: string, metadata: object}>}
   */
  async encryptMessageForRecipient(message, recipientAddress, senderAddress) {
    try {
      let recipientPublicKey = await this.getRecipientPublicKey(recipientAddress)
      if (!recipientPublicKey) {
        console.warn('No public key found for recipient, sending unencrypted')
        return {
          encrypted: false,
          message: message,
          metadata: {
            encrypted: false,
            reason: 'no_public_key'
          }
        }
      }
      const encryptedMessage = await encryptMessage(message, recipientPublicKey)
      const senderPublicKey = this.getUserPublicKey(senderAddress)
      
      return {
        encrypted: true,
        message: encryptedMessage,
        metadata: {
          encrypted: true,
          algorithm: 'RSA-OAEP-2048',
          senderPublicKey: senderPublicKey,
          timestamp: Date.now()
        }
      }
    } catch (error) {
      console.error('Error encrypting message:', error)
      return {
        encrypted: false,
        message: message,
        metadata: {
          encrypted: false,
          reason: 'encryption_failed',
          error: error.message
        }
      }
    }
  }

  /**
   * TODO: Translate '解密消息'
   * @param {string} encryptedMessage - TODO: Translate '加密的消息'
   * @param {string} userAddress - TODO: Translate '当前用户地址'
   * @param {object} metadata - TODO: Translate '消息元数据'
   * @returns {Promise<string>}
   */
  async decryptMessageForUser(encryptedMessage, userAddress, metadata = {}) {
    try {
      if (!metadata.encrypted) {
        return encryptedMessage
      }
      const keys = this.getUserKeys(userAddress)
      if (!keys || !keys.privateKey) {
        throw new Error('Private key not found')
      }
      if (metadata.senderPublicKey) {
        // this.cacheRecipientPublicKey(senderAddress, metadata.senderPublicKey)
      }
      const decryptedMessage = await decryptMessage(encryptedMessage, keys.privateKey)
      
      return decryptedMessage
    } catch (error) {
      console.error('Error decrypting message:', error)
      return '[Encrypted Message - Unable to decrypt]'
    }
  }

  /**
   * TODO: Translate '导出密钥'(TODO: Translate '用于备份')
   * @param {string} userAddress - TODO: Translate '用户地址'
   * @param {string} password - TODO: Translate '用于加密密钥的密码'
   * @returns {Promise<string>} TODO: Translate '加密后的密钥备份'
   */
  async exportKeys(userAddress, password) {
    try {
      const keys = this.getUserKeys(userAddress)
      if (!keys) {
        throw new Error('No keys found to export')
      }
      const derivedKey = await this.deriveKeyFromPassword(password)
      const keysJson = JSON.stringify(keys)
      const { encrypted, iv } = await encryptWithSymmetricKey(keysJson, derivedKey)
      return JSON.stringify({
        version: 1,
        userAddress,
        encrypted,
        iv,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Error exporting keys:', error)
      throw error
    }
  }

  /**
   * TODO: Translate '导入密钥'(TODO: Translate '从备份恢复')
   * @param {string} backupData - TODO: Translate '备份数据'
   * @param {string} password - TODO: Translate '解密密码'
   * @returns {Promise<boolean>}
   */
  async importKeys(backupData, password) {
    try {
      const backup = JSON.parse(backupData)
      if (!backup.version || !backup.encrypted || !backup.iv) {
        throw new Error('Invalid backup format')
      }
      const derivedKey = await this.deriveKeyFromPassword(password)
      const keysJson = await decryptWithSymmetricKey(backup.encrypted, derivedKey, backup.iv)
      const keys = JSON.parse(keysJson)
      this.saveUserKeys(backup.userAddress, keys)
      
      return true
    } catch (error) {
      console.error('Error importing keys:', error)
      throw error
    }
  }

  /**
   * TODO: Translate '从密码派生密钥'
   */
  async deriveKeyFromPassword(password) {
    try {
      const encoder = new TextEncoder()
      const passwordData = encoder.encode(password)
      
      // use PBKDF2 TODO: Translate '派生密钥'
      const baseKey = await window.crypto.subtle.importKey(
        'raw',
        passwordData,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      )
      const salt = encoder.encode('dchat-encryption-salt-v1')
      
      const derivedKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      )
      
      const exported = await window.crypto.subtle.exportKey('raw', derivedKey)
      return this.arrayBufferToBase64(exported)
    } catch (error) {
      console.error('Error deriving key from password:', error)
      throw error
    }
  }

  /**
   * TODO: Translate '删除用户的密钥'
   * ⚠️ TODO: Translate '危险操作',TODO: Translate '会永久删除密钥'
   */
  deleteUserKeys(userAddress) {
    try {
      localStorage.removeItem(`${this.STORAGE_KEY_PREFIX}keys_${userAddress}`)
      return true
    } catch (error) {
      console.error('Error deleting user keys:', error)
      return false
    }
  }

  /**
   * TODO: Translate '验证消息完整性'
   */
  async verifyMessageIntegrity(message, hash) {
    try {
      const computedHash = await hashData(message)
      return computedHash === hash
    } catch (error) {
      console.error('Error verifying message integrity:', error)
      return false
    }
  }

  /**
   * TODO: Translate '保存公钥到用户资料'
   */
  savePublicKeyToProfile(userAddress, publicKey) {
    try {
      const profileKey = `dchat_profile_${userAddress}`
      const profileJson = localStorage.getItem(profileKey)
      const profile = profileJson ? JSON.parse(profileJson) : {}
      
      profile.publicKey = publicKey
      profile.encryptionEnabled = true
      
      localStorage.setItem(profileKey, JSON.stringify(profile))
    } catch (error) {
      console.error('Error saving public key to profile:', error)
    }
  }

  /**
   * TODO: Translate '检查用户是否启用了加密'
   */
  isEncryptionEnabled(userAddress) {
    const keys = this.getUserKeys(userAddress)
    return keys !== null
  }

  /**
   * TODO: Translate '辅助函数': ArrayBuffer TODO: Translate '转' Base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }
}
export const advancedEncryptionService = new AdvancedEncryptionService()
