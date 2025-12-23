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
      // TODO: Translate '检查是否已有密钥对'
      const existingKeys = this.getUserKeys(userAddress)
      if (existingKeys) {
        return existingKeys
      }

      // TODO: Translate '生成新的密钥对'
      console.log('Generating new key pair for user:', userAddress)
      const keyPair = await generateKeyPair()
      
      // TODO: Translate '保存密钥对'
      this.saveUserKeys(userAddress, keyPair)
      
      // TODO: Translate '保存公钥到用户资料'
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
      // TODO: Translate '从本地缓存获取'
      const cachedKey = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}pubkey_${recipientAddress}`)
      if (cachedKey) {
        return cachedKey
      }

      // TODO: TODO: Translate '从智能合约获取'
      // const publicKey = await userIdentityContract.getPublicKey(recipientAddress)
      
      // TODO: Translate '暂时返回' null,TODO: Translate '需要对方先发送公钥'
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
      // TODO: Translate '获取接收者的公钥'
      let recipientPublicKey = await this.getRecipientPublicKey(recipientAddress)
      
      // TODO: Translate '如果没有公钥',TODO: Translate '返回未加密的消息'
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

      // TODO: Translate '加密消息'
      const encryptedMessage = await encryptMessage(message, recipientPublicKey)
      
      // TODO: Translate '获取发送者的公钥'(TODO: Translate '用于接收者验证')
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
      // TODO: Translate '加密失败',TODO: Translate '返回未加密的消息'
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
      // TODO: Translate '如果消息未加密',TODO: Translate '直接返回'
      if (!metadata.encrypted) {
        return encryptedMessage
      }

      // TODO: Translate '获取用户的私钥'
      const keys = this.getUserKeys(userAddress)
      if (!keys || !keys.privateKey) {
        throw new Error('Private key not found')
      }

      // TODO: Translate '缓存发送者的公钥'
      if (metadata.senderPublicKey) {
        // TODO: Translate '从消息中提取发送者地址'(TODO: Translate '需要从消息上下文获取')
        // this.cacheRecipientPublicKey(senderAddress, metadata.senderPublicKey)
      }

      // TODO: Translate '解密消息'
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

      // TODO: Translate '使用密码派生密钥'
      const derivedKey = await this.deriveKeyFromPassword(password)
      
      // TODO: Translate '加密密钥对'
      const keysJson = JSON.stringify(keys)
      const { encrypted, iv } = await encryptWithSymmetricKey(keysJson, derivedKey)
      
      // TODO: Translate '返回备份数据'
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
      
      // TODO: Translate '验证备份格式'
      if (!backup.version || !backup.encrypted || !backup.iv) {
        throw new Error('Invalid backup format')
      }

      // TODO: Translate '使用密码派生密钥'
      const derivedKey = await this.deriveKeyFromPassword(password)
      
      // TODO: Translate '解密密钥对'
      const keysJson = await decryptWithSymmetricKey(backup.encrypted, derivedKey, backup.iv)
      const keys = JSON.parse(keysJson)
      
      // TODO: Translate '保存密钥'
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
      
      // TODO: Translate '固定的盐值'(TODO: Translate '实际应用中应该随机生成并保存')
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
      // TODO: Translate '保存到本地存储'
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

// TODO: Translate '导出单例'
export const advancedEncryptionService = new AdvancedEncryptionService()
