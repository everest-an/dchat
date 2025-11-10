import React, { useState, useRef } from 'react';
import { X, Image, FileText, Briefcase, TrendingUp, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import fileUploadService from '../services/FileUploadService';

/**
 * Create Moment Dialog Component
 * Allows users to create and publish new moments/posts
 */
const CreateMomentDialog = ({ isOpen, onClose, onPublish, currentUser }) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState('general');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const momentTypes = [
    { value: 'general', label: 'General Update', icon: <FileText className="w-4 h-4" />, color: 'gray' },
    { value: 'project_update', label: 'Project Update', icon: <Briefcase className="w-4 h-4" />, color: 'blue' },
    { value: 'industry_insights', label: 'Industry Insights', icon: <TrendingUp className="w-4 h-4" />, color: 'green' },
    { value: 'networking', label: 'Business Cooperation', icon: <Users className="w-4 h-4" />, color: 'purple' }
  ];

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 9) {
      alert('Maximum 9 images allowed');
      return;
    }

    // Create preview URLs and validate
    const newImages = [];
    for (const file of files) {
      const validation = fileUploadService.validateFile(file, 'image');
      if (!validation.valid) {
        alert(`${file.name}: ${validation.errors.join(', ')}`);
        continue;
      }

      newImages.push({
        file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substr(2, 9),
        uploading: false,
        uploaded: false,
        url: null
      });
    }

    setImages([...images, ...newImages]);
  };

  const handleRemoveImage = (imageId) => {
    const image = images.find(img => img.id === imageId);
    if (image) {
      URL.revokeObjectURL(image.preview);
    }
    setImages(images.filter(img => img.id !== imageId));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      alert('Please enter some content');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images first
      const uploadedImageUrls = [];
      
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        // Update image status
        setImages(prev => prev.map((img, idx) => 
          idx === i ? { ...img, uploading: true } : img
        ));

        try {
          // Use mock upload for development
          const result = await fileUploadService.mockUpload(image.file, {
            storage: 'auto',
            onProgress: (progress) => {
              console.log(`Uploading image ${i + 1}/${images.length}: ${progress}%`);
            }
          });

          uploadedImageUrls.push(result.url);
          
          // Update image status
          setImages(prev => prev.map((img, idx) => 
            idx === i ? { ...img, uploading: false, uploaded: true, url: result.url } : img
          ));
        } catch (error) {
          console.error(`Failed to upload image ${i + 1}:`, error);
          // Continue with other images
        }
      }

      // Create post with uploaded image URLs
      const newPost = {
        id: Date.now(),
        user: currentUser || {
          name: 'Current User',
          company: 'Your Company',
          avatar: '👤'
        },
        content: content.trim(),
        type,
        images: uploadedImageUrls,
        timestamp: 'Just now',
        likes: 0,
        comments: 0,
        liked: false
      };

      onPublish(newPost);
      handleClose();
    } catch (error) {
      console.error('Failed to publish moment:', error);
      alert('Failed to publish moment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Clean up preview URLs
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setContent('');
    setType('general');
    setImages([]);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-black">Create Moment</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* User Info */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-2xl">
              {currentUser?.avatar || '👤'}
            </div>
            <div>
              <div className="font-semibold text-black">{currentUser?.name || 'Current User'}</div>
              <div className="text-sm text-gray-500">{currentUser?.company || 'Your Company'}</div>
            </div>
          </div>

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Post Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {momentTypes.map((momentType) => (
                <button
                  key={momentType.value}
                  onClick={() => setType(momentType.value)}
                  disabled={isSubmitting}
                  className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all ${
                    type === momentType.value
                      ? `border-${momentType.color}-500 bg-${momentType.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`${type === momentType.value ? `text-${momentType.color}-600` : 'text-gray-600'}`}>
                    {momentType.icon}
                  </div>
                  <span className={`text-sm font-medium ${
                    type === momentType.value ? `text-${momentType.color}-700` : 'text-gray-700'
                  }`}>
                    {momentType.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What's on your mind?
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
              placeholder="Share your thoughts, updates, or insights..."
              rows={6}
              maxLength={2000}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-500">
                {content.length}/2000 characters
              </span>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Images (Optional)
            </label>
            
            {/* Image Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-3">
                {images.map((image) => (
                  <div key={image.id} className="relative aspect-square">
                    <img
                      src={image.preview}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleRemoveImage(image.id)}
                      disabled={isSubmitting}
                      className="absolute top-2 right-2 p-1 bg-black bg-opacity-70 hover:bg-opacity-90 rounded-full transition-all"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {images.length < 9 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-700"
              >
                <Image className="w-5 h-5" />
                <span className="font-medium">
                  {images.length === 0 ? 'Add Images' : `Add More (${images.length}/9)`}
                </span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Tips for Great Posts:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Be authentic and share valuable insights</li>
              <li>• Use clear and concise language</li>
              <li>• Add relevant images to increase engagement</li>
              <li>• Choose the appropriate post type for better reach</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={handleClose}
            disabled={isSubmitting}
            variant="outline"
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
            className="px-8 bg-black text-white hover:bg-gray-800"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              'Publish'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateMomentDialog;
