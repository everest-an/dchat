/**
 * Chat Encrypted File Transfer Component
 * Integrates encrypted file transfer into chat interface
 */

import React, { useState, useRef } from 'react';
import { 
  Paperclip, Lock, Upload, Download, X, 
  File, Image, Video, Music, FileText, 
  Shield, Check, AlertCircle, Loader 
} from 'lucide-react';
import EncryptedFileTransfer from '../services/EncryptedFileTransfer';

const ChatEncryptedFileTransfer = ({ chatId, recipientId, onFileSent }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const transferService = useRef(new EncryptedFileTransfer()).current;

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);

      // Get or create chat encryption key
      const key = await transferService.getOrCreateChatKey(chatId);

      // Encrypt and upload file
      const result = await transferService.encryptAndUpload(
        selectedFile,
        key,
        {
          chatId,
          recipientId,
          onProgress: (progress) => {
            setUploadProgress(progress);
          }
        }
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Notify parent component
      if (onFileSent) {
        onFileSent({
          fileId: result.fileId,
          fileUrl: result.fileUrl,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
          encrypted: true,
          metadata: result.metadata,
          iv: result.iv
        });
      }

      // Reset state
      setSelectedFile(null);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setUploadProgress(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return <File className="w-5 h-5" />;
    
    const ext = fileName.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
      return <Image className="w-5 h-5" />;
    }
    if (['mp4', 'avi', 'mov', 'wmv'].includes(ext)) {
      return <Video className="w-5 h-5" />;
    }
    if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
      return <Music className="w-5 h-5" />;
    }
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
      return <FileText className="w-5 h-5" />;
    }
    return <File className="w-5 h-5" />;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getProgressStage = () => {
    if (!uploadProgress) return '';
    switch (uploadProgress.stage) {
      case 'encrypting':
        return 'Encrypting...';
      case 'uploading':
        return 'Uploading...';
      case 'complete':
        return 'Complete!';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="relative">
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {/* Attach Button */}
      {!selectedFile && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="Attach encrypted file"
        >
          <div className="relative">
            <Paperclip className="w-5 h-5 text-gray-600" />
            <Shield className="w-3 h-3 text-green-600 absolute -top-1 -right-1" />
          </div>
        </button>
      )}

      {/* Selected File Preview */}
      {selectedFile && !uploading && (
        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg p-4 min-w-[300px] border border-gray-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 text-blue-600">
              {getFileIcon(selectedFile.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <Shield className="w-4 h-4 text-green-600" title="Will be encrypted" />
              </div>
              <p className="text-xs text-gray-500">
                {formatBytes(selectedFile.size)} • End-to-end encrypted
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="mt-3 flex items-start space-x-2 text-red-600 bg-red-50 p-2 rounded">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs">{error}</p>
            </div>
          )}

          <div className="mt-3 flex space-x-2">
            <button
              onClick={handleUpload}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>Send Encrypted</span>
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && uploadProgress && (
        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg p-4 min-w-[300px] border border-gray-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {uploadProgress.stage === 'complete' ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Loader className="w-5 h-5 text-blue-600 animate-spin" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">
                  {selectedFile?.name}
                </p>
                <span className="text-xs text-gray-500">
                  {Math.round(uploadProgress.percent)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-2">
                <div
                  className={`h-full transition-all duration-300 ${
                    uploadProgress.stage === 'complete'
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>

              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <Shield className="w-3 h-3 text-green-600" />
                <span>{getProgressStage()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Encrypted File Message Component
export const EncryptedFileMessage = ({ message, chatId, onDownload }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [error, setError] = useState(null);
  const transferService = useRef(new EncryptedFileTransfer()).current;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError(null);

      // Get chat encryption key
      const key = await transferService.getOrCreateChatKey(chatId);

      // Download and decrypt file
      const result = await transferService.downloadAndDecrypt(
        message.fileUrl,
        key,
        message.metadata,
        {
          onProgress: (progress) => {
            setDownloadProgress(progress);
          }
        }
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Download file to device
      transferService.downloadFile(result.file);

      if (onDownload) {
        onDownload(message);
      }
    } catch (error) {
      console.error('Download error:', error);
      setError(error.message);
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return <File className="w-5 h-5" />;
    
    const ext = fileName.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
      return <Image className="w-5 h-5" />;
    }
    if (['mp4', 'avi', 'mov', 'wmv'].includes(ext)) {
      return <Video className="w-5 h-5" />;
    }
    if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
      return <Music className="w-5 h-5" />;
    }
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
      return <FileText className="w-5 h-5" />;
    }
    return <File className="w-5 h-5" />;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="bg-blue-50 rounded-lg p-3 max-w-xs border border-blue-200">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 text-blue-600">
          {getFileIcon(message.fileName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {message.fileName}
            </p>
            <Shield className="w-3 h-3 text-green-600" title="Encrypted" />
          </div>
          <p className="text-xs text-gray-600 mb-2">
            {formatBytes(message.fileSize)} • Encrypted
          </p>

          {error && (
            <div className="mb-2 flex items-start space-x-1 text-red-600 text-xs">
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {downloading && downloadProgress ? (
            <div>
              <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden mb-1">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
              <p className="text-xs text-gray-600">
                {downloadProgress.stage === 'downloading' && 'Downloading...'}
                {downloadProgress.stage === 'decrypting' && 'Decrypting...'}
                {downloadProgress.stage === 'complete' && 'Complete!'}
              </p>
            </div>
          ) : (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatEncryptedFileTransfer;
