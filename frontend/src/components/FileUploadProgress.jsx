/**
 * File Upload Progress Component
 * Displays real-time upload progress with visual feedback
 */

import React, { useState, useEffect } from 'react';
import { 
  Upload, X, Check, AlertCircle, Loader, 
  File, Image, Video, Music, FileText, Pause, Play 
} from 'lucide-react';

const FileUploadProgress = ({ uploads, onCancel, onRetry, onClear }) => {
  const [expandedUploads, setExpandedUploads] = useState(new Set());

  const getFileIcon = (fileName) => {
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploading':
        return <Loader className="w-5 h-5 animate-spin text-blue-500" />;
      case 'completed':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <X className="w-5 h-5 text-gray-500" />;
      default:
        return <Upload className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-400';
      default:
        return 'bg-gray-300';
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return 'calculating...';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const formatSpeed = (bytesPerSecond) => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const toggleExpand = (uploadId) => {
    const newExpanded = new Set(expandedUploads);
    if (newExpanded.has(uploadId)) {
      newExpanded.delete(uploadId);
    } else {
      newExpanded.add(uploadId);
    }
    setExpandedUploads(newExpanded);
  };

  if (!uploads || uploads.length === 0) {
    return null;
  }

  const activeUploads = uploads.filter(u => u.status === 'uploading');
  const completedUploads = uploads.filter(u => u.status === 'completed');
  const failedUploads = uploads.filter(u => u.status === 'failed');

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[600px] bg-white rounded-lg shadow-2xl overflow-hidden z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <h3 className="font-semibold">
              Uploads ({uploads.length})
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {completedUploads.length > 0 && (
              <button
                onClick={onClear}
                className="text-white hover:text-blue-100 text-sm transition-colors"
              >
                Clear completed
              </button>
            )}
            <button
              onClick={() => onClear && onClear()}
              className="text-white hover:text-blue-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-2 text-sm text-blue-100">
          {activeUploads.length > 0 && (
            <span>{activeUploads.length} uploading</span>
          )}
          {completedUploads.length > 0 && (
            <span className="ml-2">{completedUploads.length} completed</span>
          )}
          {failedUploads.length > 0 && (
            <span className="ml-2 text-red-200">{failedUploads.length} failed</span>
          )}
        </div>
      </div>

      {/* Upload List */}
      <div className="max-h-[500px] overflow-y-auto">
        {uploads.map((upload) => {
          const isExpanded = expandedUploads.has(upload.id);
          const progress = upload.percent || 0;

          return (
            <div
              key={upload.id}
              className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              {/* Upload Item */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => toggleExpand(upload.id)}
              >
                <div className="flex items-start space-x-3">
                  {/* File Icon */}
                  <div className="flex-shrink-0 text-gray-600">
                    {getFileIcon(upload.file?.name || '')}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {upload.file?.name || 'Unknown file'}
                      </p>
                      {getStatusIcon(upload.status)}
                    </div>

                    {/* Progress Bar */}
                    {upload.status === 'uploading' && (
                      <div className="mb-2">
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${getStatusColor(upload.status)} transition-all duration-300 ease-out`}
                            style={{ width: `${progress}%` }}
                          >
                            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status Info */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {upload.status === 'uploading' && (
                          <>
                            {progress.toFixed(1)}% • {formatBytes(upload.loaded || 0)} / {formatBytes(upload.total || 0)}
                          </>
                        )}
                        {upload.status === 'completed' && (
                          <>Completed • {formatBytes(upload.total || upload.file?.size || 0)}</>
                        )}
                        {upload.status === 'failed' && (
                          <span className="text-red-600">Failed</span>
                        )}
                        {upload.status === 'cancelled' && (
                          <span className="text-gray-600">Cancelled</span>
                        )}
                      </span>

                      {upload.status === 'uploading' && upload.speed && (
                        <span>
                          {formatSpeed(upload.speed)} • {formatTime(upload.remaining)} left
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center space-x-1">
                    {upload.status === 'uploading' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancel && onCancel(upload.id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Cancel upload"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                    {upload.status === 'failed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetry && onRetry(upload.id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Retry upload"
                      >
                        <Upload className="w-4 h-4 text-blue-600" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>File size:</span>
                      <span className="font-medium">{formatBytes(upload.file?.size || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>File type:</span>
                      <span className="font-medium">{upload.file?.type || 'Unknown'}</span>
                    </div>
                    {upload.status === 'uploading' && (
                      <>
                        <div className="flex justify-between">
                          <span>Speed:</span>
                          <span className="font-medium">{formatSpeed(upload.speed || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Time remaining:</span>
                          <span className="font-medium">{formatTime(upload.remaining || 0)}</span>
                        </div>
                      </>
                    )}
                    {upload.status === 'failed' && upload.error && (
                      <div className="text-red-600 mt-2">
                        Error: {upload.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {activeUploads.length > 0 && (
        <div className="bg-gray-50 p-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Uploading {activeUploads.length} file{activeUploads.length !== 1 ? 's' : ''}...
            </span>
            <button
              onClick={() => activeUploads.forEach(u => onCancel && onCancel(u.id))}
              className="text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Cancel all
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Add shimmer animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`;
document.head.appendChild(style);

export default FileUploadProgress;
