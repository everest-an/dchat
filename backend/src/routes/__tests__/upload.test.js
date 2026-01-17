/**
 * Unit tests for file upload API
 */

const request = require('supertest');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const uploadRouter = require('../upload');

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockS3 = {
    upload: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Location: 'https://s3.amazonaws.com/test-bucket/test-file.jpg'
      })
    }),
    deleteObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    })
  };
  
  return {
    S3: jest.fn(() => mockS3),
    config: {
      update: jest.fn()
    }
  };
});

// Mock Sharp
jest.mock('sharp', () => {
  return jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue({ size: 1024 })
  }));
});

describe('Upload API', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/upload', uploadRouter);
    
    // Set environment variables
    process.env.S3_ENABLED = 'false';
    process.env.MAX_FILE_SIZE = '104857600';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/upload', () => {
    it('should upload a file successfully', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('test file content'), 'test.txt')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.file).toBeDefined();
      expect(response.body.file.filename).toBeDefined();
      expect(response.body.file.url).toBeDefined();
    });

    it('should reject files that are too large', async () => {
      process.env.MAX_FILE_SIZE = '100'; // 100 bytes

      const largeBuffer = Buffer.alloc(200);
      const response = await request(app)
        .post('/api/upload')
        .attach('file', largeBuffer, 'large.txt')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('too large');
    });

    it('should reject invalid file types', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('test'), 'test.exe')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not allowed');
    });

    it('should generate thumbnail for images', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('fake image'), 'test.jpg')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.file.thumbnail).toBeDefined();
    });

    it('should calculate file hash', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('test content'), 'test.txt')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.file.hash).toBeDefined();
      expect(response.body.file.hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('POST /api/upload/multiple', () => {
    it('should upload multiple files successfully', async () => {
      const response = await request(app)
        .post('/api/upload/multiple')
        .attach('files', Buffer.from('file 1'), 'test1.txt')
        .attach('files', Buffer.from('file 2'), 'test2.txt')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.files).toHaveLength(2);
      expect(response.body.files[0].filename).toBeDefined();
      expect(response.body.files[1].filename).toBeDefined();
    });

    it('should handle partial upload failures', async () => {
      const response = await request(app)
        .post('/api/upload/multiple')
        .attach('files', Buffer.from('valid file'), 'test.txt')
        .attach('files', Buffer.from('invalid'), 'test.exe')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.files.length).toBeGreaterThan(0);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('DELETE /api/upload/:filename', () => {
    it('should delete a file successfully', async () => {
      const response = await request(app)
        .delete('/api/upload/test-file.txt')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 404 for non-existent files', async () => {
      const response = await request(app)
        .delete('/api/upload/non-existent.txt')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/upload/list', () => {
    it('should list uploaded files', async () => {
      const response = await request(app)
        .get('/api/upload/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.files)).toBe(true);
    });

    it('should filter files by type', async () => {
      const response = await request(app)
        .get('/api/upload/list?type=image')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.files)).toBe(true);
    });

    it('should search files by name', async () => {
      const response = await request(app)
        .get('/api/upload/list?search=test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.files)).toBe(true);
    });
  });

  describe('GET /api/upload/config', () => {
    it('should return upload configuration', async () => {
      const response = await request(app)
        .get('/api/upload/config')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.config).toBeDefined();
      expect(response.body.config.maxFileSize).toBeDefined();
      expect(response.body.config.allowedTypes).toBeDefined();
    });
  });

  describe('S3 Integration', () => {
    beforeEach(() => {
      process.env.S3_ENABLED = 'true';
      process.env.S3_BUCKET = 'test-bucket';
    });

    it('should upload to S3 when enabled', async () => {
      const AWS = require('aws-sdk');
      const mockS3Instance = new AWS.S3();

      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('test'), 'test.txt')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockS3Instance.upload).toHaveBeenCalled();
    });

    it('should delete from S3 when enabled', async () => {
      const AWS = require('aws-sdk');
      const mockS3Instance = new AWS.S3();

      const response = await request(app)
        .delete('/api/upload/test-file.txt')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockS3Instance.deleteObject).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing file', async () => {
      const response = await request(app)
        .post('/api/upload')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No file');
    });

    it('should handle S3 upload errors', async () => {
      process.env.S3_ENABLED = 'true';
      
      const AWS = require('aws-sdk');
      const mockS3Instance = new AWS.S3();
      mockS3Instance.upload.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('S3 error'))
      });

      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('test'), 'test.txt')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});
