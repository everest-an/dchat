/**
 * 错误处理工具测试
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
    it('应该识别网络错误', () => {
      const error = new Error('Network request failed')
      expect(parseErrorType(error)).toBe(ErrorType.NETWORK)
    })

    it('应该识别认证错误', () => {
      const error = new Error('Unauthorized access')
      expect(parseErrorType(error)).toBe(ErrorType.AUTH)
    })

    it('应该识别验证错误', () => {
      const error = new Error('Invalid email address')
      expect(parseErrorType(error)).toBe(ErrorType.VALIDATION)
    })

    it('应该识别合约错误', () => {
      const error = new Error('Contract execution reverted')
      expect(parseErrorType(error)).toBe(ErrorType.CONTRACT)
    })

    it('应该识别IPFS错误', () => {
      const error = new Error('IPFS upload failed')
      expect(parseErrorType(error)).toBe(ErrorType.IPFS)
    })

    it('应该返回未知错误类型', () => {
      const error = new Error('Something went wrong')
      expect(parseErrorType(error)).toBe(ErrorType.UNKNOWN)
    })
  })

  describe('getFriendlyErrorMessage', () => {
    it('应该返回友好的网络错误消息', () => {
      const error = new Error('Failed to fetch')
      const message = getFriendlyErrorMessage(error)
      expect(message).toContain('网络连接失败')
    })

    it('应该返回友好的认证错误消息', () => {
      const error = new Error('Token expired')
      const message = getFriendlyErrorMessage(error)
      expect(message).toContain('登录已过期')
    })

    it('应该处理字符串错误', () => {
      const message = getFriendlyErrorMessage('User rejected')
      expect(message).toContain('用户拒绝')
    })

    it('应该限制长错误消息的长度', () => {
      const longError = 'a'.repeat(150)
      const message = getFriendlyErrorMessage(longError)
      expect(message.length).toBeLessThanOrEqual(103) // 100 + '...'
    })
  })

  describe('handleContractError', () => {
    it('应该处理用户取消交易', () => {
      const error = { code: 4001, message: 'User rejected' }
      const message = handleContractError(error)
      expect(message).toContain('取消了交易')
    })

    it('应该处理余额不足错误', () => {
      const error = { message: 'insufficient funds for gas' }
      const message = handleContractError(error)
      expect(message).toContain('余额不足')
    })

    it('应该处理Gas费用不足', () => {
      const error = { message: 'gas required exceeds allowance' }
      const message = handleContractError(error)
      expect(message).toContain('Gas 费用不足')
    })
  })

  describe('handleNetworkError', () => {
    it('应该处理fetch失败', () => {
      const error = new Error('Failed to fetch')
      const message = handleNetworkError(error)
      expect(message).toContain('网络连接失败')
    })

    it('应该处理超时错误', () => {
      const error = new Error('Request timeout')
      const message = handleNetworkError(error)
      expect(message).toContain('超时')
    })
  })

  describe('isValidAddress', () => {
    it('应该验证有效的以太坊地址', () => {
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')).toBe(false) // 少一位
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0')).toBe(true)
      expect(isValidAddress('0x0000000000000000000000000000000000000000')).toBe(true)
    })

    it('应该拒绝无效的地址', () => {
      expect(isValidAddress('0x123')).toBe(false)
      expect(isValidAddress('123')).toBe(false)
      expect(isValidAddress('')).toBe(false)
      expect(isValidAddress('not an address')).toBe(false)
    })
  })

  describe('isValidEmail', () => {
    it('应该验证有效的邮箱', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
      expect(isValidEmail('user+tag@example.com')).toBe(true)
    })

    it('应该拒绝无效的邮箱', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('invalid@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('invalid@domain')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })
  })

  describe('isValidPhone', () => {
    it('应该验证有效的中国大陆手机号', () => {
      expect(isValidPhone('13800138000')).toBe(true)
      expect(isValidPhone('15912345678')).toBe(true)
      expect(isValidPhone('18612345678')).toBe(true)
    })

    it('应该拒绝无效的手机号', () => {
      expect(isValidPhone('12345678901')).toBe(false) // 不是1开头
      expect(isValidPhone('1381234567')).toBe(false) // 位数不够
      expect(isValidPhone('138123456789')).toBe(false) // 位数太多
      expect(isValidPhone('')).toBe(false)
      expect(isValidPhone('abc')).toBe(false)
    })
  })
})
