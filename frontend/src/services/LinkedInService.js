/**
 * LinkedIn OAuth服务
 * 处理LinkedIn登录、资料同步等功能
 */

import { get, post, API_ENDPOINTS } from '@/utils/apiClient'
import { handleError } from '@/utils/errorHandler'

class LinkedInService {
  /**
   * 获取LinkedIn授权URL
   * @returns {Promise<string>} 授权URL
   */
  async getAuthUrl() {
    try {
      const response = await get('/linkedin/auth/url')
      
      if (response.success) {
        return {
          url: response.auth_url,
          state: response.state
        }
      }
      
      throw new Error(response.error || '获取授权URL失败')
    } catch (error) {
      handleError(error, null, { context: 'getAuthUrl' })
      throw error
    }
  }
  
  /**
   * 启动LinkedIn OAuth流程
   * @returns {Promise<void>}
   */
  async initiateLogin() {
    try {
      const { url, state } = await this.getAuthUrl()
      
      // 保存state到localStorage用于验证
      localStorage.setItem('linkedin_oauth_state', state)
      
      // 重定向到LinkedIn授权页面
      window.location.href = url
    } catch (error) {
      console.error('LinkedIn login failed:', error)
      throw error
    }
  }
  
  /**
   * 处理OAuth回调
   * @param {string} code - 授权码
   * @param {string} state - 状态参数
   * @returns {Promise<Object>} 用户信息和token
   */
  async handleCallback(code, state) {
    try {
      // 验证state
      const savedState = localStorage.getItem('linkedin_oauth_state')
      
      if (state !== savedState) {
        throw new Error('State参数不匹配，可能存在安全风险')
      }
      
      // 清除保存的state
      localStorage.removeItem('linkedin_oauth_state')
      
      // 后端会处理token交换，这里只需要从URL获取token
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')
      
      if (!token) {
        throw new Error('未获取到认证token')
      }
      
      return { token }
    } catch (error) {
      handleError(error, null, { context: 'handleCallback' })
      throw error
    }
  }
  
  /**
   * 获取LinkedIn资料
   * @returns {Promise<Object>} LinkedIn资料
   */
  async getProfile() {
    try {
      const response = await get('/linkedin/profile')
      
      if (response.success) {
        return response.profile
      }
      
      throw new Error(response.error || '获取资料失败')
    } catch (error) {
      handleError(error, null, { context: 'getProfile' })
      throw error
    }
  }
  
  /**
   * 同步LinkedIn资料
   * @returns {Promise<Object>} 同步结果
   */
  async syncProfile() {
    try {
      const response = await post('/linkedin/sync')
      
      if (response.success) {
        return response
      }
      
      // 如果需要重新授权
      if (response.auth_required) {
        throw new Error('需要重新授权LinkedIn')
      }
      
      throw new Error(response.error || '同步失败')
    } catch (error) {
      handleError(error, null, { context: 'syncProfile' })
      throw error
    }
  }
  
  /**
   * 解除LinkedIn绑定
   * @returns {Promise<void>}
   */
  async unlinkAccount() {
    try {
      const response = await post('/linkedin/unlink')
      
      if (response.success) {
        return
      }
      
      throw new Error(response.error || '解除绑定失败')
    } catch (error) {
      handleError(error, null, { context: 'unlinkAccount' })
      throw error
    }
  }
  
  /**
   * 检查是否已绑定LinkedIn
   * @returns {Promise<boolean>}
   */
  async isLinked() {
    try {
      const profile = await this.getProfile()
      return profile.is_linked
    } catch (error) {
      console.error('Check LinkedIn link status failed:', error)
      return false
    }
  }
  
  /**
   * 从公司邮箱验证公司信息
   * @param {string} email - 公司邮箱
   * @returns {Promise<Object>} 验证结果
   */
  async verifyCompanyEmail(email) {
    try {
      // 提取域名
      const domain = email.split('@')[1]
      
      if (!domain) {
        throw new Error('无效的邮箱地址')
      }
      
      // 这里可以调用后端API验证公司域名
      // 简化实现：只验证格式
      const isValid = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)
      
      return {
        valid: isValid,
        domain: domain,
        company: domain.split('.')[0] // 简化的公司名提取
      }
    } catch (error) {
      handleError(error, null, { context: 'verifyCompanyEmail' })
      throw error
    }
  }
}

// 创建单例
const linkedInService = new LinkedInService()

export default linkedInService

// 导出类以便测试
export { LinkedInService }
