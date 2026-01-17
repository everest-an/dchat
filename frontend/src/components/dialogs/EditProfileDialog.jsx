import { useState, useEffect } from 'react'
import { X, User, Mail, Briefcase, FileText } from 'lucide-react'
import { Button } from '../ui/button'
import AvatarUpload from '../AvatarUpload'
import { UserProfileService } from '../../services/UserProfileService'
import { useToast } from '../../contexts/ToastContext'
import { useLanguage } from '../../contexts/LanguageContext'

const EditProfileDialog = ({ isOpen, onClose, address, onSave }) => {
  const { t } = useLanguage()
  const { success, error } = useToast()
  const [profile, setProfile] = useState({
    username: '',
    bio: '',
    avatar: null,
    company: '',
    email: ''
  })
  const [avatarData, setAvatarData] = useState(null)

  const avatarOptions = ['👤', '😊', '🎨', '💼', '🚀', '🌟', '🎯', '💡', '🔥', '⚡', 
                         '👨‍💻', '👩‍💻', '🧑‍💼', '👨‍🎨', '👩‍🎨', '🦸', '🦹', '🧙']

  useEffect(() => {
    if (isOpen && address) {
      const existing = UserProfileService.getProfile(address)
      if (existing) {
        setProfile(existing)
        setAvatarData(UserProfileService.getDisplayAvatar(address))
      } else {
        const defaultAvatar = UserProfileService.getDefaultAvatar(address)
        setProfile({
          username: UserProfileService.getDefaultUsername(address),
          bio: '',
          avatar: {
            type: 'emoji',
            emoji: defaultAvatar
          },
          company: '',
          email: ''
        })
        setAvatarData({
          type: 'emoji',
          emoji: defaultAvatar
        })
      }
    }
  }, [isOpen, address])

  /**
   * TODO: Translate '处理'AvatarTODO: Translate '上传'
   */
  const handleAvatarUpdate = async (avatarInfo) => {
    console.log('🖼️ Avatar updated in dialog:', avatarInfo)
    
    // TODO: Translate '更新本地状态'
    const newAvatar = {
      type: 'ipfs',
      ipfsHash: avatarInfo.ipfsHash,
      url: avatarInfo.url,
      fileName: avatarInfo.fileName,
      fileSize: avatarInfo.fileSize,
      uploadedAt: avatarInfo.uploadedAt
    }
    
    setProfile({ ...profile, avatar: newAvatar })
    setAvatarData(newAvatar)
    
    // TODO: Translate '立即保存到'UserProfileService
    UserProfileService.updateAvatar(address, avatarInfo)
    
    success(t('avatar.uploadSuccess'), t('avatar.uploadSuccess'))
  }

  /**
   * TODO: Translate '选择'EmojiTODO: Translate '头像'
   */
  const handleEmojiSelect = (emoji) => {
    const newAvatar = {
      type: 'emoji',
      emoji: emoji
    }
    setProfile({ ...profile, avatar: newAvatar })
    setAvatarData(newAvatar)
  }

  const handleSave = () => {
    if (!profile.username.trim()) {
      error(t('common.error'), 'Username is required')
      return
    }

    const saved = UserProfileService.saveProfile(address, profile)
    if (saved) {
      success(t('common.success'), 'Profile updated successfully')
      // TODO: Translate '触发父组件刷新'
      if (onSave) {
        onSave(profile)
      }
      // TODO: Translate '触发全局事件以刷新所有组件'
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { address, profile } }))
      onClose()
    } else {
      error(t('common.error'), 'Failed to save profile')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{t('profile.edit')}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Avatar Upload with IPFS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('avatar.upload')}
            </label>
            <div className="flex items-center justify-center mb-4">
              <AvatarUpload
                currentAvatar={avatarData}
                onAvatarUpdate={handleAvatarUpdate}
                userAddress={address}
              />
            </div>
            
            {/* Emoji Avatar Options */}
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Or choose an emoji avatar:</p>
              <div className="grid grid-cols-6 gap-2">
                {avatarOptions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiSelect(emoji)}
                    className={`w-12 h-12 text-2xl rounded-lg border-2 transition-all ${
                      avatarData?.type === 'emoji' && avatarData?.emoji === emoji
                        ? 'border-black bg-gray-100'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Username
            </label>
            <input
              type="text"
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              placeholder="Enter your username"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              maxLength={50}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Bio
            </label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {profile.bio.length}/200 characters
            </p>
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Briefcase className="w-4 h-4 inline mr-1" />
              Company (Optional)
            </label>
            <input
              type="text"
              value={profile.company}
              onChange={(e) => setProfile({ ...profile, company: e.target.value })}
              placeholder="Your company name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              maxLength={50}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email (Optional)
            </label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Wallet Address (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.walletAddress')}
            </label>
            <div className="px-4 py-3 bg-gray-50 rounded-lg font-mono text-sm text-gray-600 break-all">
              {address}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-gray-300 hover:bg-gray-50"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-black hover:bg-gray-800 text-white"
          >
            {t('common.save')} {t('profile.title')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default EditProfileDialog
