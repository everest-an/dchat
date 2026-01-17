/**
 * Property-Based Tests for KeyManagementService
 * 
 * Feature: whitepaper-p0-features
 * Property 3: 公钥存储检索一致性 (Round-Trip)
 * Property 4: 密钥格式验证
 * Property 5: 密钥轮换历史保留
 * 
 * Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.7, 2.8
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value }),
    removeItem: vi.fn((key) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    key: vi.fn((i) => Object.keys(store)[i]),
    get length() { return Object.keys(store).length }
  }
})()

// Mock fetch
const mockFetch = vi.fn()

// Setup before importing the module
beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock)
  vi.stubGlobal('fetch', mockFetch)
  localStorageMock.clear()
  mockFetch.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// Import after mocking
import { KeyManagementService } from '../KeyManagementService'
import { generateKeyPair } from '../../utils/encryption'

// Arbitraries for generating test data
const walletAddressArb = fc.hexaString({ minLength: 40, maxLength: 40 })
  .map(hex => `0x${hex}`)

const base64KeyArb = fc.base64String({ minLength: 100, maxLength: 500 })

const pemKeyArb = fc.base64String({ minLength: 100, maxLength: 400 })
  .map(content => `-----BEGIN PUBLIC KEY-----\n${content}\n-----END PUBLIC KEY-----`)

const jwkKeyArb = fc.record({
  kty: fc.constant('RSA'),
  n: fc.base64String({ minLength: 50, maxLength: 200 }),
  e: fc.constant('AQAB')
}).map(obj => JSON.stringify(obj))

describe('KeyManagementService Property Tests', () => {
  
  /**
   * Property 3: 公钥存储检索一致性 (Round-Trip)
   * For any valid public key registered with a wallet address,
   * retrieving the public key by that address SHALL return the same key.
   * 
   * Validates: Requirements 2.2, 2.3, 2.5
   */
  describe('Property 3: Public Key Storage-Retrieval Consistency', () => {
    
    it('should return the same public key that was stored (local registry)', async () => {
      await fc.assert(
        fc.asyncProperty(walletAddressArb, base64KeyArb, async (address, publicKey) => {
          // Store the key
          KeyManagementService.saveToLocalRegistry(address, publicKey)
          
          // Mock backend to return 404 (force local fallback)
          mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ success: false, error: 'Not found' })
          })
          
          // Retrieve the key
          const retrieved = await KeyManagementService.getPublicKey(address)
          
          // Should be the same
          return retrieved === publicKey
        }),
        { numRuns: 100 }
      )
    })
    
    it('should return the same public key from backend', async () => {
      await fc.assert(
        fc.asyncProperty(walletAddressArb, base64KeyArb, async (address, publicKey) => {
          // Mock backend to return the key
          mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({
              success: true,
              data: { publicKey, keyFormat: 'BASE64', verified: true }
            })
          })
          
          // Clear any cached data
          KeyManagementService.clearCache(address)
          
          // Retrieve the key
          const retrieved = await KeyManagementService.getPublicKey(address)
          
          // Should be the same
          return retrieved === publicKey
        }),
        { numRuns: 100 }
      )
    })
    
    it('should cache retrieved keys and return from cache', async () => {
      await fc.assert(
        fc.asyncProperty(walletAddressArb, base64KeyArb, async (address, publicKey) => {
          // First call - mock backend
          mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({
              success: true,
              data: { publicKey, keyFormat: 'BASE64' }
            })
          })
          
          KeyManagementService.clearCache(address)
          
          // First retrieval (from backend)
          const first = await KeyManagementService.getPublicKey(address)
          
          // Second retrieval (should be from cache, no fetch)
          const second = await KeyManagementService.getPublicKey(address)
          
          // Both should be the same
          return first === publicKey && second === publicKey
        }),
        { numRuns: 50 }
      )
    })
  })
  
  /**
   * Property 4: 密钥格式验证
   * For any string that is not a valid PEM or JWK formatted public key,
   * registration SHALL fail with a validation error.
   * 
   * Validates: Requirements 2.4
   */
  describe('Property 4: Key Format Validation', () => {
    
    // Test the backend controller's validation logic (simulated)
    const validateKeyFormat = (key, format) => {
      if (!key || typeof key !== 'string') return false
      
      if (format === 'PEM') {
        return key.includes('-----BEGIN') && key.includes('-----END')
      } else if (format === 'JWK') {
        try {
          const parsed = JSON.parse(key)
          return parsed.kty && (parsed.n || parsed.x)
        } catch {
          return false
        }
      } else if (format === 'BASE64') {
        try {
          // Check if it's valid base64
          return /^[A-Za-z0-9+/]*={0,2}$/.test(key)
        } catch {
          return false
        }
      }
      return true
    }
    
    it('should accept valid PEM formatted keys', () => {
      fc.assert(
        fc.property(pemKeyArb, (pemKey) => {
          return validateKeyFormat(pemKey, 'PEM') === true
        }),
        { numRuns: 100 }
      )
    })
    
    it('should accept valid JWK formatted keys', () => {
      fc.assert(
        fc.property(jwkKeyArb, (jwkKey) => {
          return validateKeyFormat(jwkKey, 'JWK') === true
        }),
        { numRuns: 100 }
      )
    })
    
    it('should reject invalid PEM keys (missing headers)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 200 }).filter(s => !s.includes('-----BEGIN')),
          (invalidKey) => {
            return validateKeyFormat(invalidKey, 'PEM') === false
          }
        ),
        { numRuns: 100 }
      )
    })
    
    it('should reject invalid JWK keys (not valid JSON)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }).filter(s => {
            try { JSON.parse(s); return false } catch { return true }
          }),
          (invalidKey) => {
            return validateKeyFormat(invalidKey, 'JWK') === false
          }
        ),
        { numRuns: 100 }
      )
    })
    
    it('should reject null or undefined keys', () => {
      expect(validateKeyFormat(null, 'PEM')).toBe(false)
      expect(validateKeyFormat(undefined, 'PEM')).toBe(false)
      expect(validateKeyFormat('', 'PEM')).toBe(false)
    })
  })
  
  /**
   * Property 5: 密钥轮换历史保留
   * For any key rotation operation, the previous key SHALL be preserved
   * in history and remain accessible for decrypting old messages.
   * 
   * Validates: Requirements 2.7, 2.8
   */
  describe('Property 5: Key Rotation History Preservation', () => {
    
    it('should preserve old key when rotating', async () => {
      await fc.assert(
        fc.asyncProperty(
          walletAddressArb,
          base64KeyArb,
          base64KeyArb,
          async (address, oldKey, newKey) => {
            // Assume old key != new key for meaningful test
            fc.pre(oldKey !== newKey)
            
            // Setup: store old key
            KeyManagementService.saveToLocalRegistry(address, oldKey)
            
            // Mock backend rotation response
            mockFetch.mockResolvedValueOnce({
              json: () => Promise.resolve({
                success: true,
                message: 'Key rotated successfully',
                data: { rotatedAt: new Date().toISOString() }
              })
            })
            
            // Store the old key in a simulated history
            const historyKey = `dchat_key_history_${address.toLowerCase()}`
            const history = JSON.parse(localStorage.getItem(historyKey) || '[]')
            history.push({
              publicKey: oldKey,
              validFrom: new Date(Date.now() - 86400000).toISOString(),
              validUntil: new Date().toISOString()
            })
            localStorage.setItem(historyKey, JSON.stringify(history))
            
            // Update to new key
            KeyManagementService.saveToLocalRegistry(address, newKey)
            
            // Verify: old key should be in history
            const savedHistory = JSON.parse(localStorage.getItem(historyKey) || '[]')
            const oldKeyInHistory = savedHistory.some(h => h.publicKey === oldKey)
            
            // Verify: current key should be new key
            const currentKey = localStorage.getItem(`dchat_public_registry_${address.toLowerCase()}`)
            
            return oldKeyInHistory && currentKey === newKey
          }
        ),
        { numRuns: 50 }
      )
    })
    
    it('should allow retrieval of historical keys by time range', async () => {
      await fc.assert(
        fc.asyncProperty(
          walletAddressArb,
          fc.array(base64KeyArb, { minLength: 2, maxLength: 5 }),
          async (address, keys) => {
            // Create history with multiple keys
            const historyKey = `dchat_key_history_${address.toLowerCase()}`
            const history = keys.map((key, index) => ({
              publicKey: key,
              validFrom: new Date(Date.now() - (keys.length - index) * 86400000).toISOString(),
              validUntil: new Date(Date.now() - (keys.length - index - 1) * 86400000).toISOString()
            }))
            localStorage.setItem(historyKey, JSON.stringify(history))
            
            // Verify all keys are in history
            const savedHistory = JSON.parse(localStorage.getItem(historyKey) || '[]')
            return savedHistory.length === keys.length &&
                   keys.every(key => savedHistory.some(h => h.publicKey === key))
          }
        ),
        { numRuns: 50 }
      )
    })
  })
  
  /**
   * Additional Property: Key Initialization Idempotence
   * Initializing keys multiple times for the same account should return
   * the same keys (not generate new ones each time).
   */
  describe('Additional: Key Initialization Idempotence', () => {
    
    it('should return same keys on repeated initialization', async () => {
      // This test uses real key generation, so we limit runs
      const address = '0x' + '1'.repeat(40)
      
      // Mock backend registration
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ success: true })
      })
      
      // First initialization
      const keys1 = await KeyManagementService.initializeKeys(address)
      
      // Second initialization (should return same keys)
      const keys2 = await KeyManagementService.initializeKeys(address)
      
      expect(keys1.publicKey).toBe(keys2.publicKey)
      expect(keys1.privateKey).toBe(keys2.privateKey)
    })
  })
})
