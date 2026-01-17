import { useState, useEffect } from 'react'
import { Settings, Edit, Linkedin, Wallet, Shield, Bell, HelpCircle, LogOut, ChevronRight, Github, FileText, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import LinkedInConnect from './LinkedInConnect'
import LinkedInMessages from './LinkedInMessages'
import LanguageSwitcher from './LanguageSwitcher'
import AvatarUpload from './AvatarUpload'
import ProfileEditDialog from './ProfileEditDialog'
import { useLanguage } from '../contexts/LanguageContext'
import { UserProfileService } from '../services/UserProfileService'

const Profile = ({ user, onLogout }) => {
  const { t } = useLanguage()
  const [showWalletAddress, setShowWalletAddress] = useState(false)
  const [linkedInData, setLinkedInData] = useState(null)
  const [showLinkedInMessages, setShowLinkedInMessages] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [avatarData, setAvatarData] = useState(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // Load user profile
  useEffect(() => {
    if (user?.walletAddress) {
      const profile = UserProfileService.getProfile(user.walletAddress)
      setUserProfile(profile)

      const avatar = UserProfileService.getDisplayAvatar(user.walletAddress)
      setAvatarData(avatar)

      console.log('📋 Loaded user profile:', { profile, avatar })
    }
  }, [user?.walletAddress])

  // Handle avatar update
  const handleAvatarUpdate = async (avatarInfo) => {
    if (!user?.walletAddress) return

    console.log('🖼️ Updating avatar:', avatarInfo)

    // savetoUserProfileService
    const success = UserProfileService.updateAvatar(user.walletAddress, avatarInfo)

    if (success) {
      // Update local state
      setAvatarData({
        type: 'ipfs',
        url: avatarInfo.url,
        ipfsHash: avatarInfo.ipfsHash
      })

      // Add to history
      UserProfileService.addAvatarToHistory(user.walletAddress, avatarInfo)

      console.log('✅ Avatar updated successfully')
    } else {
      console.error('❌ Failed to update avatar')
    }
  }

  const menuItems = [
    {
      id: 'notifications',
      label: t('profile.notificationSettings'),
      icon: Bell,
      action: () => console.log('Notification settings')
    },
    {
      id: 'security',
      label: t('profile.securityPrivacy'),
      icon: Shield,
      action: () => console.log('Security settings')
    },
    {
      id: 'wallet',
      label: t('profile.walletManagement'),
      icon: Wallet,
      action: () => console.log('Wallet management')
    },
    {
      id: 'help',
      label: t('profile.helpSupport'),
      icon: HelpCircle,
      action: () => console.log('Help')
    }
  ]

  const projects = [
    {
      id: 1,
      title: 'AI Data Platform',
      status: 'In Progress',
      progress: 65
    },
    {
      id: 2,
      title: 'Blockchain Payment',
      status: 'Design Phase',
      progress: 25
    },
    {
      id: 3,
      title: 'Enterprise App',
      status: 'Completed',
      progress: 100
    }
  ]

  const resources = [
    'Full-Stack Dev Team',
    'Blockchain Expert',
    'AI/ML Engineer',
    'Product Designer'
  ]

  const opportunities = [
    'Seeking mobile app development partnership',
    'Marketing partner needed',
    'Investment opportunities'
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-black">{t('profile.title')}</h1>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* Basic Info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              {/* Avatar with Upload */}
              <div className="mr-4">
                <AvatarUpload
                  currentAvatar={avatarData}
                  onAvatarUpdate={handleAvatarUpdate}
                  userAddress={user?.walletAddress}
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-black">{userProfile?.name || user?.name || user?.email || `User ${user?.walletAddress?.substring(0, 6)}`}</h2>
                <p className="text-gray-600">{userProfile?.company || user?.company || ''}</p>
                <p className="text-sm text-gray-500">{userProfile?.position || user?.position || ''}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              title={t('profile.edit')}
              onClick={() => setShowEditDialog(true)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>

          {/* LinkedIn Integration */}
          <div className="py-3 border-t border-gray-100">
            <LinkedInConnect
              onConnect={setLinkedInData}
              isConnected={linkedInData}
            />
          </div>

          {/* Wallet Address */}
          <div className="flex items-center justify-between py-3 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-700">{t('profile.walletAddress')}</p>
                <p className="text-xs text-gray-500 font-mono">
                  {showWalletAddress
                    ? (user?.walletAddress || '0x1234567890abcdef1234567890abcdef12345678')
                    : `${(user?.walletAddress || '0x0000').substring(0, 6)}...${(user?.walletAddress || '0x0000').substring((user?.walletAddress || '0x0000').length - 4)}`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWalletAddress(!showWalletAddress)}
              className="text-xs"
            >
              {showWalletAddress ? t('profile.hide') : t('profile.show')}
            </Button>
          </div>
        </div>
      </div>

      {/* Current Projects */}
      <div className="px-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-medium text-black mb-3">{t('profile.currentProjects')}</h3>
          <div className="space-y-3">
            {projects.map((project) => (
              <div key={project.id} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-black">{project.title}</span>
                    <span className="text-xs text-gray-500">{project.status}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-black h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-xs text-gray-500 ml-3">{project.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Available Resources */}
      <div className="px-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-medium text-black mb-3">{t('profile.availableResources')}</h3>
          <div className="flex flex-wrap gap-2">
            {resources.map((resource, index) => (
              <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {resource}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Seeking Opportunities */}
      <div className="px-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-medium text-black mb-3">{t('profile.seekingOpportunities')}</h3>
          <div className="space-y-2">
            {opportunities.map((opportunity, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <span className="text-sm text-gray-700">{opportunity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LinkedIn Messages */}
      {linkedInData && (
        <div className="px-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <LinkedInMessages isLinkedInConnected={linkedInData} />
          </div>
        </div>
      )}

      {/* Settings Menu */}
      <div className="px-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={item.action}
                className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-800">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Resources */}
      <div className="px-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <a
            href="https://github.com/everest-an/dchat"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <Github className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-800">GitHub Repository</span>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>
          <a
            href="https://github.com/everest-an/dchat/blob/main/docs/whitepaper/dchat-whitepaper.md"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-800">Whitepaper</span>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>
        </div>
      </div>

      {/* Logout */}
      <div className="px-4 pb-20">
        <Button
          onClick={onLogout}
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5 mr-3" />
          {t('profile.logout')}
        </Button>
      </div>

      {/* Profile Edit Dialog */}
      <ProfileEditDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        userId={user?.id}
        authToken={localStorage.getItem('authToken')}
      />
    </div>
  )
}

export default Profile

