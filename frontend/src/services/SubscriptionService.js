/**
 * TODO: Translate '订阅服务'
 * TODO: Translate '管理用户订阅和功能限制'
 */
export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
}
export const FREE_LIMITS = {
  groupMembers: 10,
  fileSize: 10 * 1024 * 1024,
  storage: 100 * 1024 * 1024,
  messages: 1000,
  groups: 5,
  contacts: 100,
  dailyMessages: 500
}

// ProTODO: Translate '版限制'
export const PRO_LIMITS = {
  groupMembers: Infinity,
  fileSize: 100 * 1024 * 1024,
  storage: 10 * 1024 * 1024 * 1024,
  messages: Infinity,
  groups: Infinity,
  contacts: Infinity,
  dailyMessages: Infinity
}
export const ENTERPRISE_LIMITS = {
  groupMembers: Infinity,
  fileSize: Infinity,
  storage: Infinity,
  messages: Infinity,
  groups: Infinity,
  contacts: Infinity,
  dailyMessages: Infinity
}

// ProTODO: Translate '版功能'
export const PRO_FEATURES = [
  'advanced_encryption',
  'priority_support',
  'custom_domain',
  'api_access',            // API TODO: Translate '访问'
  'data_export',
  'backup_restore',
  'analytics',
  'white_label',
  'message_search',
  'voice_call',
  'video_call'
]
export const ENTERPRISE_FEATURES = [
  ...PRO_FEATURES,
  'private_deployment',
  'custom_development',
  'dedicated_support',
  'sla_guarantee',         // SLA TODO: Translate '保证'
  'training_service',
  'audit_logs',
  'compliance',
  'integration',
  'unlimited_users'
]

class SubscriptionService {
  /**
   * TODO: Translate '获取用户订阅计划'
   * @param {string} address - TODO: Translate '钱包地址'
   * @returns {string} TODO: Translate '订阅计划'
   */
  getUserPlan(address) {
    const stored = localStorage.getItem(`dchat_subscription_${address}`)
    return stored || SUBSCRIPTION_PLANS.FREE
  }

  /**
   * TODO: Translate '设置用户订阅计划'
   * @param {string} address - TODO: Translate '钱包地址'
   * @param {string} plan - TODO: Translate '订阅计划'
   */
  setUserPlan(address, plan) {
    localStorage.setItem(`dchat_subscription_${address}`, plan)
  }

  /**
   * TODO: Translate '获取用户限制'
   * @param {string} address - TODO: Translate '钱包地址'
   * @returns {object} TODO: Translate '限制对象'
   */
  getUserLimits(address) {
    const plan = this.getUserPlan(address)
    switch (plan) {
      case SUBSCRIPTION_PLANS.PRO:
        return PRO_LIMITS
      case SUBSCRIPTION_PLANS.ENTERPRISE:
        return ENTERPRISE_LIMITS
      default:
        return FREE_LIMITS
    }
  }

  /**
   * TODO: Translate '检查是否有功能权限'
   * @param {string} address - TODO: Translate '钱包地址'
   * @param {string} feature - TODO: Translate '功能名称'
   * @returns {boolean}
   */
  hasFeature(address, feature) {
    const plan = this.getUserPlan(address)
    
    if (plan === SUBSCRIPTION_PLANS.ENTERPRISE) {
      return ENTERPRISE_FEATURES.includes(feature)
    }
    
    if (plan === SUBSCRIPTION_PLANS.PRO) {
      return PRO_FEATURES.includes(feature)
    }
    
    return false
  }

  /**
   * TODO: Translate '检查群组成员数量限制'
   * @param {string} address - TODO: Translate '钱包地址'
   * @param {number} currentMembers - TODO: Translate '当前成员数'
   * @returns {boolean}
   */
  canAddGroupMember(address, currentMembers) {
    const limits = this.getUserLimits(address)
    return currentMembers < limits.groupMembers
  }

  /**
   * TODO: Translate '检查文件大小限制'
   * @param {string} address - TODO: Translate '钱包地址'
   * @param {number} fileSize - TODO: Translate '文件大小'(TODO: Translate '字节')
   * @returns {boolean}
   */
  canUploadFile(address, fileSize) {
    const limits = this.getUserLimits(address)
    return fileSize <= limits.fileSize
  }

  /**
   * TODO: Translate '检查存储空间限制'
   * @param {string} address - TODO: Translate '钱包地址'
   * @param {number} additionalSize - TODO: Translate '额外需要的空间'(TODO: Translate '字节')
   * @returns {boolean}
   */
  hasStorageSpace(address, additionalSize) {
    const limits = this.getUserLimits(address)
    const used = this.getUsedStorage(address)
    return (used + additionalSize) <= limits.storage
  }

  /**
   * TODO: Translate '检查消息数量限制'
   * @param {string} address - TODO: Translate '钱包地址'
   * @returns {boolean}
   */
  canSendMessage(address) {
    const limits = this.getUserLimits(address)
    const count = this.getTodayMessageCount(address)
    return count < limits.dailyMessages
  }

  /**
   * TODO: Translate '检查群组数量限制'
   * @param {string} address - TODO: Translate '钱包地址'
   * @param {number} currentGroups - TODO: Translate '当前群组数'
   * @returns {boolean}
   */
  canCreateGroup(address, currentGroups) {
    const limits = this.getUserLimits(address)
    return currentGroups < limits.groups
  }

  /**
   * TODO: Translate '检查联系人数量限制'
   * @param {string} address - TODO: Translate '钱包地址'
   * @param {number} currentContacts - TODO: Translate '当前联系人数'
   * @returns {boolean}
   */
  canAddContact(address, currentContacts) {
    const limits = this.getUserLimits(address)
    return currentContacts < limits.contacts
  }

  /**
   * TODO: Translate '获取已使用的存储空间'
   * @param {string} address - TODO: Translate '钱包地址'
   * @returns {number} TODO: Translate '已使用空间'(TODO: Translate '字节')
   */
  getUsedStorage(address) {
    const key = `dchat_storage_used_${address}`
    const stored = localStorage.getItem(key)
    return stored ? parseInt(stored) : 0
  }

  /**
   * TODO: Translate '更新已使用的存储空间'
   * @param {string} address - TODO: Translate '钱包地址'
   * @param {number} size - TODO: Translate '大小'(TODO: Translate '字节')
   */
  addUsedStorage(address, size) {
    const current = this.getUsedStorage(address)
    const newTotal = current + size
    localStorage.setItem(`dchat_storage_used_${address}`, newTotal.toString())
  }

  /**
   * TODO: Translate '获取今天发送的消息数量'
   * @param {string} address - TODO: Translate '钱包地址'
   * @returns {number}
   */
  getTodayMessageCount(address) {
    const today = new Date().toDateString()
    const key = `dchat_messages_count_${address}_${today}`
    const stored = localStorage.getItem(key)
    return stored ? parseInt(stored) : 0
  }

  /**
   * TODO: Translate '增加今天的消息计数'
   * @param {string} address - TODO: Translate '钱包地址'
   */
  incrementMessageCount(address) {
    const today = new Date().toDateString()
    const key = `dchat_messages_count_${address}_${today}`
    const current = this.getTodayMessageCount(address)
    localStorage.setItem(key, (current + 1).toString())
  }

  /**
   * TODO: Translate '获取订阅状态信息'
   * @param {string} address - TODO: Translate '钱包地址'
   * @returns {object}
   */
  getSubscriptionInfo(address) {
    const plan = this.getUserPlan(address)
    const limits = this.getUserLimits(address)
    const used = {
      storage: this.getUsedStorage(address),
      todayMessages: this.getTodayMessageCount(address)
    }

    return {
      plan,
      limits,
      used,
      features: this.getAvailableFeatures(address)
    }
  }

  /**
   * TODO: Translate '获取可用功能列表'
   * @param {string} address - TODO: Translate '钱包地址'
   * @returns {array}
   */
  getAvailableFeatures(address) {
    const plan = this.getUserPlan(address)
    
    if (plan === SUBSCRIPTION_PLANS.ENTERPRISE) {
      return ENTERPRISE_FEATURES
    }
    
    if (plan === SUBSCRIPTION_PLANS.PRO) {
      return PRO_FEATURES
    }
    
    return []
  }

  /**
   * TODO: Translate '格式化文件大小'
   * @param {number} bytes - TODO: Translate '字节数'
   * @returns {string}
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    if (bytes === Infinity) return 'Unlimited'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * TODO: Translate '获取升级提示信息'
   * @param {string} feature - TODO: Translate '功能名称'
   * @returns {object}
   */
  getUpgradeMessage(feature) {
    const messages = {
      advanced_encryption: {
        title: 'Advanced Encryption',
        description: 'Upgrade to Pro for advanced end-to-end encryption',
        plan: SUBSCRIPTION_PLANS.PRO
      },
      message_search: {
        title: 'Message Search',
        description: 'Upgrade to Pro to search through your message history',
        plan: SUBSCRIPTION_PLANS.PRO
      },
      voice_call: {
        title: 'Voice Calls',
        description: 'Upgrade to Pro to make voice calls',
        plan: SUBSCRIPTION_PLANS.PRO
      },
      video_call: {
        title: 'Video Calls',
        description: 'Upgrade to Pro to make video calls',
        plan: SUBSCRIPTION_PLANS.PRO
      },
      private_deployment: {
        title: 'Private Deployment',
        description: 'Upgrade to Enterprise for private deployment options',
        plan: SUBSCRIPTION_PLANS.ENTERPRISE
      }
    }

    return messages[feature] || {
      title: 'Premium Feature',
      description: 'Upgrade to unlock this feature',
      plan: SUBSCRIPTION_PLANS.PRO
    }
  }
}

export const subscriptionService = new SubscriptionService()
