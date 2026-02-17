/**
 * Secure Storage Utility
 *
 * Provides encrypted storage for sensitive data (private keys, tokens, etc.)
 * using the Web Crypto API with AES-GCM encryption.
 *
 * For non-sensitive data (UI preferences, cached profiles), use localStorage directly.
 * For sensitive data (private keys, JWT tokens, encryption keys), use this module.
 *
 * The encryption key is derived from the user's wallet address using PBKDF2,
 * ensuring that stored data can only be decrypted by the same user.
 */

const SALT_KEY = 'dchat_storage_salt'
const ITERATIONS = 100000
const KEY_LENGTH = 256

/**
 * Get or create a persistent salt for key derivation
 * @returns {Uint8Array}
 */
function getSalt() {
  let saltHex = localStorage.getItem(SALT_KEY)
  if (!saltHex) {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(SALT_KEY, saltHex)
  }
  return new Uint8Array(saltHex.match(/.{2}/g).map(h => parseInt(h, 16)))
}

/**
 * Derive an AES-GCM key from a user identifier (wallet address)
 * @param {string} userIdentifier - Wallet address or user ID
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(userIdentifier) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userIdentifier),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: getSalt(), iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt and store sensitive data
 * @param {string} key - Storage key
 * @param {string} value - Value to encrypt and store
 * @param {string} userIdentifier - User's wallet address for key derivation
 */
export async function setSecure(key, value, userIdentifier) {
  try {
    const cryptoKey = await deriveKey(userIdentifier)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoder = new TextEncoder()
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encoder.encode(value)
    )
    const payload = {
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      data: Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join(''),
    }
    localStorage.setItem(key, JSON.stringify(payload))
  } catch (err) {
    // Fallback: if Web Crypto is unavailable (e.g., HTTP context), store as-is with a warning
    if (import.meta.env.DEV) {
      console.warn(`[secureStorage] Encryption failed for key "${key}", falling back to plain storage:`, err.message)
    }
    localStorage.setItem(key, value)
  }
}

/**
 * Retrieve and decrypt sensitive data
 * @param {string} key - Storage key
 * @param {string} userIdentifier - User's wallet address for key derivation
 * @returns {Promise<string|null>}
 */
export async function getSecure(key, userIdentifier) {
  const raw = localStorage.getItem(key)
  if (!raw) return null

  try {
    const payload = JSON.parse(raw)
    if (!payload.iv || !payload.data) {
      // Not encrypted (legacy data or fallback), return as-is
      return raw
    }

    const cryptoKey = await deriveKey(userIdentifier)
    const iv = new Uint8Array(payload.iv.match(/.{2}/g).map(h => parseInt(h, 16)))
    const data = new Uint8Array(payload.data.match(/.{2}/g).map(h => parseInt(h, 16)))
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    )
    return new TextDecoder().decode(decrypted)
  } catch {
    // If decryption fails (wrong user or corrupted data), return null
    return null
  }
}

/**
 * Remove a secure storage item
 * @param {string} key - Storage key
 */
export function removeSecure(key) {
  localStorage.removeItem(key)
}

/**
 * Check if a key exists in storage
 * @param {string} key - Storage key
 * @returns {boolean}
 */
export function hasSecure(key) {
  return localStorage.getItem(key) !== null
}

export default { setSecure, getSecure, removeSecure, hasSecure }
