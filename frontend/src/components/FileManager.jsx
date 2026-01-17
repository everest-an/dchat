/**
 * File Manager Component
 * Manages uploaded files with preview, delete, and download
 */

import React, { useState, useEffect } from 'react';
import { 
  File, Image, Video, Music, FileText, 
  Trash2, Download, Eye, Upload, Loader, 
  CheckCircle, XCircle, Search, Filter 
} from 'lucide-react';
import FileUploadService from '../services/FileUploadService';

const FileManager = ({ onSelectFile = null }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, image, document, video, audio
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with actual API call
      // const response = await fetch('/api/upload/list');
      // const data = await response.json();
      
      // Mock data for now
      const mockFiles = [
        {
          filename: 'example1.jpg',
          url: '/uploads/example1.jpg',
          size: 1024000,
          type: 'image/jpeg',
          category: 'image',
          uploadedAt: new Date().toISOString()
        }
      ];
      
      setFiles(mockFiles);
    } catch (error) {
      console.error('Failed to load files:', error);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    try {
      setUploading(true);
      setError(null);

      const results = await FileUploadService.uploadMultiple(files, {
        onProgress: (progress) => {
          console.log('Upload progress:', progress);
        }
      });

      if (results.success) {
        // Reload files list
        await loadFiles();
      } else {
        setError(`Upload failed: ${results.errors.map(e => e.error).join(', ')}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename, storage) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/upload/${filename}?storage=${storage}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        // Remove from list
        setFiles(files.filter(f => f.filename !== filename));
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError(error.message);
    }
  };

  const handleSelect = (filename) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filename)) {
      newSelected.delete(filename);
    } else {
      newSelected.add(filename);
    }
    setSelectedFiles(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;
    
    if (!confirm(`Delete ${selectedFiles.size} selected files?`)) {
      return;
    }

    for (const filename of selectedFiles) {
      const file = files.find(f => f.filename === filename);
      if (file) {
        await handleDelete(filename, file.storage || 'local');
      }
    }

    setSelectedFiles(new Set());
  };

  const getFileIcon = (type, category) => {
    if (type?.startsWith('image/') || category === 'image') {
      return <Image className="w-6 h-6" />;
    } else if (type?.startsWith('video/') || category === 'video') {
      return <Video className="w-6 h-6" />;
    } else if (type?.startsWith('audio/') || category === 'audio') {
      return <Music className="w-6 h-6" />;
    } else if (type?.includes('pdf') || type?.includes('document')) {
      return <FileText className="w-6 h-6" />;
    } else {
      return <File className="w-6 h-6" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const filteredFiles = files.filter(file => {
    // Filter by category
    if (filter !== 'all' && file.category !== filter) {
      return false;
    }

    // Filter by search query
    if (searchQuery && !file.filename.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <h2 className="text-2xl font-bold">File Manager</h2>
          <p className="text-blue-100 text-sm mt-1">
            Manage your uploaded files
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Upload Button */}
            <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center space-x-2 cursor-pointer transition-colors">
              <Upload className="w-5 h-5" />
              <span>{uploading ? 'Uploading...' : 'Upload Files'}</span>
              <input
                type="file"
                multiple
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>

            {/* Search and Filter */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Files</option>
                <option value="image">Images</option>
                <option value="document">Documents</option>
                <option value="video">Videos</option>
                <option value="audio">Audio</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedFiles.size > 0 && (
            <div className="mt-4 flex items-center justify-between bg-blue-50 p-3 rounded-lg">
              <span className="text-blue-700 font-medium">
                {selectedFiles.size} file(s) selected
              </span>
              <button
                onClick={handleBulkDelete}
                className="text-red-600 hover:text-red-700 px-4 py-2 rounded-lg border border-red-300 hover:border-red-400 inline-flex items-center space-x-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Selected</span>
              </button>
            </div>
          )}
        </div>

        {/* Files Grid */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading files...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No files found</p>
              <p className="text-gray-400 text-sm mt-1">
                Upload some files to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.filename}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                    selectedFiles.has(file.filename) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  {/* Checkbox */}
                  <div className="flex items-start justify-between mb-3">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.filename)}
                      onChange={() => handleSelect(file.filename)}
                      className="mt-1"
                    />
                    <div className="flex items-center space-x-2">
                      {getFileIcon(file.type, file.category)}
                    </div>
                  </div>

                  {/* Preview */}
                  {file.thumbnailUrl || (file.type?.startsWith('image/') && file.url) ? (
                    <img
                      src={file.thumbnailUrl || file.url}
                      alt={file.filename}
                      className="w-full h-32 object-cover rounded mb-3"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded mb-3 flex items-center justify-center">
                      {getFileIcon(file.type, file.category)}
                    </div>
                  )}

                  {/* File Info */}
                  <div className="mb-3">
                    <p className="font-medium text-gray-900 truncate" title={file.filename}>
                      {file.filename}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatFileSize(file.size)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => window.open(file.url, '_blank')}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm inline-flex items-center justify-center space-x-1 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => handleDelete(file.filename, file.storage || 'local')}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded text-sm inline-flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Total: {filteredFiles.length} file(s)
            {filter !== 'all' && ` (filtered by ${filter})`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileManager;
