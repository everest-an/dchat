/**
 * 高级加密服务
 * Pro 和 Enterprise 用户专属功能
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
   * 初始化用户加密
   * 为用户生成密钥对(如果还没有)
   */
  async initializeUserEncryption(userAddress) {
    try {
      // 检查是否已有密钥对
      const existingKeys = this.getUserKeys(userAddress)
      if (existingKeys) {
        return existingKeys
      }

      // 生成新的密钥对
      console.log('Generating new key pair for user:', userAddress)
      const keyPair = await generateKeyPair()
      
      // 保存密钥对
      this.saveUserKeys(userAddress, keyPair)
      
      // 保存公钥到用户资料
      this.savePublicKeyToProfile(userAddress, keyPair.publicKey)
      
      return keyPair
    } catch (error) {
      console.error('Error initializing user encryption:', error)
      throw error
    }
  }

  /**
   * 获取用户的密钥对
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
   * 保存用户的密钥对
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
   * 获取用户的公钥
   */
  getUserPublicKey(userAddress) {
    const keys = this.getUserKeys(userAddress)
    return keys ? keys.publicKey : null
  }

  /**
   * 获取对方的公钥
   * 首先从本地缓存获取,如果没有则从智能合约获取
   */
  async getRecipientPublicKey(recipientAddress) {
    try {
      // 从本地缓存获取
      const cachedKey = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}pubkey_${recipientAddress}`)
      if (cachedKey) {
        return cachedKey
      }

      // TODO: 从智能合约获取
      // const publicKey = await userIdentityContract.getPublicKey(recipientAddress)
      
      // 暂时返回 null,需要对方先发送公钥
      return null
    } catch (error) {
      console.error('Error getting recipient public key:', error)
      return null
    }
  }

  /**
   * 缓存对方的公钥
   */
  cacheRecipientPublicKey(recipientAddress, publicKey) {
    try {
      localStorage.setItem(`${this.STORAGE_KEY_PREFIX}pubkey_${recipientAddress}`, publicKey)
    } catch (error) {
      console.error('Error caching recipient public key:', error)
    }
  }

  /**
   * 加密消息
   * @param {string} message - 原始消息
   * @param {string} recipientAddress - 接收者地址
   * @param {string} senderAddress - 发送者地址
   * @returns {Promise<{encrypted: string, metadata: object}>}
   */
  async encryptMessageForRecipient(message, recipientAddress, senderAddress) {
    try {
      // 获取接收者的公钥
      let recipientPublicKey = await this.getRecipientPublicKey(recipientAddress)
      
      // 如果没有公钥,返回未加密的消息
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

      // 加密消息
      const encryptedMessage = await encryptMessage(message, recipientPublicKey)
      
      // 获取发送者的公钥(用于接收者验证)
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
      // 加密失败,返回未加密的消息
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
   * 解密消息
   * @param {string} encryptedMessage - 加密的消息
   * @param {string} userAddress - 当前用户地址
   * @param {object} metadata - 消息元数据
   * @returns {Promise<string>}
   */
  async decryptMessageForUser(encryptedMessage, userAddress, metadata = {}) {
    try {
      // 如果消息未加密,直接返回
      if (!metadata.encrypted) {
        return encryptedMessage
      }

      // 获取用户的私钥
      const keys = this.getUserKeys(userAddress)
      if (!keys || !keys.privateKey) {
        throw new Error('Private key not found')
      }

      // 缓存发送者的公钥
      if (metadata.senderPublicKey) {
        // 从消息中提取发送者地址(需要从消息上下文获取)
        // this.cacheRecipientPublicKey(senderAddress, metadata.senderPublicKey)
      }

      // 解密消息
      const decryptedMessage = await decryptMessage(encryptedMessage, keys.privateKey)
      
      return decryptedMessage
    } catch (error) {
      console.error('Error decrypting message:', error)
      return '[Encrypted Message - Unable to decrypt]'
    }
  }

  /**
   * 导出密钥(用于备份)
   * @param {string} userAddress - 用户地址
   * @param {string} password - 用于加密密钥的密码
   * @returns {Promise<string>} 加密后的密钥备份
   */
  async exportKeys(userAddress, password) {
    try {
      const keys = this.getUserKeys(userAddress)
      if (!keys) {
        throw new Error('No keys found to export')
      }

      // 使用密码派生密钥
      const derivedKey = await this.deriveKeyFromPassword(password)
      
      // 加密密钥对
      const keysJson = JSON.stringify(keys)
      const { encrypted, iv } = await encryptWithSymmetricKey(keysJson, derivedKey)
      
      // 返回备份数据
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
   * 导入密钥(从备份恢复)
   * @param {string} backupData - 备份数据
   * @param {string} password - 解密密码
   * @returns {Promise<boolean>}
   */
  async importKeys(backupData, password) {
    try {
      const backup = JSON.parse(backupData)
      
      // 验证备份格式
      if (!backup.version || !backup.encrypted || !backup.iv) {
        throw new Error('Invalid backup format')
      }

      // 使用密码派生密钥
      const derivedKey = await this.deriveKeyFromPassword(password)
      
      // 解密密钥对
      const keysJson = await decryptWithSymmetricKey(backup.encrypted, derivedKey, backup.iv)
      const keys = JSON.parse(keysJson)
      
      // 保存密钥
      this.saveUserKeys(backup.userAddress, keys)
      
      return true
    } catch (error) {
      console.error('Error importing keys:', error)
      throw error
    }
  }

  /**
   * 从密码派生密钥
   */
  async deriveKeyFromPassword(password) {
    try {
      const encoder = new TextEncoder()
      const passwordData = encoder.encode(password)
      
      // 使用 PBKDF2 派生密钥
      const baseKey = await window.crypto.subtle.importKey(
        'raw',
        passwordData,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      )
      
      // 固定的盐值(实际应用中应该随机生成并保存)
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
   * 删除用户的密钥
   * ⚠️ 危险操作,会永久删除密钥
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
   * 验证消息完整性
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
   * 保存公钥到用户资料
   */
  savePublicKeyToProfile(userAddress, publicKey) {
    try {
      // 保存到本地存储
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
   * 检查用户是否启用了加密
   */
  isEncryptionEnabled(userAddress) {
    const keys = this.getUserKeys(userAddress)
    return keys !== null
  }

  /**
   * 辅助函数: ArrayBuffer 转 Base64
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

// 导出单例
export const advancedEncryptionService = new AdvancedEncryptionService()
