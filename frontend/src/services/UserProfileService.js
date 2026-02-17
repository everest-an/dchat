/**
 * TODO: Translate '用户资料服务'
 * TODO: Translate '管理用户资料的本地存储和检索'
 * TODO: Translate '支持'IPFSTODO: Translate '头像存储'
 */

const STORAGE_KEY = 'dchat_user_profiles'

export class UserProfileService {
  /**
   * TODO: Translate '获取用户资料'
   */
  static getProfile(address) {
    if (!address) return null
    
    const profiles = this.getAllProfiles()
    return profiles[address.toLowerCase()] || null
  }

  /**
   * TODO: Translate '保存用户资料'
   */
  static saveProfile(address, profile) {
    if (!address) return false
    
    const profiles = this.getAllProfiles()
    profiles[address.toLowerCase()] = {
      ...profile,
      address: address.toLowerCase(),
      updatedAt: Date.now()
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
    
    // Also update in contacts list if needed
    const contactsKey = 'dchat_contacts'
    const contacts = JSON.parse(localStorage.getItem(contactsKey) || '[]')
    
    if (!contacts.includes(address.toLowerCase())) {
      contacts.push(address.toLowerCase())
      localStorage.setItem(contactsKey, JSON.stringify(contacts))
    }

    // Add to pending sync queue if offline
    if (!navigator.onLine) {
      const syncQueue = JSON.parse(localStorage.getItem('dchat_sync_queue') || '[]')
      syncQueue.push({
        type: 'add_contact',
        address: address,
        profile: profile,
        timestamp: Date.now()
      })
      localStorage.setItem('dchat_sync_queue', JSON.stringify(syncQueue))
    }
    
    console.log('✅ Profile saved:', {
      address: address.toLowerCase(),
      hasAvatar: !!profile.avatar,
      avatarType: profile.avatar?.ipfsHash ? 'IPFS' : profile.avatar?.emoji ? 'Emoji' : 'None'
    })
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('profileUpdated', { 
      detail: { address } 
    }))
    
    return true
  }

  /**
   * TODO: Translate '更新用户头像'
   * @param {string} address - TODO: Translate '用户地址'
   * @param {Object} avatarData - TODO: Translate '头像数据'
   * @param {string} avatarData.ipfsHash - IPFSTODO: Translate '哈希'
   * @param {string} avatarData.url - Gateway URL
   * @param {string} avatarData.fileName - TODO: Translate '文件名'
   * @param {number} avatarData.fileSize - TODO: Translate '文件大小'
   * @param {number} avatarData.uploadedAt - TODO: Translate '上传时间'
   */
  static updateAvatar(address, avatarData) {
    if (!address) return false
    
    const profile = this.getProfile(address) || {}
    
    profile.avatar = {
      type: 'ipfs',
      ipfsHash: avatarData.ipfsHash,
      url: avatarData.url,
      fileName: avatarData.fileName,
      fileSize: avatarData.fileSize,
      uploadedAt: avatarData.uploadedAt
    }
    
    return this.saveProfile(address, profile)
  }

  /**
   * settingsEmojiTODO: Translate '头像'
   */
  static setEmojiAvatar(address, emoji) {
    if (!address) return false
    
    const profile = this.getProfile(address) || {}
    
    profile.avatar = {
      type: 'emoji',
      emoji: emoji
    }
    
    return this.saveProfile(address, profile)
  }

  /**
   * TODO: Translate '获取所有资料'
   */
  static getAllProfiles() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : {}
    } catch (err) {
      console.error('Error loading profiles:', err)
      return {}
    }
  }

  /**
   * TODO: Translate '生成默认头像'
   */
  static getDefaultAvatar(address) {
    if (!address) return '👤'
    
    const avatars = ['👤', '😊', '🎨', '💼', '🚀', '🌟', '🎯', '💡', '🔥', '⚡']
    const index = parseInt(address.slice(2, 4), 16) % avatars.length
    return avatars[index]
  }

  /**
   * TODO: Translate '生成默认用户名'
   */
  static getDefaultUsername(address) {
    if (!address) return 'Unknown User'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  /**
   * TODO: Translate '获取显示名称'
   */
  static getDisplayName(address) {
    const profile = this.getProfile(address)
    return profile?.username || profile?.name || this.getDefaultUsername(address)
  }

  /**
   * TODO: Translate '获取显示头像'
   * @returns {Object} - { type: 'ipfs'|'emoji'|'default', url?: string, emoji?: string }
   */
  static getDisplayAvatar(address) {
    const profile = this.getProfile(address)
    
    if (profile?.avatar) {
      if (profile.avatar.type === 'ipfs' && profile.avatar.url) {
        return {
          type: 'ipfs',
          url: profile.avatar.url,
          ipfsHash: profile.avatar.ipfsHash
        }
      } else if (profile.avatar.type === 'emoji' && profile.avatar.emoji) {
        return {
          type: 'emoji',
          emoji: profile.avatar.emoji
        }
      }
    }
    return {
      type: 'default',
      emoji: this.getDefaultAvatar(address)
    }
  }

  /**
   * TODO: Translate '更新用户资料字段'
   */
  static updateProfileField(address, field, value) {
    if (!address) return false
    
    const profile = this.getProfile(address) || {}
    profile[field] = value
    
    return this.saveProfile(address, profile)
  }

  /**
   * TODO: Translate '批量更新用户资料'
   */
  static updateProfile(address, updates) {
    if (!address) return false
    
    const profile = this.getProfile(address) || {}
    const updatedProfile = {
      ...profile,
      ...updates
    }
    
    return this.saveProfile(address, updatedProfile)
  }

  /**
   * TODO: Translate '删除用户头像'
   */
  static removeAvatar(address) {
    if (!address) return false
    
    const profile = this.getProfile(address)
    if (!profile) return false
    
    delete profile.avatar
    
    return this.saveProfile(address, profile)
  }

  /**
   * TODO: Translate '获取头像历史'
   */
  static getAvatarHistory(address) {
    const profile = this.getProfile(address)
    return profile?.avatarHistory || []
  }

  /**
   * TODO: Translate '添加头像到历史记录'
   */
  static addAvatarToHistory(address, avatarData) {
    if (!address) return false
    
    const profile = this.getProfile(address) || {}
    
    if (!profile.avatarHistory) {
      profile.avatarHistory = []
    }
    if (profile.avatarHistory.length >= 10) {
      profile.avatarHistory.shift()
    }
    
    profile.avatarHistory.push({
      ...avatarData,
      timestamp: Date.now()
    })
    
    return this.saveProfile(address, profile)
  }

  /**
   * TODO: Translate '导出用户资料'
   */
  static exportProfile(address) {
    const profile = this.getProfile(address)
    if (!profile) return null
    
    return JSON.stringify(profile, null, 2)
  }

  /**
   * TODO: Translate '导入用户资料'
   */
  static importProfile(address, profileJson) {
    try {
      const profile = JSON.parse(profileJson)
      return this.saveProfile(address, profile)
    } catch (err) {
      console.error('Error importing profile:', err)
      return false
    }
  }
}
