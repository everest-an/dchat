/**
 * File Upload Service
 * Handles file uploads to various storage backends (S3, IPFS, local)
 */

class FileUploadService {
  constructor() {
    this.uploadEndpoint = import.meta.env.VITE_UPLOAD_ENDPOINT || '/api/upload';
    this.maxFileSize = 100 * 1024 * 1024; // 100MB
    this.allowedTypes = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      video: ['video/mp4', 'video/webm', 'video/ogg'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
    };
  }

  /**
   * Validate file before upload
   */
  validateFile(file, category = 'image') {
    const errors = [];

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds ${this.maxFileSize / (1024 * 1024)}MB limit`);
    }

    // Check file type
    const allowedTypes = this.allowedTypes[category] || this.allowedTypes.image;
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Upload file to backend
   * @param {File} file - File object to upload
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with URL
   */
  async uploadFile(file, options = {}) {
    const {
      category = 'image',
      onProgress = null,
      storage = 'auto' // 'auto', 's3', 'ipfs', 'local'
    } = options;

    // Validate file
    const validation = this.validateFile(file, category);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('storage', storage);

    try {
      // Upload with progress tracking
      const response = await this._uploadWithProgress(formData, onProgress);
      
      return {
        success: true,
        url: response.url,
        filename: response.filename,
        size: response.size,
        type: response.type,
        storage: response.storage
      };
    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(files, options = {}) {
    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.uploadFile(files[i], {
          ...options,
          onProgress: (progress) => {
            if (options.onProgress) {
              options.onProgress({
                fileIndex: i,
                totalFiles: files.length,
                progress
              });
            }
          }
        });
        results.push(result);
      } catch (error) {
        errors.push({
          file: files[i].name,
          error: error.message
        });
      }
    }

    return {
      results,
      errors,
      success: errors.length === 0
    };
  }

  /**
   * Upload with progress tracking
   */
  async _uploadWithProgress(formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      // Send request
      xhr.open('POST', this.uploadEndpoint);
      xhr.send(formData);
    });
  }

  /**
   * Mock upload for development (simulates upload to S3/IPFS)
   */
  async mockUpload(file, options = {}) {
    const { onProgress = null } = options;

    // Simulate upload progress
    if (onProgress) {
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        onProgress(i);
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Generate mock URL based on storage type
    const storage = options.storage || 'auto';
    let mockUrl;

    switch (storage) {
      case 'ipfs':
        // Mock IPFS hash
        const ipfsHash = 'Qm' + Math.random().toString(36).substring(2, 15);
        mockUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
        break;
      
      case 's3':
        // Mock S3 URL
        mockUrl = `https://dchat-uploads.s3.amazonaws.com/${Date.now()}-${file.name}`;
        break;
      
      default:
        // Mock local URL
        mockUrl = URL.createObjectURL(file);
    }

    return {
      success: true,
      url: mockUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
      storage: storage === 'auto' ? 's3' : storage
    };
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(fileUrl) {
    try {
      const response = await fetch(`${this.uploadEndpoint}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: fileUrl })
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      return { success: true };
    } catch (error) {
      console.error('File deletion failed:', error);
      throw error;
    }
  }

  /**
   * Get file info
   */
  getFileInfo(file) {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      sizeFormatted: this.formatFileSize(file.size)
    };
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Generate thumbnail for image
   */
  async generateThumbnail(file, maxWidth = 200, maxHeight = 200) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File is not an image'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            resolve(blob);
          }, file.type);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// Export singleton instance
const fileUploadService = new FileUploadService();
export default fileUploadService;
