/**
 * API客户端测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { get, post, put, del, setAuthToken, API_ENDPOINTS } from '@/utils/apiClient'

// Mock fetch
global.fetch = vi.fn()

describe('apiClient', () => {
  beforeEach(() => {
    // 清理mock
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('setAuthToken', () => {
    it('应该设置token到localStorage', () => {
      const token = 'test-token-123'
      setAuthToken(token)
      expect(localStorage.setItem).toHaveBeenCalledWith('authToken', token)
    })

    it('应该移除token当传入null', () => {
      setAuthToken(null)
      expect(localStorage.removeItem).toHaveBeenCalledWith('authToken')
    })
  })

  describe('get', () => {
    it('应该发送GET请求', async () => {
      const mockResponse = { success: true, data: 'test' }
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await get('/test')
      
      expect(global.fetch).toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
    })

    it('应该正确处理查询参数', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await get('/test', { page: 1, limit: 10 })
      
      const callUrl = global.fetch.mock.calls[0][0]
      expect(callUrl).toContain('page=1')
      expect(callUrl).toContain('limit=10')
    })
  })

  describe('post', () => {
    it('应该发送POST请求', async () => {
      const mockResponse = { success: true }
      const postData = { name: 'test' }
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await post('/test', postData)
      
      expect(global.fetch).toHaveBeenCalled()
      const callOptions = global.fetch.mock.calls[0][1]
      expect(callOptions.method).toBe('POST')
      expect(callOptions.body).toBe(JSON.stringify(postData))
      expect(result).toEqual(mockResponse)
    })
  })

  describe('put', () => {
    it('应该发送PUT请求', async () => {
      const mockResponse = { success: true }
      const putData = { name: 'updated' }
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      await put('/test', putData)
      
      const callOptions = global.fetch.mock.calls[0][1]
      expect(callOptions.method).toBe('PUT')
      expect(callOptions.body).toBe(JSON.stringify(putData))
    })
  })

  describe('del', () => {
    it('应该发送DELETE请求', async () => {
      const mockResponse = { success: true }
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      await del('/test')
      
      const callOptions = global.fetch.mock.calls[0][1]
      expect(callOptions.method).toBe('DELETE')
    })
  })

  describe('错误处理', () => {
    it('应该处理HTTP错误', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Resource not found' })
      })

      await expect(get('/test')).rejects.toThrow()
    })

    it('应该处理网络错误', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(get('/test')).rejects.toThrow('Network error')
    })
  })

  describe('认证', () => {
    it('应该在请求中包含认证token', async () => {
      const token = 'test-token'
      localStorage.getItem.mockReturnValue(token)
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await get('/test')
      
      const callOptions = global.fetch.mock.calls[0][1]
      expect(callOptions.headers['Authorization']).toBe(`Bearer ${token}`)
    })
  })

  describe('API_ENDPOINTS', () => {
    it('应该包含所有必需的端点', () => {
      expect(API_ENDPOINTS.AUTH).toBeDefined()
      expect(API_ENDPOINTS.USERS).toBeDefined()
      expect(API_ENDPOINTS.MESSAGES).toBeDefined()
      expect(API_ENDPOINTS.GROUPS).toBeDefined()
      expect(API_ENDPOINTS.NOTIFICATIONS).toBeDefined()
      expect(API_ENDPOINTS.PROJECTS).toBeDefined()
    })

    it('应该正确生成动态端点', () => {
      expect(API_ENDPOINTS.USERS.GET(123)).toBe('/users/123')
      expect(API_ENDPOINTS.GROUPS.MESSAGES('abc')).toBe('/groups/abc/messages')
      expect(API_ENDPOINTS.NOTIFICATIONS.DELETE('xyz')).toBe('/notifications/xyz')
    })
  })
})
