/**
 * 加密工具类
 * 提供端到端加密功能
 */

/**
 * 生成密钥对
 * @returns {Promise<{publicKey: string, privateKey: string}>}
 */
export async function generateKeyPair() {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    )

    const publicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey)
    const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

    return {
      publicKey: arrayBufferToBase64(publicKey),
      privateKey: arrayBufferToBase64(privateKey)
    }
  } catch (error) {
    console.error('Error generating key pair:', error)
    throw error
  }
}

/**
 * 加密消息
 * @param {string} message - 要加密的消息
 * @param {string} publicKeyBase64 - Base64 编码的公钥
 * @returns {Promise<string>} Base64 编码的加密消息
 */
export async function encryptMessage(message, publicKeyBase64) {
  try {
    const publicKey = await importPublicKey(publicKeyBase64)
    const encoder = new TextEncoder()
    const data = encoder.encode(message)

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP'
      },
      publicKey,
      data
    )

    return arrayBufferToBase64(encrypted)
  } catch (error) {
    console.error('Error encrypting message:', error)
    throw error
  }
}

/**
 * 解密消息
 * @param {string} encryptedMessageBase64 - Base64 编码的加密消息
 * @param {string} privateKeyBase64 - Base64 编码的私钥
 * @returns {Promise<string>} 解密后的消息
 */
export async function decryptMessage(encryptedMessageBase64, privateKeyBase64) {
  try {
    const privateKey = await importPrivateKey(privateKeyBase64)
    const encryptedData = base64ToArrayBuffer(encryptedMessageBase64)

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP'
      },
      privateKey,
      encryptedData
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    console.error('Error decrypting message:', error)
    throw error
  }
}

/**
 * 生成对称密钥 (用于加密文件等大数据)
 * @returns {Promise<string>} Base64 编码的对称密钥
 */
export async function generateSymmetricKey() {
  try {
    const key = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    )

    const exported = await window.crypto.subtle.exportKey('raw', key)
    return arrayBufferToBase64(exported)
  } catch (error) {
    console.error('Error generating symmetric key:', error)
    throw error
  }
}

/**
 * 使用对称密钥加密数据
 * @param {string} data - 要加密的数据
 * @param {string} keyBase64 - Base64 编码的对称密钥
 * @returns {Promise<{encrypted: string, iv: string}>}
 */
export async function encryptWithSymmetricKey(data, keyBase64) {
  try {
    const key = await importSymmetricKey(keyBase64)
    const encoder = new TextEncoder()
    const encodedData = encoder.encode(data)
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12))

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encodedData
    )

    return {
      encrypted: arrayBufferToBase64(encrypted),
      iv: arrayBufferToBase64(iv)
    }
  } catch (error) {
    console.error('Error encrypting with symmetric key:', error)
    throw error
  }
}

/**
 * 使用对称密钥解密数据
 * @param {string} encryptedBase64 - Base64 编码的加密数据
 * @param {string} keyBase64 - Base64 编码的对称密钥
 * @param {string} ivBase64 - Base64 编码的初始化向量
 * @returns {Promise<string>} 解密后的数据
 */
export async function decryptWithSymmetricKey(encryptedBase64, keyBase64, ivBase64) {
  try {
    const key = await importSymmetricKey(keyBase64)
    const encrypted = base64ToArrayBuffer(encryptedBase64)
    const iv = base64ToArrayBuffer(ivBase64)

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encrypted
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    console.error('Error decrypting with symmetric key:', error)
    throw error
  }
}

/**
 * 计算数据哈希 (用于 IPFS 内容验证)
 * @param {string} data - 要哈希的数据
 * @returns {Promise<string>} 十六进制哈希值
 */
export async function hashData(data) {
  try {
    const encoder = new TextEncoder()
    const encodedData = encoder.encode(data)
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encodedData)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch (error) {
    console.error('Error hashing data:', error)
    throw error
  }
}

// ===== 辅助函数 =====

/**
 * 导入公钥
 */
async function importPublicKey(publicKeyBase64) {
  const keyData = base64ToArrayBuffer(publicKeyBase64)
  return await window.crypto.subtle.importKey(
    'spki',
    keyData,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    true,
    ['encrypt']
  )
}

/**
 * 导入私钥
 */
async function importPrivateKey(privateKeyBase64) {
  const keyData = base64ToArrayBuffer(privateKeyBase64)
  return await window.crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    true,
    ['decrypt']
  )
}

/**
 * 导入对称密钥
 */
async function importSymmetricKey(keyBase64) {
  const keyData = base64ToArrayBuffer(keyBase64)
  return await window.crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM'
    },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * ArrayBuffer 转 Base64
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

/**
 * Base64 转 ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * 生成随机字符串 (用于生成会话 ID 等)
 */
export function generateRandomString(length = 32) {
  const array = new Uint8Array(length)
  window.crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}
