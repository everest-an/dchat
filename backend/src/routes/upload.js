/**
 * File Upload Routes
 * Express routes for file upload functionality
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const AWS = require('aws-sdk');
const sharp = require('sharp');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = {
      image: /jpeg|jpg|png|gif|webp/,
      document: /pdf|doc|docx|txt/,
      video: /mp4|webm|ogg/,
      audio: /mp3|wav|ogg/
    };

    const category = req.body.category || 'image';
    const extname = allowedTypes[category]?.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes[category]?.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error(`Invalid file type for category: ${category}`));
    }
  }
});

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const S3_BUCKET = process.env.S3_BUCKET || 'dchat-uploads';
const S3_ENABLED = process.env.S3_ENABLED === 'true';
const IPFS_ENABLED = process.env.IPFS_ENABLED === 'true';

// Upload directory for local storage
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);

/**
 * Generate unique filename
 */
function generateFilename(originalname) {
  const ext = path.extname(originalname);
  const uniqueId = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}_${uniqueId}${ext}`;
}

/**
 * Calculate file hash
 */
function calculateHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Upload to S3
 */
async function uploadToS3(buffer, filename, mimetype) {
  const params = {
    Bucket: S3_BUCKET,
    Key: filename,
    Body: buffer,
    ContentType: mimetype,
    ACL: 'public-read'
  };

  const result = await s3.upload(params).promise();
  
  return {
    url: result.Location,
    key: result.Key,
    bucket: result.Bucket
  };
}

/**
 * Upload to local storage
 */
async function uploadToLocal(buffer, filename) {
  const filepath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filepath, buffer);
  
  // In production, replace with actual domain
  const url = `/uploads/${filename}`;
  
  return {
    url,
    path: filepath
  };
}

/**
 * Generate thumbnail for images
 */
async function generateThumbnail(buffer, mimetype) {
  if (!mimetype.startsWith('image/')) {
    return null;
  }

  try {
    const thumbnail = await sharp(buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    return thumbnail;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return null;
  }
}

/**
 * POST /api/upload
 * Upload single file
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { category = 'image', storage = 'auto' } = req.body;
    const file = req.file;
    
    // Generate unique filename
    const filename = generateFilename(file.originalname);
    
    // Calculate file hash
    const fileHash = calculateHash(file.buffer);
    
    // Determine storage backend
    let storageBackend = storage;
    if (storage === 'auto') {
      storageBackend = S3_ENABLED ? 's3' : 'local';
    }
    
    // Upload file
    let uploadResult;
    if (storageBackend === 's3' && S3_ENABLED) {
      uploadResult = await uploadToS3(file.buffer, filename, file.mimetype);
      uploadResult.storage = 's3';
    } else {
      uploadResult = await uploadToLocal(file.buffer, filename);
      uploadResult.storage = 'local';
    }
    
    // Generate thumbnail for images
    let thumbnailUrl = null;
    if (category === 'image') {
      const thumbnail = await generateThumbnail(file.buffer, file.mimetype);
      if (thumbnail) {
        const thumbnailFilename = `thumb_${filename}`;
        if (storageBackend === 's3' && S3_ENABLED) {
          const thumbResult = await uploadToS3(thumbnail, thumbnailFilename, 'image/jpeg');
          thumbnailUrl = thumbResult.url;
        } else {
          const thumbResult = await uploadToLocal(thumbnail, thumbnailFilename);
          thumbnailUrl = thumbResult.url;
        }
      }
    }
    
    // Return response
    res.json({
      success: true,
      url: uploadResult.url,
      filename: filename,
      originalFilename: file.originalname,
      size: file.size,
      type: file.mimetype,
      category: category,
      storage: uploadResult.storage,
      hash: fileHash,
      thumbnailUrl: thumbnailUrl,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Upload failed'
    });
  }
});

/**
 * POST /api/upload/multiple
 * Upload multiple files
 */
router.post('/multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const { category = 'image', storage = 'auto' } = req.body;
    const results = [];
    const errors = [];

    for (const file of req.files) {
      try {
        // Generate unique filename
        const filename = generateFilename(file.originalname);
        
        // Calculate file hash
        const fileHash = calculateHash(file.buffer);
        
        // Determine storage backend
        let storageBackend = storage;
        if (storage === 'auto') {
          storageBackend = S3_ENABLED ? 's3' : 'local';
        }
        
        // Upload file
        let uploadResult;
        if (storageBackend === 's3' && S3_ENABLED) {
          uploadResult = await uploadToS3(file.buffer, filename, file.mimetype);
          uploadResult.storage = 's3';
        } else {
          uploadResult = await uploadToLocal(file.buffer, filename);
          uploadResult.storage = 'local';
        }
        
        // Generate thumbnail for images
        let thumbnailUrl = null;
        if (category === 'image') {
          const thumbnail = await generateThumbnail(file.buffer, file.mimetype);
          if (thumbnail) {
            const thumbnailFilename = `thumb_${filename}`;
            if (storageBackend === 's3' && S3_ENABLED) {
              const thumbResult = await uploadToS3(thumbnail, thumbnailFilename, 'image/jpeg');
              thumbnailUrl = thumbResult.url;
            } else {
              const thumbResult = await uploadToLocal(thumbnail, thumbnailFilename);
              thumbnailUrl = thumbResult.url;
            }
          }
        }
        
        results.push({
          success: true,
          url: uploadResult.url,
          filename: filename,
          originalFilename: file.originalname,
          size: file.size,
          type: file.mimetype,
          category: category,
          storage: uploadResult.storage,
          hash: fileHash,
          thumbnailUrl: thumbnailUrl
        });
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    res.json({
      success: errors.length === 0,
      results,
      errors,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Upload failed'
    });
  }
});

/**
 * DELETE /api/upload/:filename
 * Delete uploaded file
 */
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { storage = 'local' } = req.query;

    if (storage === 's3' && S3_ENABLED) {
      // Delete from S3
      await s3.deleteObject({
        Bucket: S3_BUCKET,
        Key: filename
      }).promise();
      
      // Delete thumbnail if exists
      try {
        await s3.deleteObject({
          Bucket: S3_BUCKET,
          Key: `thumb_${filename}`
        }).promise();
      } catch (error) {
        // Ignore if thumbnail doesn't exist
      }
    } else {
      // Delete from local storage
      const filepath = path.join(UPLOAD_DIR, filename);
      await fs.unlink(filepath);
      
      // Delete thumbnail if exists
      try {
        const thumbPath = path.join(UPLOAD_DIR, `thumb_${filename}`);
        await fs.unlink(thumbPath);
      } catch (error) {
        // Ignore if thumbnail doesn't exist
      }
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Delete failed'
    });
  }
});

/**
 * GET /api/upload/list
 * List uploaded files (local storage only)
 */
router.get('/list', async (req, res) => {
  try {
    const files = await fs.readdir(UPLOAD_DIR);
    
    const fileList = await Promise.all(
      files
        .filter(f => !f.startsWith('thumb_'))
        .map(async (filename) => {
          const filepath = path.join(UPLOAD_DIR, filename);
          const stats = await fs.stat(filepath);
          
          return {
            filename,
            url: `/uploads/${filename}`,
            size: stats.size,
            uploadedAt: stats.birthtime.toISOString()
          };
        })
    );

    res.json({
      success: true,
      files: fileList,
      total: fileList.length
    });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list files'
    });
  }
});

/**
 * GET /api/upload/config
 * Get upload configuration
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    config: {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedTypes: {
        image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        video: ['video/mp4', 'video/webm', 'video/ogg'],
        audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
      },
      storageBackends: {
        s3: S3_ENABLED,
        ipfs: IPFS_ENABLED,
        local: true
      },
      defaultStorage: S3_ENABLED ? 's3' : 'local'
    }
  });
});

module.exports = router;
