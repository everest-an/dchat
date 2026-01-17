/**
 * Unified User Service
 * 统一的用户数据服务，确保整个应用中用户头像和名字的一致性
 * 所有组件应该通过此服务获取用户信息
 */

import { UserProfileService } from './UserProfileService'

// 内存缓存
const userCache = new Map()
const CACHE_TTL = 60 * 1000 // 1分钟缓存

// 事件监听器
const listeners = new Set()

class UnifiedUserServiceClass {
  constructor() {
    // 监听 profile 更新事件
    if (typeof window !== 'undefined') {
      window.addEventListener('profileUpdated', (e) => {
        const { address } = e.detail
        if (address) {
          this.invalidateCache(address)
          this.notifyListeners(address)
        }
      })
    }
  }

  /**
   * 获取用户完整信息
   * @param {string} address - 用户钱包地址
   * @returns {Object} 用户信息对象
   */
  getUser(address) {
    if (!address) {
      return this.getDefaultUser()
    }

    const normalizedAddress = address.toLowerCase()
    
    // 检查缓存
    const cached = userCache.get(normalizedAddress)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }

    // 从 UserProfileService 获取数据
    const profile = UserProfileService.getProfile(address)
    const avatarData = UserProfileService.getDisplayAvatar(address)
    const displayName = UserProfileService.getDisplayName(address)

    const userData = {
      address: normalizedAddress,
      displayName,
      username: profile?.username || profile?.name || displayName,
      avatar: this.resolveAvatar(avatarData),
      avatarType: avatarData?.type || 'default',
      avatarData,
      bio: profile?.bio || '',
      company: profile?.company || '',
      title: profile?.title || '',
      skills: profile?.skills || [],
      linkedIn: profile?.linkedIn || null,
      verified: profile?.verified || false,
      updatedAt: profile?.updatedAt || null
    }

    // 更新缓存
    userCache.set(normalizedAddress, {
      data: userData,
      timestamp: Date.now()
    })

    return userData
  }

  /**
   * 解析头像数据为可显示的值
   */
  resolveAvatar(avatarData) {
    if (!avatarData) return '👤'
    
    if (avatarData.type === 'ipfs' && avatarData.url) {
      return avatarData.url
    }
    if (avatarData.type === 'emoji' && avatarData.emoji) {
      return avatarData.emoji
    }
    return avatarData.emoji || '👤'
  }

  /**
   * 获取默认用户信息
   */
  getDefaultUser() {
    return {
      address: '',
      displayName: 'Unknown User',
      username: 'Unknown User',
      avatar: '👤',
      avatarType: 'default',
      avatarData: { type: 'default', emoji: '👤' },
      bio: '',
      company: '',
      title: '',
      skills: [],
      linkedIn: null,
      verified: false,
      updatedAt: null
    }
  }

  /**
   * 批量获取用户信息
   * @param {string[]} addresses - 用户地址数组
   * @returns {Object} 地址到用户信息的映射
   */
  getUsers(addresses) {
    const result = {}
    for (const address of addresses) {
      result[address.toLowerCase()] = this.getUser(address)
    }
    return result
  }

  /**
   * 更新用户信息（会同步到 UserProfileService）
   * @param {string} address - 用户地址
   * @param {Object} updates - 更新的字段
   */
  updateUser(address, updates) {
    if (!address) return false

    const success = UserProfileService.updateProfile(address, updates)
    if (success) {
      this.invalidateCache(address)
      this.notifyListeners(address)
    }
    return success
  }

  /**
   * 更新用户头像
   */
  updateAvatar(address, avatarData) {
    if (!address) return false

    let success
    if (avatarData.type === 'emoji') {
      success = UserProfileService.setEmojiAvatar(address, avatarData.emoji)
    } else if (avatarData.type === 'ipfs') {
      success = UserProfileService.updateAvatar(address, avatarData)
    }

    if (success) {
      this.invalidateCache(address)
      this.notifyListeners(address)
    }
    return success
  }

  /**
   * 使缓存失效
   */
  invalidateCache(address) {
    if (address) {
      userCache.delete(address.toLowerCase())
    }
  }

  /**
   * 清除所有缓存
   */
  clearAllCache() {
    userCache.clear()
  }

  /**
   * 订阅用户数据变化
   * @param {Function} callback - 回调函数，参数为更新的地址
   * @returns {Function} 取消订阅函数
   */
  subscribe(callback) {
    listeners.add(callback)
    return () => listeners.delete(callback)
  }

  /**
   * 通知所有监听器
   */
  notifyListeners(address) {
    listeners.forEach(callback => {
      try {
        callback(address)
      } catch (err) {
        console.error('Error in user data listener:', err)
      }
    })
  }

  /**
   * 获取显示名称（快捷方法）
   */
  getDisplayName(address) {
    return this.getUser(address).displayName
  }

  /**
   * 获取头像（快捷方法）
   */
  getAvatar(address) {
    return this.getUser(address).avatar
  }

  /**
   * 获取头像类型（快捷方法）
   */
  getAvatarType(address) {
    return this.getUser(address).avatarType
  }

  /**
   * 检查是否是图片URL头像
   */
  isImageAvatar(address) {
    const type = this.getAvatarType(address)
    return type === 'ipfs'
  }
}

// 导出单例
export const UnifiedUserService = new UnifiedUserServiceClass()
export default UnifiedUserService
