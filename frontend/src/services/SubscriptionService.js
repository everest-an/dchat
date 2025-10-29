/**
 * 订阅服务
 * 管理用户订阅和功能限制
 */

// 订阅计划
export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
}

// 免费版限制
export const FREE_LIMITS = {
  groupMembers: 10,                    // 群组最多10人
  fileSize: 10 * 1024 * 1024,         // 文件最大10MB
  storage: 100 * 1024 * 1024,         // 总存储100MB
  messages: 1000,                      // 最多保存1000条消息
  groups: 5,                           // 最多5个群组
  contacts: 100,                       // 最多100个联系人
  dailyMessages: 500                   // 每天最多500条消息
}

// Pro版限制
export const PRO_LIMITS = {
  groupMembers: Infinity,
  fileSize: 100 * 1024 * 1024,        // 文件最大100MB
  storage: 10 * 1024 * 1024 * 1024,   // 总存储10GB
  messages: Infinity,
  groups: Infinity,
  contacts: Infinity,
  dailyMessages: Infinity
}

// 企业版限制
export const ENTERPRISE_LIMITS = {
  groupMembers: Infinity,
  fileSize: Infinity,
  storage: Infinity,
  messages: Infinity,
  groups: Infinity,
  contacts: Infinity,
  dailyMessages: Infinity
}

// Pro版功能
export const PRO_FEATURES = [
  'advanced_encryption',   // 高级加密
  'priority_support',      // 优先支持
  'custom_domain',         // 自定义域名
  'api_access',            // API 访问
  'data_export',           // 数据导出
  'backup_restore',        // 备份恢复
  'analytics',             // 数据分析
  'white_label',           // 白标定制
  'message_search',        // 消息搜索
  'voice_call',            // 语音通话
  'video_call'             // 视频通话
]

// 企业版功能
export const ENTERPRISE_FEATURES = [
  ...PRO_FEATURES,
  'private_deployment',    // 私有部署
  'custom_development',    // 定制开发
  'dedicated_support',     // 专属支持
  'sla_guarantee',         // SLA 保证
  'training_service',      // 培训服务
  'audit_logs',            // 审计日志
  'compliance',            // 合规支持
  'integration',           // 企业集成
  'unlimited_users'        // 无限用户
]

class SubscriptionService {
  /**
   * 获取用户订阅计划
   * @param {string} address - 钱包地址
   * @returns {string} 订阅计划
   */
  getUserPlan(address) {
    const stored = localStorage.getItem(`dchat_subscription_${address}`)
    return stored || SUBSCRIPTION_PLANS.FREE
  }

  /**
   * 设置用户订阅计划
   * @param {string} address - 钱包地址
   * @param {string} plan - 订阅计划
   */
  setUserPlan(address, plan) {
    localStorage.setItem(`dchat_subscription_${address}`, plan)
  }

  /**
   * 获取用户限制
   * @param {string} address - 钱包地址
   * @returns {object} 限制对象
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
   * 检查是否有功能权限
   * @param {string} address - 钱包地址
   * @param {string} feature - 功能名称
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
   * 检查群组成员数量限制
   * @param {string} address - 钱包地址
   * @param {number} currentMembers - 当前成员数
   * @returns {boolean}
   */
  canAddGroupMember(address, currentMembers) {
    const limits = this.getUserLimits(address)
    return currentMembers < limits.groupMembers
  }

  /**
   * 检查文件大小限制
   * @param {string} address - 钱包地址
   * @param {number} fileSize - 文件大小(字节)
   * @returns {boolean}
   */
  canUploadFile(address, fileSize) {
    const limits = this.getUserLimits(address)
    return fileSize <= limits.fileSize
  }

  /**
   * 检查存储空间限制
   * @param {string} address - 钱包地址
   * @param {number} additionalSize - 额外需要的空间(字节)
   * @returns {boolean}
   */
  hasStorageSpace(address, additionalSize) {
    const limits = this.getUserLimits(address)
    const used = this.getUsedStorage(address)
    return (used + additionalSize) <= limits.storage
  }

  /**
   * 检查消息数量限制
   * @param {string} address - 钱包地址
   * @returns {boolean}
   */
  canSendMessage(address) {
    const limits = this.getUserLimits(address)
    const count = this.getTodayMessageCount(address)
    return count < limits.dailyMessages
  }

  /**
   * 检查群组数量限制
   * @param {string} address - 钱包地址
   * @param {number} currentGroups - 当前群组数
   * @returns {boolean}
   */
  canCreateGroup(address, currentGroups) {
    const limits = this.getUserLimits(address)
    return currentGroups < limits.groups
  }

  /**
   * 检查联系人数量限制
   * @param {string} address - 钱包地址
   * @param {number} currentContacts - 当前联系人数
   * @returns {boolean}
   */
  canAddContact(address, currentContacts) {
    const limits = this.getUserLimits(address)
    return currentContacts < limits.contacts
  }

  /**
   * 获取已使用的存储空间
   * @param {string} address - 钱包地址
   * @returns {number} 已使用空间(字节)
   */
  getUsedStorage(address) {
    const key = `dchat_storage_used_${address}`
    const stored = localStorage.getItem(key)
    return stored ? parseInt(stored) : 0
  }

  /**
   * 更新已使用的存储空间
   * @param {string} address - 钱包地址
   * @param {number} size - 大小(字节)
   */
  addUsedStorage(address, size) {
    const current = this.getUsedStorage(address)
    const newTotal = current + size
    localStorage.setItem(`dchat_storage_used_${address}`, newTotal.toString())
  }

  /**
   * 获取今天发送的消息数量
   * @param {string} address - 钱包地址
   * @returns {number}
   */
  getTodayMessageCount(address) {
    const today = new Date().toDateString()
    const key = `dchat_messages_count_${address}_${today}`
    const stored = localStorage.getItem(key)
    return stored ? parseInt(stored) : 0
  }

  /**
   * 增加今天的消息计数
   * @param {string} address - 钱包地址
   */
  incrementMessageCount(address) {
    const today = new Date().toDateString()
    const key = `dchat_messages_count_${address}_${today}`
    const current = this.getTodayMessageCount(address)
    localStorage.setItem(key, (current + 1).toString())
  }

  /**
   * 获取订阅状态信息
   * @param {string} address - 钱包地址
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
   * 获取可用功能列表
   * @param {string} address - 钱包地址
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
   * 格式化文件大小
   * @param {number} bytes - 字节数
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
   * 获取升级提示信息
   * @param {string} feature - 功能名称
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
