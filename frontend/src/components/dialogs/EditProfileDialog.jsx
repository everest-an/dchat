import { useState, useEffect } from 'react'
import { X, User, Mail, Briefcase, FileText } from 'lucide-react'
import { Button } from '../ui/button'
import { UserProfileService } from '../../services/UserProfileService'
import { useToast } from '../../contexts/ToastContext'

const EditProfileDialog = ({ isOpen, onClose, address, onSave }) => {
  const { success, error } = useToast()
  const [profile, setProfile] = useState({
    username: '',
    bio: '',
    avatar: '👤',
    company: '',
    email: ''
  })

  const avatarOptions = ['👤', '😊', '🎨', '💼', '🚀', '🌟', '🎯', '💡', '🔥', '⚡', 
                         '👨‍💻', '👩‍💻', '🧑‍💼', '👨‍🎨', '👩‍🎨', '🦸', '🦹', '🧙']

  useEffect(() => {
    if (isOpen && address) {
      const existing = UserProfileService.getProfile(address)
      if (existing) {
        setProfile(existing)
      } else {
        setProfile({
          username: UserProfileService.getDefaultUsername(address),
          bio: '',
          avatar: UserProfileService.getDefaultAvatar(address),
          company: '',
          email: ''
        })
      }
    }
  }, [isOpen, address])

  const handleSave = () => {
    if (!profile.username.trim()) {
      error('Error', 'Username is required')
      return
    }

    const saved = UserProfileService.saveProfile(address, profile)
    if (saved) {
      success('Success', 'Profile updated successfully')
      // 触发父组件刷新
      if (onSave) {
        onSave(profile)
      }
      // 触发全局事件以刷新所有组件
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { address, profile } }))
      onClose()
    } else {
      error('Error', 'Failed to save profile')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Avatar Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Avatar
            </label>
            <div className="grid grid-cols-6 gap-2">
              {avatarOptions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setProfile({ ...profile, avatar: emoji })}
                  className={`w-12 h-12 text-2xl rounded-lg border-2 transition-all ${
                    profile.avatar === emoji
                      ? 'border-black bg-gray-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
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
              Wallet Address
            </label>
            <div className="px-4 py-3 bg-gray-50 rounded-lg font-mono text-sm text-gray-600">
              {address}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-black hover:bg-gray-800 text-white"
          >
            Save Profile
          </Button>
        </div>
      </div>
    </div>
  )
}

export default EditProfileDialog
