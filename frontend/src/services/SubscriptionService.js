/**
 * TODO: Translate '订阅服务'
 * TODO: Translate '管理用户订阅和功能限制'
 */

// TODO: Translate '订阅计划'
export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
}

// TODO: Translate '免费版限制'
export const FREE_LIMITS = {
  groupMembers: 10,                    // TODO: Translate '群组最多'10TODO: Translate '人'
  fileSize: 10 * 1024 * 1024,         // TODO: Translate '文件最大'10MB
  storage: 100 * 1024 * 1024,         // TODO: Translate '总存储'100MB
  messages: 1000,                      // TODO: Translate '最多保存'1000TODO: Translate '条消息'
  groups: 5,                           // TODO: Translate '最多'5TODO: Translate '个群组'
  contacts: 100,                       // TODO: Translate '最多'100TODO: Translate '个联系人'
  dailyMessages: 500                   // TODO: Translate '每天最多'500TODO: Translate '条消息'
}

// ProTODO: Translate '版限制'
export const PRO_LIMITS = {
  groupMembers: Infinity,
  fileSize: 100 * 1024 * 1024,        // TODO: Translate '文件最大'100MB
  storage: 10 * 1024 * 1024 * 1024,   // TODO: Translate '总存储'10GB
  messages: Infinity,
  groups: Infinity,
  contacts: Infinity,
  dailyMessages: Infinity
}

// TODO: Translate '企业版限制'
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
  'advanced_encryption',   // TODO: Translate '高级加密'
  'priority_support',      // TODO: Translate '优先支持'
  'custom_domain',         // TODO: Translate '自定义域名'
  'api_access',            // API TODO: Translate '访问'
  'data_export',           // TODO: Translate '数据导出'
  'backup_restore',        // TODO: Translate '备份恢复'
  'analytics',             // TODO: Translate '数据分析'
  'white_label',           // TODO: Translate '白标定制'
  'message_search',        // TODO: Translate '消息搜索'
  'voice_call',            // TODO: Translate '语音通话'
  'video_call'             // TODO: Translate '视频通话'
]

// TODO: Translate '企业版功能'
export const ENTERPRISE_FEATURES = [
  ...PRO_FEATURES,
  'private_deployment',    // TODO: Translate '私有部署'
  'custom_development',    // TODO: Translate '定制开发'
  'dedicated_support',     // TODO: Translate '专属支持'
  'sla_guarantee',         // SLA TODO: Translate '保证'
  'training_service',      // TODO: Translate '培训服务'
  'audit_logs',            // TODO: Translate '审计日志'
  'compliance',            // TODO: Translate '合规支持'
  'integration',           // TODO: Translate '企业集成'
  'unlimited_users'        // TODO: Translate '无限用户'
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
