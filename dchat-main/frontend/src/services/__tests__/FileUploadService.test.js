/**
 * Unit tests for FileUploadService
 */

import FileUploadService from '../FileUploadService';

describe('FileUploadService', () => {
  let service;

  beforeEach(() => {
    service = new FileUploadService();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockResponse = {
        success: true,
        file: {
          filename: 'test-123.txt',
          url: 'http://localhost/uploads/test-123.txt',
          size: 1024,
          type: 'text/plain'
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.uploadFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.file).toBeDefined();
      expect(result.file.filename).toBe('test-123.txt');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/upload',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should handle upload errors', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Upload failed'
        })
      });

      const result = await service.uploadFile(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('should handle network errors', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.uploadFile(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should call onProgress callback', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const onProgress = jest.fn();

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          file: {}
        })
      });

      await service.uploadFile(mockFile, { onProgress });

      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe('uploadMultiple', () => {
    it('should upload multiple files successfully', async () => {
      const files = [
        new File(['test 1'], 'test1.txt', { type: 'text/plain' }),
        new File(['test 2'], 'test2.txt', { type: 'text/plain' })
      ];

      const mockResponse = {
        success: true,
        files: [
          { filename: 'test1-123.txt', url: '/uploads/test1-123.txt' },
          { filename: 'test2-456.txt', url: '/uploads/test2-456.txt' }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.uploadMultiple(files);

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2);
    });

    it('should handle partial upload failures', async () => {
      const files = [
        new File(['test 1'], 'test1.txt', { type: 'text/plain' }),
        new File(['test 2'], 'test2.txt', { type: 'text/plain' })
      ];

      const mockResponse = {
        success: true,
        files: [
          { filename: 'test1-123.txt', url: '/uploads/test1-123.txt' }
        ],
        errors: [
          { filename: 'test2.txt', error: 'Upload failed' }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.uploadMultiple(files);

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'File deleted'
        })
      });

      const result = await service.deleteFile('test-123.txt');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/upload/test-123.txt',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should handle delete errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'File not found'
        })
      });

      const result = await service.deleteFile('non-existent.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });

  describe('listFiles', () => {
    it('should list files successfully', async () => {
      const mockResponse = {
        success: true,
        files: [
          { filename: 'test1.txt', size: 1024, type: 'text/plain' },
          { filename: 'test2.jpg', size: 2048, type: 'image/jpeg' }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.listFiles();

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2);
    });

    it('should support filtering by type', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          files: []
        })
      });

      await service.listFiles({ type: 'image' });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/upload/list?type=image',
        expect.any(Object)
      );
    });

    it('should support search query', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          files: []
        })
      });

      await service.listFiles({ search: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/upload/list?search=test',
        expect.any(Object)
      );
    });
  });

  describe('getConfig', () => {
    it('should retrieve upload configuration', async () => {
      const mockConfig = {
        success: true,
        config: {
          maxFileSize: 104857600,
          allowedTypes: ['image/*', 'application/pdf']
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig
      });

      const result = await service.getConfig();

      expect(result.success).toBe(true);
      expect(result.config.maxFileSize).toBeDefined();
      expect(result.config.allowedTypes).toBeDefined();
    });
  });

  describe('validateFile', () => {
    it('should validate file size', () => {
      const largeFile = new File(['x'.repeat(200 * 1024 * 1024)], 'large.txt');
      const result = service.validateFile(largeFile, {
        maxFileSize: 100 * 1024 * 1024
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('should validate file type', () => {
      const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      const result = service.validateFile(file, {
        allowedTypes: ['image/*', 'text/*']
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should accept valid files', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const result = service.validateFile(file, {
        maxFileSize: 100 * 1024 * 1024,
        allowedTypes: ['text/*']
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(service.formatFileSize(0)).toBe('0 B');
      expect(service.formatFileSize(1024)).toBe('1.00 KB');
      expect(service.formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(service.formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    });
  });

  describe('getFileType', () => {
    it('should categorize file types correctly', () => {
      expect(service.getFileType('image/jpeg')).toBe('image');
      expect(service.getFileType('video/mp4')).toBe('video');
      expect(service.getFileType('audio/mp3')).toBe('audio');
      expect(service.getFileType('application/pdf')).toBe('document');
      expect(service.getFileType('text/plain')).toBe('document');
      expect(service.getFileType('application/octet-stream')).toBe('other');
    });
  });
});
