import { useState, useRef } from 'react'
import { Camera, Upload, X, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ipfsService from '../services/IPFSService'
import { useLanguage } from '../contexts/LanguageContext'

/**

 */
const AvatarUpload = ({ currentAvatar, onAvatarUpdate }) => {
  const { t } = useLanguage()
  const fileInputRef = useRef(null)
  
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const MAX_FILE_SIZE = 5 * 1024 * 1024
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

  /**
   * TODO: Translate '处理文件选择'
   */
  const handleFileSelect = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('avatar.invalidType'))
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(t('avatar.fileTooLarge'))
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target.result)
      setSelectedFile(file)
      setShowUploadDialog(true)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  /**
   * TODO: Translate '上传头像到'IPFS
   */
  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      console.log('📤 Uploading avatar to IPFS...', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      })
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)
      const ipfsHash = await ipfsService.uploadFile(selectedFile)
      
      clearInterval(progressInterval)
      setUploadProgress(100)

      console.log('✅ Avatar uploaded to IPFS:', ipfsHash)
      const avatarUrl = ipfsService.getGatewayUrl(ipfsHash)
      if (onAvatarUpdate) {
        await onAvatarUpdate({
          ipfsHash,
          url: avatarUrl,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          uploadedAt: Date.now()
        })
      }
      setTimeout(() => {
        setShowUploadDialog(false)
        setPreviewUrl(null)
        setSelectedFile(null)
        setIsUploading(false)
        setUploadProgress(0)
      }, 1000)

    } catch (err) {
      console.error('❌ Failed to upload avatar:', err)
      setError(err.message || t('avatar.uploadError'))
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  /**
   * TODO: Translate '取消上传'
   */
  const handleCancel = () => {
    setShowUploadDialog(false)
    setPreviewUrl(null)
    setSelectedFile(null)
    setError(null)
    setIsUploading(false)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  /**
   * TODO: Translate '触发文件选择'
   */
  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  /**
   * TODO: Translate '渲染当前头像'
   */
  const renderCurrentAvatar = () => {
    if (currentAvatar?.url) {
      return (
        <img 
          src={currentAvatar.url} 
          alt="Avatar" 
          className="w-full h-full object-cover"
        />
      )
    } else if (currentAvatar?.emoji) {
      return (
        <span className="text-4xl">{currentAvatar.emoji}</span>
      )
    } else {
      return (
        <span className="text-4xl">👨‍💼</span>
      )
    }
  }

  return (
    <>
      <div className="relative inline-block">
        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-300">
          {renderCurrentAvatar()}
        </div>
        <button
          onClick={triggerFileSelect}
          className="absolute bottom-0 right-0 w-8 h-8 bg-black hover:bg-gray-800 rounded-full flex items-center justify-center text-white shadow-lg transition-colors"
          title={t('avatar.upload')}
        >
          <Camera className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">{t('avatar.uploadTitle')}</h3>
              <button
                onClick={handleCancel}
                disabled={isUploading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-6">
              <div className="w-48 h-48 mx-auto rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt={t('avatar.preview')}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="w-16 h-16 text-gray-400" />
                )}
              </div>
            </div>
            {selectedFile && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700 truncate font-medium">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}
            {isUploading && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{t('avatar.uploading')}</span>
                  <span className="text-sm font-medium text-black">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-black h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            {!isUploading && !error && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600">
                  {t('avatar.ipfsInfo')}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isUploading}
                className="flex-1 border-gray-300 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isUploading || !selectedFile}
                className="flex-1 bg-black hover:bg-gray-800 text-white"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('common.uploading')}
                  </>
                ) : uploadProgress === 100 ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {t('avatar.done')}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {t('common.upload')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AvatarUpload
