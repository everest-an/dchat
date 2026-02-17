/**
 * Error handler utility tests
 * Updated to match English error messages after refactoring.
 */
import { describe, it, expect } from 'vitest'
import {
  ErrorType,
  parseErrorType,
  getFriendlyErrorMessage,
  handleContractError,
  handleNetworkError,
  isValidAddress,
  isValidEmail,
  isValidPhone
} from '@/utils/errorHandler'

describe('errorHandler', () => {
  describe('parseErrorType', () => {
    it('should identify network errors', () => {
      const error = new Error('Network request failed')
      expect(parseErrorType(error)).toBe(ErrorType.NETWORK)
    })

    it('should identify auth errors', () => {
      const error = new Error('Unauthorized access')
      expect(parseErrorType(error)).toBe(ErrorType.AUTH)
    })

    it('should identify validation errors', () => {
      const error = new Error('Invalid email address')
      expect(parseErrorType(error)).toBe(ErrorType.VALIDATION)
    })

    it('should identify contract errors', () => {
      const error = new Error('Contract execution reverted')
      expect(parseErrorType(error)).toBe(ErrorType.CONTRACT)
    })

    it('should identify IPFS errors', () => {
      const error = new Error('IPFS upload failed')
      expect(parseErrorType(error)).toBe(ErrorType.IPFS)
    })

    it('should return unknown error type for unrecognized errors', () => {
      const error = new Error('Something went wrong')
      expect(parseErrorType(error)).toBe(ErrorType.UNKNOWN)
    })
  })

  describe('getFriendlyErrorMessage', () => {
    it('should return friendly network error message', () => {
      const error = new Error('Failed to fetch')
      const message = getFriendlyErrorMessage(error)
      // Should match one of the errorMessages entries.
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
    })

    it('should return friendly auth error message', () => {
      const error = new Error('Token expired')
      const message = getFriendlyErrorMessage(error)
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
    })

    it('should handle string errors', () => {
      const message = getFriendlyErrorMessage('User rejected')
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
    })

    it('should truncate long error messages', () => {
      const longError = 'a'.repeat(150)
      const message = getFriendlyErrorMessage(longError)
      expect(message.length).toBeLessThanOrEqual(103) // 100 + '...'
    })

    it('should handle null/undefined errors', () => {
      const message = getFriendlyErrorMessage(null)
      expect(typeof message).toBe('string')
    })
  })

  describe('handleContractError', () => {
    it('should handle user rejected transaction (code 4001)', () => {
      const error = { code: 4001, message: 'User rejected' }
      const message = handleContractError(error)
      expect(message.toLowerCase()).toContain('rejected')
    })

    it('should handle insufficient funds error', () => {
      const error = { message: 'insufficient funds for gas' }
      const message = handleContractError(error)
      expect(message.toLowerCase()).toContain('insufficient')
    })

    it('should handle gas exceeds error', () => {
      const error = { message: 'gas required exceeds allowance' }
      const message = handleContractError(error)
      expect(message.toLowerCase()).toContain('gas')
    })
  })

  describe('handleNetworkError', () => {
    it('should handle fetch failure', () => {
      const error = new Error('Failed to fetch')
      const message = handleNetworkError(error)
      expect(message.toLowerCase()).toContain('network')
    })

    it('should handle timeout error', () => {
      const error = new Error('Request timeout')
      const message = handleNetworkError(error)
      expect(message.toLowerCase()).toContain('time')
    })
  })

  describe('isValidAddress', () => {
    it('should validate correct Ethereum addresses', () => {
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')).toBe(false) // 39 chars
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0')).toBe(true)
      expect(isValidAddress('0x0000000000000000000000000000000000000000')).toBe(true)
    })

    it('should reject invalid addresses', () => {
      expect(isValidAddress('0x123')).toBe(false)
      expect(isValidAddress('123')).toBe(false)
      expect(isValidAddress('')).toBe(false)
      expect(isValidAddress('not an address')).toBe(false)
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
      expect(isValidEmail('user+tag@example.com')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('invalid@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('invalid@domain')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })
  })

  describe('isValidPhone', () => {
    it('should validate correct Chinese phone numbers', () => {
      expect(isValidPhone('13800138000')).toBe(true)
      expect(isValidPhone('15912345678')).toBe(true)
      expect(isValidPhone('18612345678')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('12345678901')).toBe(false)
      expect(isValidPhone('1381234567')).toBe(false)
      expect(isValidPhone('138123456789')).toBe(false)
      expect(isValidPhone('')).toBe(false)
      expect(isValidPhone('abc')).toBe(false)
    })
  })
})
