/**
 * 错误处理工具
 * 统一处理前端错误，提供友好的错误提示
 */

/**
 * 错误类型枚举
 */
export const ErrorType = {
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  CONTRACT: 'contract',
  IPFS: 'ipfs',
  UNKNOWN: 'unknown'
}

/**
 * 错误消息映射
 */
const errorMessages = {
  // 网络错误
  'Failed to fetch': '网络连接失败，请检查您的网络连接',
  'Network request failed': '网络请求失败，请稍后重试',
  'timeout': '请求超时，请稍后重试',
  
  // 认证错误
  'Unauthorized': '未授权访问，请先登录',
  'Token expired': '登录已过期，请重新登录',
  'Invalid token': '无效的登录凭证，请重新登录',
  
  // 钱包错误
  'User rejected': '用户拒绝了操作',
  'MetaMask not installed': '请先安装 MetaMask 钱包',
  'Wrong network': '请切换到正确的网络',
  'Insufficient funds': '余额不足',
  
  // 合约错误
  'execution reverted': '智能合约执行失败',
  'gas required exceeds allowance': 'Gas 费用不足',
  'nonce too low': '交易序号错误，请刷新页面',
  
  // IPFS错误
  'IPFS upload failed': 'IPFS 上传失败，请稍后重试',
  'IPFS fetch failed': 'IPFS 获取失败，请稍后重试',
  
  // 验证错误
  'Invalid address': '无效的钱包地址',
  'Invalid email': '无效的邮箱地址',
  'Required field': '该字段为必填项'
}

/**
 * 解析错误类型
 * @param {Error} error - 错误对象
 * @returns {string} 错误类型
 */
export function parseErrorType(error) {
  if (!error) return ErrorType.UNKNOWN
  
  const errorString = error.toString().toLowerCase()
  
  if (errorString.includes('network') || errorString.includes('fetch')) {
    return ErrorType.NETWORK
  }
  
  if (errorString.includes('unauthorized') || errorString.includes('token')) {
    return ErrorType.AUTH
  }
  
  if (errorString.includes('invalid') || errorString.includes('required')) {
    return ErrorType.VALIDATION
  }
  
  if (errorString.includes('contract') || errorString.includes('revert') || errorString.includes('gas')) {
    return ErrorType.CONTRACT
  }
  
  if (errorString.includes('ipfs')) {
    return ErrorType.IPFS
  }
  
  return ErrorType.UNKNOWN
}

/**
 * 获取友好的错误消息
 * @param {Error|string} error - 错误对象或错误消息
 * @returns {string} 友好的错误消息
 */
export function getFriendlyErrorMessage(error) {
  if (!error) return '发生未知错误'
  
  const errorString = typeof error === 'string' ? error : error.message || error.toString()
  
  // 查找匹配的错误消息
  for (const [key, message] of Object.entries(errorMessages)) {
    if (errorString.includes(key)) {
      return message
    }
  }
  
  // 如果没有匹配的，返回原始错误消息（但限制长度）
  return errorString.length > 100 
    ? errorString.substring(0, 100) + '...' 
    : errorString
}

/**
 * 处理API错误响应
 * @param {Response} response - Fetch API 响应对象
 * @returns {Promise<never>} 抛出错误
 */
export async function handleApiError(response) {
  let errorMessage = '请求失败'
  
  try {
    const data = await response.json()
    errorMessage = data.error || data.message || errorMessage
  } catch (e) {
    // 无法解析JSON，使用状态文本
    errorMessage = response.statusText || errorMessage
  }
  
  throw new Error(errorMessage)
}

/**
 * 处理合约错误
 * @param {Error} error - 合约错误对象
 * @returns {string} 友好的错误消息
 */
export function handleContractError(error) {
  console.error('Contract Error:', error)
  
  if (error.code === 4001) {
    return '您取消了交易'
  }
  
  if (error.code === -32603) {
    return '交易执行失败，请检查参数和余额'
  }
  
  if (error.message?.includes('insufficient funds')) {
    return '余额不足，请充值后重试'
  }
  
  if (error.message?.includes('gas required exceeds')) {
    return 'Gas 费用不足，请增加 Gas Limit'
  }
  
  if (error.message?.includes('nonce too low')) {
    return '交易序号错误，请刷新页面后重试'
  }
  
  return getFriendlyErrorMessage(error)
}

/**
 * 处理网络错误
 * @param {Error} error - 网络错误对象
 * @returns {string} 友好的错误消息
 */
export function handleNetworkError(error) {
  console.error('Network Error:', error)
  
  if (error.message === 'Failed to fetch') {
    return '网络连接失败，请检查您的网络连接'
  }
  
  if (error.message?.includes('timeout')) {
    return '请求超时，请检查网络连接后重试'
  }
  
  return '网络错误，请稍后重试'
}

/**
 * 日志错误到控制台（开发环境）和错误监控服务（生产环境）
 * @param {Error} error - 错误对象
 * @param {Object} context - 错误上下文信息
 */
export function logError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    type: parseErrorType(error),
    timestamp: new Date().toISOString(),
    ...context
  }
  
  // 开发环境：输出到控制台
  if (import.meta.env.DEV) {
    console.error('Error logged:', errorInfo)
  }
  
  // 生产环境：发送到错误监控服务（如Sentry）
  if (import.meta.env.PROD) {
    // TODO: 集成Sentry或其他错误监控服务
    // Sentry.captureException(error, { extra: context })
  }
}

/**
 * 错误边界处理函数
 * @param {Error} error - 错误对象
 * @param {Function} showError - 显示错误的函数（如toast）
 * @param {Object} context - 错误上下文
 */
export function handleError(error, showError, context = {}) {
  // 记录错误
  logError(error, context)
  
  // 获取友好的错误消息
  const friendlyMessage = getFriendlyErrorMessage(error)
  
  // 显示错误提示
  if (showError) {
    showError(friendlyMessage)
  }
  
  // 根据错误类型执行特定操作
  const errorType = parseErrorType(error)
  
  if (errorType === ErrorType.AUTH) {
    // 认证错误：可能需要重新登录
    // 可以在这里触发登出或跳转到登录页
    console.warn('Authentication error detected, user may need to re-login')
  }
}

/**
 * 创建带重试的异步函数
 * @param {Function} fn - 要执行的异步函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} delay - 重试延迟（毫秒）
 * @returns {Promise} 执行结果
 */
export async function withRetry(fn, maxRetries = 3, delay = 1000) {
  let lastError
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      console.warn(`Attempt ${i + 1} failed:`, error.message)
      
      if (i < maxRetries - 1) {
        // 不是最后一次重试，等待后继续
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
      }
    }
  }
  
  // 所有重试都失败了
  throw lastError
}

/**
 * 验证钱包地址格式
 * @param {string} address - 钱包地址
 * @returns {boolean} 是否有效
 */
export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否有效
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * 验证手机号格式（中国大陆）
 * @param {string} phone - 手机号
 * @returns {boolean} 是否有效
 */
export function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

export default {
  ErrorType,
  parseErrorType,
  getFriendlyErrorMessage,
  handleApiError,
  handleContractError,
  handleNetworkError,
  handleError,
  logError,
  withRetry,
  isValidAddress,
  isValidEmail,
  isValidPhone
}
