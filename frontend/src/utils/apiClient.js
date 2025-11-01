/**
 * API客户端工具
 * 提供统一的API请求接口，包含认证、错误处理、重试等功能
 */

import { handleApiError, withRetry } from './errorHandler'

// API基础URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://dchat.pro/api'

// 默认请求配置
const DEFAULT_CONFIG = {
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30秒超时
}

/**
 * 获取认证token
 * @returns {string|null} JWT token
 */
function getAuthToken() {
  return localStorage.getItem('authToken')
}

/**
 * 设置认证token
 * @param {string} token - JWT token
 */
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('authToken', token)
  } else {
    localStorage.removeItem('authToken')
  }
}

/**
 * 创建带超时的fetch请求
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_CONFIG.timeout) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('请求超时')
    }
    throw error
  }
}

/**
 * 发送API请求
 * @param {string} endpoint - API端点（相对路径）
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} 响应数据
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  
  // 合并默认配置
  const config = {
    ...DEFAULT_CONFIG,
    ...options,
    headers: {
      ...DEFAULT_CONFIG.headers,
      ...options.headers
    }
  }
  
  // 添加认证token
  const token = getAuthToken()
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  
  try {
    const response = await fetchWithTimeout(url, config)
    
    // 检查响应状态
    if (!response.ok) {
      await handleApiError(response)
    }
    
    // 解析JSON响应
    const data = await response.json()
    return data
  } catch (error) {
    console.error('API Request Error:', error)
    throw error
  }
}

/**
 * GET请求
 * @param {string} endpoint - API端点
 * @param {Object} params - 查询参数
 * @param {Object} options - 额外选项
 * @returns {Promise<Object>}
 */
export async function get(endpoint, params = {}, options = {}) {
  // 构建查询字符串
  const queryString = new URLSearchParams(params).toString()
  const url = queryString ? `${endpoint}?${queryString}` : endpoint
  
  return request(url, {
    method: 'GET',
    ...options
  })
}

/**
 * POST请求
 * @param {string} endpoint - API端点
 * @param {Object} data - 请求数据
 * @param {Object} options - 额外选项
 * @returns {Promise<Object>}
 */
export async function post(endpoint, data = {}, options = {}) {
  return request(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options
  })
}

/**
 * PUT请求
 * @param {string} endpoint - API端点
 * @param {Object} data - 请求数据
 * @param {Object} options - 额外选项
 * @returns {Promise<Object>}
 */
export async function put(endpoint, data = {}, options = {}) {
  return request(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options
  })
}

/**
 * DELETE请求
 * @param {string} endpoint - API端点
 * @param {Object} options - 额外选项
 * @returns {Promise<Object>}
 */
export async function del(endpoint, options = {}) {
  return request(endpoint, {
    method: 'DELETE',
    ...options
  })
}

/**
 * 上传文件
 * @param {string} endpoint - API端点
 * @param {File} file - 文件对象
 * @param {Object} additionalData - 额外数据
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Object>}
 */
export async function uploadFile(endpoint, file, additionalData = {}, onProgress = null) {
  const formData = new FormData()
  formData.append('file', file)
  
  // 添加额外数据
  Object.keys(additionalData).forEach(key => {
    formData.append(key, additionalData[key])
  })
  
  const url = `${API_BASE_URL}${endpoint}`
  const token = getAuthToken()
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    
    // 监听上传进度
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100
          onProgress(percentComplete)
        }
      })
    }
    
    // 监听完成
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve(response)
        } catch (error) {
          reject(new Error('无法解析响应'))
        }
      } else {
        reject(new Error(`上传失败: ${xhr.statusText}`))
      }
    })
    
    // 监听错误
    xhr.addEventListener('error', () => {
      reject(new Error('上传失败'))
    })
    
    // 监听超时
    xhr.addEventListener('timeout', () => {
      reject(new Error('上传超时'))
    })
    
    xhr.open('POST', url)
    
    // 设置认证头
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }
    
    xhr.timeout = 60000 // 60秒超时（文件上传需要更长时间）
    xhr.send(formData)
  })
}

/**
 * 带重试的API请求
 * @param {Function} requestFn - 请求函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} delay - 重试延迟
 * @returns {Promise<Object>}
 */
export async function requestWithRetry(requestFn, maxRetries = 3, delay = 1000) {
  return withRetry(requestFn, maxRetries, delay)
}

// API端点定义
export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    CONNECT_WALLET: '/auth/connect-wallet',
    VERIFY_TOKEN: '/auth/verify-token',
    UPDATE_PROFILE: '/auth/update-profile',
    REFRESH_TOKEN: '/auth/refresh-token'
  },
  
  // 用户相关
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    GET: (id) => `/users/${id}`,
    UPDATE: (id) => `/users/${id}`,
    DELETE: (id) => `/users/${id}`,
    PROFILE: '/users/profile',
    AVATAR: '/users/avatar'
  },
  
  // 消息相关
  MESSAGES: {
    CONVERSATIONS: '/messages/conversations',
    GET_CONVERSATION: (userId) => `/messages/conversations/${userId}`,
    SEND: '/messages/send',
    MARK_READ: '/messages/read',
    ENCRYPT: '/messages/encrypt',
    DECRYPT: '/messages/decrypt'
  },
  
  // 群组相关
  GROUPS: {
    CREATE: '/groups/create',
    LIST: '/groups/list',
    GET: (id) => `/groups/${id}`,
    MESSAGES: (id) => `/groups/${id}/messages`,
    SEND_MESSAGE: (id) => `/groups/${id}/messages`,
    ADD_MEMBER: (id) => `/groups/${id}/members`,
    REMOVE_MEMBER: (id, memberId) => `/groups/${id}/members/${memberId}`
  },
  
  // 通知相关
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: (id) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
    DELETE: (id) => `/notifications/${id}`,
    CLEAR: '/notifications/clear'
  },
  
  // 项目相关
  PROJECTS: {
    LIST: '/projects',
    CREATE: '/projects',
    GET: (id) => `/projects/${id}`,
    UPDATE: (id) => `/projects/${id}`,
    DELETE: (id) => `/projects/${id}`
  },
  
  // 健康检查
  HEALTH: '/health',
  DOCS: '/docs'
}

export default {
  get,
  post,
  put,
  del,
  uploadFile,
  requestWithRetry,
  setAuthToken,
  API_ENDPOINTS
}
