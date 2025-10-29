/**
 * 用户资料服务
 * 管理用户资料的本地存储和检索
 */

const STORAGE_KEY = 'dchat_user_profiles'

export class UserProfileService {
  /**
   * 获取用户资料
   */
  static getProfile(address) {
    if (!address) return null
    
    const profiles = this.getAllProfiles()
    return profiles[address.toLowerCase()] || null
  }

  /**
   * 保存用户资料
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
    return true
  }

  /**
   * 获取所有资料
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
   * 生成默认头像
   */
  static getDefaultAvatar(address) {
    if (!address) return '👤'
    
    const avatars = ['👤', '😊', '🎨', '💼', '🚀', '🌟', '🎯', '💡', '🔥', '⚡']
    const index = parseInt(address.slice(2, 4), 16) % avatars.length
    return avatars[index]
  }

  /**
   * 生成默认用户名
   */
  static getDefaultUsername(address) {
    if (!address) return 'Unknown User'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  /**
   * 获取显示名称
   */
  static getDisplayName(address) {
    const profile = this.getProfile(address)
    return profile?.username || this.getDefaultUsername(address)
  }

  /**
   * 获取显示头像
   */
  static getDisplayAvatar(address) {
    const profile = this.getProfile(address)
    return profile?.avatar || this.getDefaultAvatar(address)
  }
}
