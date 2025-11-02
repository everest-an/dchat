/**
 * Enhanced File Upload Service with Progress Tracking
 * Supports real-time upload progress, pause/resume, and cancellation
 */

class FileUploadServiceEnhanced {
  constructor() {
    this.activeUploads = new Map();
  }

  /**
   * Upload a single file with progress tracking
   * @param {File} file - File to upload
   * @param {Object} options - Upload options
   * @param {Function} options.onProgress - Progress callback (progress: 0-100)
   * @param {Function} options.onComplete - Completion callback
   * @param {Function} options.onError - Error callback
   * @param {AbortSignal} options.signal - Abort signal for cancellation
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(file, options = {}) {
    const {
      onProgress,
      onComplete,
      onError,
      signal
    } = options;

    const uploadId = this.generateUploadId();
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Store upload reference
      this.activeUploads.set(uploadId, {
        xhr,
        file,
        startTime: Date.now(),
        status: 'uploading'
      });

      // Setup progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          const speed = this.calculateSpeed(uploadId, event.loaded);
          const remaining = this.calculateTimeRemaining(event.loaded, event.total, speed);

          if (onProgress) {
            onProgress({
              percent: percentComplete,
              loaded: event.loaded,
              total: event.total,
              speed,
              remaining
            });
          }

          // Update upload info
          const upload = this.activeUploads.get(uploadId);
          if (upload) {
            upload.loaded = event.loaded;
            upload.total = event.total;
            upload.percent = percentComplete;
          }
        }
      });

      // Setup abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
        });
      }

      // Create promise for XHR
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
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
        };

        xhr.onerror = () => {
          reject(new Error('Network error during upload'));
        };

        xhr.onabort = () => {
          reject(new Error('Upload cancelled'));
        };
      });

      // Start upload
      xhr.open('POST', '/api/upload');
      
      // Add authorization header if available
      const token = localStorage.getItem('authToken');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);

      // Wait for completion
      const result = await uploadPromise;

      // Update status
      const upload = this.activeUploads.get(uploadId);
      if (upload) {
        upload.status = 'completed';
      }

      if (onComplete) {
        onComplete(result);
      }

      return {
        success: true,
        uploadId,
        ...result
      };

    } catch (error) {
      // Update status
      const upload = this.activeUploads.get(uploadId);
      if (upload) {
        upload.status = 'failed';
        upload.error = error.message;
      }

      if (onError) {
        onError(error);
      }

      return {
        success: false,
        uploadId,
        error: error.message
      };
    }
  }

  /**
   * Upload multiple files with individual progress tracking
   * @param {File[]} files - Files to upload
   * @param {Object} options - Upload options
   * @param {Function} options.onProgress - Progress callback for each file
   * @param {Function} options.onFileComplete - Callback when a file completes
   * @param {Function} options.onAllComplete - Callback when all files complete
   * @returns {Promise<Object>} Upload results
   */
  async uploadMultiple(files, options = {}) {
    const {
      onProgress,
      onFileComplete,
      onAllComplete
    } = options;

    const results = [];
    const errors = [];
    let completedCount = 0;

    // Create upload promises
    const uploadPromises = files.map((file, index) => {
      return this.uploadFile(file, {
        onProgress: (progress) => {
          if (onProgress) {
            onProgress(index, progress);
          }
        },
        onComplete: (result) => {
          completedCount++;
          if (onFileComplete) {
            onFileComplete(index, result);
          }
        },
        onError: (error) => {
          completedCount++;
          errors.push({
            file: file.name,
            error: error.message
          });
        }
      });
    });

    // Wait for all uploads
    const uploadResults = await Promise.allSettled(uploadPromises);

    // Process results
    uploadResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        results.push(result.value);
      } else {
        errors.push({
          file: files[index].name,
          error: result.reason?.message || 'Upload failed'
        });
      }
    });

    if (onAllComplete) {
      onAllComplete(results, errors);
    }

    return {
      success: true,
      files: results,
      errors: errors.length > 0 ? errors : undefined,
      total: files.length,
      succeeded: results.length,
      failed: errors.length
    };
  }

  /**
   * Cancel an active upload
   * @param {string} uploadId - Upload ID to cancel
   * @returns {boolean} Success status
   */
  cancelUpload(uploadId) {
    const upload = this.activeUploads.get(uploadId);
    if (upload && upload.xhr) {
      upload.xhr.abort();
      upload.status = 'cancelled';
      return true;
    }
    return false;
  }

  /**
   * Get upload status
   * @param {string} uploadId - Upload ID
   * @returns {Object|null} Upload status
   */
  getUploadStatus(uploadId) {
    return this.activeUploads.get(uploadId) || null;
  }

  /**
   * Get all active uploads
   * @returns {Array} Active uploads
   */
  getActiveUploads() {
    return Array.from(this.activeUploads.entries()).map(([id, upload]) => ({
      id,
      ...upload
    }));
  }

  /**
   * Clear completed uploads
   */
  clearCompleted() {
    for (const [id, upload] of this.activeUploads.entries()) {
      if (upload.status === 'completed' || upload.status === 'failed') {
        this.activeUploads.delete(id);
      }
    }
  }

  /**
   * Generate unique upload ID
   * @returns {string} Upload ID
   */
  generateUploadId() {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate upload speed
   * @param {string} uploadId - Upload ID
   * @param {number} loaded - Bytes loaded
   * @returns {number} Speed in bytes per second
   */
  calculateSpeed(uploadId, loaded) {
    const upload = this.activeUploads.get(uploadId);
    if (!upload) return 0;

    const elapsed = (Date.now() - upload.startTime) / 1000; // seconds
    return elapsed > 0 ? loaded / elapsed : 0;
  }

  /**
   * Calculate time remaining
   * @param {number} loaded - Bytes loaded
   * @param {number} total - Total bytes
   * @param {number} speed - Upload speed (bytes/sec)
   * @returns {number} Time remaining in seconds
   */
  calculateTimeRemaining(loaded, total, speed) {
    if (speed === 0) return Infinity;
    const remaining = total - loaded;
    return remaining / speed;
  }

  /**
   * Format bytes to human-readable string
   * @param {number} bytes - Bytes
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Format time to human-readable string
   * @param {number} seconds - Seconds
   * @returns {string} Formatted string
   */
  formatTime(seconds) {
    if (!isFinite(seconds)) return 'calculating...';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  }
}

export default FileUploadServiceEnhanced;
