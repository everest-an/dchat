import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fileUploadService from '../FileUploadService'

/**
 * Unit tests for FileUploadService
 *
 * The service uses XMLHttpRequest for uploads (with progress tracking)
 * and fetch for delete operations. We test the synchronous utility
 * methods directly and mock fetch for delete.
 */

describe('FileUploadService', () => {
  let service

  beforeEach(() => {
    service = fileUploadService
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('validateFile', () => {
    it('should reject files exceeding size limit', () => {
      const bigFile = new File(['x'], 'big.png', { type: 'image/png' })
      Object.defineProperty(bigFile, 'size', { value: 200 * 1024 * 1024 })
      const result = service.validateFile(bigFile, 'image')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('exceeds')
    })

    it('should reject disallowed file types', () => {
      const txtFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      Object.defineProperty(txtFile, 'size', { value: 100 })
      const result = service.validateFile(txtFile, 'image')
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('not allowed')
    })

    it('should accept valid image files', () => {
      const imgFile = new File(['img'], 'photo.png', { type: 'image/png' })
      Object.defineProperty(imgFile, 'size', { value: 1024 })
      const result = service.validateFile(imgFile, 'image')
      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('should accept valid video files', () => {
      const vidFile = new File(['vid'], 'video.mp4', { type: 'video/mp4' })
      Object.defineProperty(vidFile, 'size', { value: 1024 })
      const result = service.validateFile(vidFile, 'video')
      expect(result.valid).toBe(true)
    })
  })

  describe('formatFileSize', () => {
    it('should format 0 bytes', () => {
      expect(service.formatFileSize(0)).toBe('0 Bytes')
    })

    it('should format kilobytes', () => {
      expect(service.formatFileSize(1024)).toBe('1 KB')
    })

    it('should format megabytes', () => {
      expect(service.formatFileSize(1024 * 1024)).toBe('1 MB')
    })

    it('should format gigabytes', () => {
      expect(service.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })

    it('should format intermediate sizes', () => {
      expect(service.formatFileSize(1536)).toBe('1.5 KB')
    })
  })

  describe('getFileInfo', () => {
    it('should return file metadata', () => {
      const file = new File(['test'], 'photo.png', { type: 'image/png' })
      Object.defineProperty(file, 'size', { value: 2048 })
      const info = service.getFileInfo(file)
      expect(info.name).toBe('photo.png')
      expect(info.type).toBe('image/png')
      expect(info.size).toBe(2048)
      expect(info.sizeFormatted).toBe('2 KB')
    })
  })

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await service.deleteFile('https://example.com/uploads/test.png')
      expect(result).toBeDefined()
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should handle delete errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

      await expect(service.deleteFile('https://example.com/uploads/test.png'))
        .rejects.toThrow()
    })
  })

  describe('uploadFile', () => {
    it('should throw on invalid file type', async () => {
      const txtFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      Object.defineProperty(txtFile, 'size', { value: 100 })

      await expect(service.uploadFile(txtFile, { category: 'image' }))
        .rejects.toThrow('not allowed')
    })

    it('should throw on oversized file', async () => {
      const bigFile = new File(['x'], 'big.png', { type: 'image/png' })
      Object.defineProperty(bigFile, 'size', { value: 200 * 1024 * 1024 })

      await expect(service.uploadFile(bigFile))
        .rejects.toThrow('exceeds')
    })
  })
})
