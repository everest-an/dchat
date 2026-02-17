/**
 * Unified API Client tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock fetch globally.
global.fetch = vi.fn()

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should export default api object and ApiError class', async () => {
    const mod = await import('../apiClient.js')
    expect(mod.default).toBeDefined()
    expect(mod.ApiError).toBeDefined()
  })

  it('ApiError should contain status and data', async () => {
    const { ApiError } = await import('../apiClient.js')
    const err = new ApiError('test error', 404, { detail: 'not found' })
    expect(err.message).toBe('test error')
    expect(err.status).toBe(404)
    expect(err.data).toEqual({ detail: 'not found' })
    expect(err instanceof Error).toBe(true)
  })
})

describe('ApiError', () => {
  it('should create an error with status and data', async () => {
    const { ApiError } = await import('../apiClient.js')
    const err = new ApiError('Not Found', 404, { detail: 'resource missing' })

    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('Not Found')
    expect(err.status).toBe(404)
    expect(err.data).toEqual({ detail: 'resource missing' })
  })

  it('should default data to null', async () => {
    const { ApiError } = await import('../apiClient.js')
    const err = new ApiError('Server Error', 500)

    expect(err.data).toBeNull()
  })
})
