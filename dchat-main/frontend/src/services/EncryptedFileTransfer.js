/**
 * Encrypted File Transfer Service
 * Provides end-to-end encryption for file transfers in chat
 * Uses Web Crypto API for encryption/decryption
 */

class EncryptedFileTransfer {
  constructor() {
    this.algorithm = {
      name: 'AES-GCM',
      length: 256
    };
    this.keyCache = new Map();
  }

  /**
   * Generate a new encryption key
   * @returns {Promise<CryptoKey>} Generated key
   */
  async generateKey() {
    return await window.crypto.subtle.generateKey(
      this.algorithm,
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Export key to raw format
   * @param {CryptoKey} key - Key to export
   * @returns {Promise<ArrayBuffer>} Exported key
   */
  async exportKey(key) {
    return await window.crypto.subtle.exportKey('raw', key);
  }

  /**
   * Import key from raw format
   * @param {ArrayBuffer} keyData - Raw key data
   * @returns {Promise<CryptoKey>} Imported key
   */
  async importKey(keyData) {
    return await window.crypto.subtle.importKey(
      'raw',
      keyData,
      this.algorithm,
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt a file
   * @param {File} file - File to encrypt
   * @param {CryptoKey} key - Encryption key
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Encrypted file data
   */
  async encryptFile(file, key, onProgress) {
    try {
      // Read file as ArrayBuffer
      const fileData = await this.readFileAsArrayBuffer(file, onProgress);

      // Generate IV (Initialization Vector)
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Encrypt file data
      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        fileData
      );

      // Create metadata
      const metadata = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        encryptedSize: encryptedData.byteLength,
        timestamp: Date.now()
      };

      // Combine IV + encrypted data
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedData), iv.length);

      return {
        success: true,
        encryptedData: combined,
        metadata,
        iv: this.arrayBufferToBase64(iv)
      };
    } catch (error) {
      console.error('Encryption error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Decrypt a file
   * @param {ArrayBuffer} encryptedData - Encrypted file data
   * @param {CryptoKey} key - Decryption key
   * @param {Object} metadata - File metadata
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Decrypted file
   */
  async decryptFile(encryptedData, key, metadata, onProgress) {
    try {
      // Extract IV and encrypted data
      const combined = new Uint8Array(encryptedData);
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      // Decrypt data
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        data
      );

      // Create File object
      const file = new File(
        [decryptedData],
        metadata.fileName,
        { type: metadata.fileType }
      );

      if (onProgress) {
        onProgress(100);
      }

      return {
        success: true,
        file,
        metadata
      };
    } catch (error) {
      console.error('Decryption error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Encrypt and upload file
   * @param {File} file - File to encrypt and upload
   * @param {CryptoKey} key - Encryption key
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async encryptAndUpload(file, key, options = {}) {
    const { onProgress, chatId, recipientId } = options;

    try {
      // Encrypt file
      if (onProgress) onProgress({ stage: 'encrypting', percent: 0 });
      
      const encryptResult = await this.encryptFile(file, key, (percent) => {
        if (onProgress) {
          onProgress({ stage: 'encrypting', percent: percent * 0.5 });
        }
      });

      if (!encryptResult.success) {
        throw new Error(encryptResult.error);
      }

      // Create blob from encrypted data
      const encryptedBlob = new Blob([encryptResult.encryptedData]);
      const encryptedFile = new File(
        [encryptedBlob],
        `${file.name}.encrypted`,
        { type: 'application/octet-stream' }
      );

      // Upload encrypted file
      if (onProgress) onProgress({ stage: 'uploading', percent: 50 });

      const formData = new FormData();
      formData.append('file', encryptedFile);
      formData.append('metadata', JSON.stringify({
        ...encryptResult.metadata,
        encrypted: true,
        chatId,
        recipientId
      }));

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      const uploadResult = await response.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      if (onProgress) onProgress({ stage: 'complete', percent: 100 });

      return {
        success: true,
        fileId: uploadResult.file.filename,
        fileUrl: uploadResult.file.url,
        metadata: encryptResult.metadata,
        iv: encryptResult.iv
      };
    } catch (error) {
      console.error('Encrypt and upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Download and decrypt file
   * @param {string} fileUrl - URL of encrypted file
   * @param {CryptoKey} key - Decryption key
   * @param {Object} metadata - File metadata
   * @param {Object} options - Download options
   * @returns {Promise<Object>} Decrypted file
   */
  async downloadAndDecrypt(fileUrl, key, metadata, options = {}) {
    const { onProgress } = options;

    try {
      // Download encrypted file
      if (onProgress) onProgress({ stage: 'downloading', percent: 0 });

      const response = await fetch(fileUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const encryptedData = await response.arrayBuffer();

      if (onProgress) onProgress({ stage: 'downloading', percent: 50 });

      // Decrypt file
      if (onProgress) onProgress({ stage: 'decrypting', percent: 50 });

      const decryptResult = await this.decryptFile(
        encryptedData,
        key,
        metadata,
        (percent) => {
          if (onProgress) {
            onProgress({ stage: 'decrypting', percent: 50 + percent * 0.5 });
          }
        }
      );

      if (!decryptResult.success) {
        throw new Error(decryptResult.error);
      }

      if (onProgress) onProgress({ stage: 'complete', percent: 100 });

      return {
        success: true,
        file: decryptResult.file
      };
    } catch (error) {
      console.error('Download and decrypt error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate shared key for chat
   * @param {string} chatId - Chat ID
   * @returns {Promise<CryptoKey>} Shared key
   */
  async getOrCreateChatKey(chatId) {
    // Check cache
    if (this.keyCache.has(chatId)) {
      return this.keyCache.get(chatId);
    }

    // Try to load from storage
    const storedKey = localStorage.getItem(`chat_key_${chatId}`);
    if (storedKey) {
      const keyData = this.base64ToArrayBuffer(storedKey);
      const key = await this.importKey(keyData);
      this.keyCache.set(chatId, key);
      return key;
    }

    // Generate new key
    const key = await this.generateKey();
    const keyData = await this.exportKey(key);
    const keyBase64 = this.arrayBufferToBase64(keyData);
    
    // Store key
    localStorage.setItem(`chat_key_${chatId}`, keyBase64);
    this.keyCache.set(chatId, key);

    return key;
  }

  /**
   * Read file as ArrayBuffer with progress
   * @param {File} file - File to read
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<ArrayBuffer>} File data
   */
  readFileAsArrayBuffer(file, onProgress) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = (event.loaded / event.total) * 100;
          onProgress(percent);
        }
      };

      reader.onload = () => {
        resolve(reader.result);
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Convert ArrayBuffer to Base64
   * @param {ArrayBuffer} buffer - Buffer to convert
   * @returns {string} Base64 string
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   * @param {string} base64 - Base64 string
   * @returns {ArrayBuffer} Buffer
   */
  base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Download decrypted file to user's device
   * @param {File} file - File to download
   */
  downloadFile(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Clear key cache
   */
  clearKeyCache() {
    this.keyCache.clear();
  }

  /**
   * Remove chat key
   * @param {string} chatId - Chat ID
   */
  removeChatKey(chatId) {
    this.keyCache.delete(chatId);
    localStorage.removeItem(`chat_key_${chatId}`);
  }
}

export default EncryptedFileTransfer;
