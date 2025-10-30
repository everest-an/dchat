import * as encryption from '../utils/encryption'
import { UserIdentityService } from './UserIdentityService'

/**
 * TODO: Translate '加密服务'
 * TODO: Translate '提供端到端加密功能'
 */
class EncryptionService {
  /**
   * TODO: Translate '生成密钥对'
   */
  async generateKeyPair() {
    return await encryption.generateKeyPair()
  }

  /**
   * TODO: Translate '加密消息' (TODO: Translate '混合加密': RSA + AES)
   * @param {string} message - TODO: Translate '要加密的消息'
   * @param {string} recipientPublicKey - TODO: Translate '接收者公钥'
   * @returns {Promise<{encryptedMessage: string, encryptedKey: string, iv: string}>}
   */
  async encryptMessage(message, recipientPublicKey) {
    try {
      // 1. TODO: Translate '生成随机' AES TODO: Translate '密钥'
      const aesKey = await encryption.generateSymmetricKey()
      
      // 2. TODO: Translate '用' AES TODO: Translate '加密消息'
      const { encrypted, iv } = await encryption.encryptWithSymmetricKey(message, aesKey)
      
      // 3. TODO: Translate '用接收者公钥加密' AES TODO: Translate '密钥'
      const encryptedKey = await encryption.encryptMessage(aesKey, recipientPublicKey)
      
      return {
        encryptedMessage: encrypted,
        encryptedKey,
        iv
      }
    } catch (error) {
      console.error('Error encrypting message:', error)
      throw error
    }
  }

  /**
   * TODO: Translate '解密消息'
   * @param {object} encryptedData - TODO: Translate '加密数据'
   * @param {string} privateKey - TODO: Translate '私钥'
   * @returns {Promise<string>} TODO: Translate '解密后的消息'
   */
  async decryptMessage(encryptedData, privateKey) {
    try {
      // 1. TODO: Translate '用私钥解密' AES TODO: Translate '密钥'
      const aesKey = await encryption.decryptMessage(
        encryptedData.encryptedKey,
        privateKey
      )
      
      // 2. TODO: Translate '用' AES TODO: Translate '密钥解密消息'
      const message = await encryption.decryptWithSymmetricKey(
        encryptedData.encryptedMessage,
        aesKey,
        encryptedData.iv
      )
      
      return message
    } catch (error) {
      console.error('Error decrypting message:', error)
      throw error
    }
  }

  /**
   * TODO: Translate '存储密钥对到本地'
   * @param {string} address - TODO: Translate '钱包地址'
   * @param {object} keyPair - TODO: Translate '密钥对'
   */
  storeKeyPair(address, keyPair) {
    try {
      const data = JSON.stringify(keyPair)
      // TODO: Translate '简单加密'(TODO: Translate '实际应用中应该用密码加密')
      const encrypted = btoa(data)
      localStorage.setItem(`dchat_keys_${address}`, encrypted)
    } catch (error) {
      console.error('Error storing key pair:', error)
      throw error
    }
  }

  /**
   * TODO: Translate '从本地获取密钥对'
   * @param {string} address - TODO: Translate '钱包地址'
   * @returns {object|null} TODO: Translate '密钥对'
   */
  getKeyPair(address) {
    try {
      const encrypted = localStorage.getItem(`dchat_keys_${address}`)
      if (!encrypted) return null
      
      const data = atob(encrypted)
      return JSON.parse(data)
    } catch (error) {
      console.error('Error getting key pair:', error)
      return null
    }
  }

  /**
   * TODO: Translate '删除密钥对'
   * @param {string} address - TODO: Translate '钱包地址'
   */
  deleteKeyPair(address) {
    localStorage.removeItem(`dchat_keys_${address}`)
  }

  /**
   * TODO: Translate '检查是否有密钥对'
   * @param {string} address - TODO: Translate '钱包地址'
   * @returns {boolean}
   */
  hasKeyPair(address) {
    return !!this.getKeyPair(address)
  }

  /**
   * TODO: Translate '存储公钥到区块链'
   * @param {string} publicKey - TODO: Translate '公钥'
   */
  async storePublicKeyOnChain(publicKey) {
    try {
      const service = new UserIdentityService()
      await service.setPublicKey(publicKey)
    } catch (error) {
      console.error('Error storing public key on chain:', error)
      throw error
    }
  }

  /**
   * TODO: Translate '从区块链获取公钥'
   * @param {string} address - TODO: Translate '钱包地址'
   * @returns {Promise<string|null>} TODO: Translate '公钥'
   */
  async getPublicKeyFromChain(address) {
    try {
      const service = new UserIdentityService()
      return await service.getPublicKey(address)
    } catch (error) {
      console.error('Error getting public key from chain:', error)
      return null
    }
  }

  /**
   * TODO: Translate '导出密钥对'
   * @param {string} address - TODO: Translate '钱包地址'
   * @returns {string} JSON TODO: Translate '字符串'
   */
  exportKeyPair(address) {
    const keyPair = this.getKeyPair(address)
    if (!keyPair) throw new Error('No key pair found')
    return JSON.stringify(keyPair, null, 2)
  }

  /**
   * TODO: Translate '导入密钥对'
   * @param {string} address - TODO: Translate '钱包地址'
   * @param {string} jsonString - JSON TODO: Translate '字符串'
   */
  importKeyPair(address, jsonString) {
    try {
      const keyPair = JSON.parse(jsonString)
      if (!keyPair.publicKey || !keyPair.privateKey) {
        throw new Error('Invalid key pair format')
      }
      this.storeKeyPair(address, keyPair)
    } catch (error) {
      console.error('Error importing key pair:', error)
      throw error
    }
  }
}

export const encryptionService = new EncryptionService()
