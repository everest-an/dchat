/**
 * Unified Error Handler
 * 
 * Centralized error handling for the frontend application.
 * Provides consistent error messages, logging, and user notifications.
 */

import { ApiError } from '../services/apiClient'

/**
 * Error type enum
 */
export const ErrorType = {
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  CONTRACT: 'contract',
  IPFS: 'ipfs',
  UNKNOWN: 'unknown'
}

/** Map HTTP status codes to user-friendly messages */
const STATUS_MESSAGES = {
  0: 'Network error. Please check your internet connection.',
  400: 'Invalid request. Please check your input.',
  401: 'Session expired. Please log in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  408: 'Request timed out. Please try again.',
  429: 'Too many requests. Please wait a moment.',
  500: 'Server error. Please try again later.',
  502: 'Server is temporarily unavailable.',
  503: 'Service is under maintenance. Please try again later.',
}

/**
 * Error message mapping (keyword-based fallback)
 */
const errorMessages = {
  // Network errors
  'Failed to fetch': 'Network connection failed. Please check your connection.',
  'Network request failed': 'Network request failed. Please try again.',
  'timeout': 'Request timed out. Please try again.',
  
  // Auth errors
  'Unauthorized': 'Unauthorized access. Please log in.',
  'Token expired': 'Session expired. Please log in again.',
  'Invalid token': 'Invalid credentials. Please log in again.',
  
  // Wallet errors
  'User rejected': 'Transaction rejected by user.',
  'MetaMask not installed': 'Please install MetaMask wallet.',
  'Wrong network': 'Please switch to the correct network.',
  'Insufficient funds': 'Insufficient balance.',
  
  // Contract errors
  'execution reverted': 'Smart contract execution failed.',
  'gas required exceeds allowance': 'Insufficient gas.',
  'nonce too low': 'Transaction nonce error. Please refresh the page.',
  
  // IPFS errors
  'IPFS upload failed': 'IPFS upload failed. Please try again.',
  'IPFS fetch failed': 'IPFS fetch failed. Please try again.',
  
  // Validation errors
  'Invalid address': 'Invalid wallet address.',
  'Invalid email': 'Invalid email address.',
  'Required field': 'This field is required.'
}

/**
 * Parse error from ApiError or any error type into a unified format
 * @param {Error|ApiError|string} error - The error to process
 * @returns {{ message: string, severity: string, shouldLogout: boolean }}
 */
export function parseError(error) {
  if (typeof error === 'string') {
    return { message: error, severity: 'error', shouldLogout: false }
  }
  if (error instanceof ApiError) {
    const shouldLogout = error.status === 401
    const message = error.data?.error || error.data?.message
      || STATUS_MESSAGES[error.status] || error.message || 'An unexpected error occurred.'
    return { message, severity: error.status >= 500 ? 'critical' : 'error', shouldLogout }
  }
  if (error?.code === 4001) {
    return { message: 'Transaction rejected by user.', severity: 'warning', shouldLogout: false }
  }
  if (error?.code === -32002) {
    return { message: 'Please check MetaMask for a pending request.', severity: 'info', shouldLogout: false }
  }
  return { message: getFriendlyErrorMessage(error), severity: 'error', shouldLogout: false }
}

/**
 * Parse error type from error object
 * @param {Error} error
 * @returns {string} Error type
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
 * Get a user-friendly error message
 * @param {Error|string} error
 * @returns {string} Friendly error message
 */
export function getFriendlyErrorMessage(error) {
  if (!error) return 'An unexpected error occurred.'
  
  const errorString = typeof error === 'string' ? error : error.message || error.toString()
  
  // Find matching error message
  for (const [key, message] of Object.entries(errorMessages)) {
    if (errorString.includes(key)) {
      return message
    }
  }
  
  // If no match, return original message (truncated)
  return errorString.length > 100 
    ? errorString.substring(0, 100) + '...' 
    : errorString
}

/**
 * Handle API error response
 * @param {Response} response - Fetch API response object
 * @returns {Promise<never>} Throws error
 */
export async function handleApiError(response) {
  let errorMessage = 'Request failed'
  
  try {
    const data = await response.json()
    errorMessage = data.error || data.message || errorMessage
  } catch (e) {
    // Cannot parse JSON, use status text
    errorMessage = response.statusText || errorMessage
  }
  
  throw new Error(errorMessage)
}

/**
 * Handle contract error
 * @param {Error} error - Contract error object
 * @returns {string} Friendly error message
 */
export function handleContractError(error) {
  if (import.meta.env.DEV) console.error('Contract Error:', error)
  
  if (error.code === 4001) return 'Transaction rejected by user.'
  if (error.code === -32603) return 'Transaction execution failed. Please check parameters and balance.'
  if (error.message?.includes('insufficient funds')) return 'Insufficient balance. Please top up and try again.'
  if (error.message?.includes('gas required exceeds')) return 'Insufficient gas. Please increase Gas Limit.'
  if (error.message?.includes('nonce too low')) return 'Transaction nonce error. Please refresh the page.'
  
  return getFriendlyErrorMessage(error)
}

/**
 * Handle network error
 * @param {Error} error - Network error object
 * @returns {string} Friendly error message
 */
export function handleNetworkError(error) {
  if (import.meta.env.DEV) console.error('Network Error:', error)
  if (error.message === 'Failed to fetch') return 'Network connection failed. Please check your connection.'
  if (error.message?.includes('timeout')) return 'Request timed out. Please check your connection.'
  return 'Network error. Please try again later.'
}

/**
 * Log error to console (dev) and monitoring service (prod)
 * @param {Error} error
 * @param {Object} context - Error context
 */
export function logError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    type: parseErrorType(error),
    timestamp: new Date().toISOString(),
    ...context
  }
  
  if (import.meta.env.DEV) {
    console.error('Error logged:', errorInfo)
  } else if (errorInfo.type === ErrorType.NETWORK || errorInfo.type === ErrorType.CONTRACT) {
    // In production, only log critical errors
    console.error(`[${errorInfo.type}] ${errorInfo.message}`)
  }
}

/**
 * Unified error handler - log, notify user, and handle auth errors
 * @param {Error} error
 * @param {Function} showError - Toast/notification function
 * @param {Object} context - Error context
 */
export function handleError(error, showError, context = {}) {
  logError(error, context)
  const parsed = parseError(error)
  if (showError) showError(parsed.message)
  if (parsed.shouldLogout) {
    console.warn('Authentication error detected, redirecting to login')
  }
}

/**
 * Async function with retry and exponential backoff
 * @param {Function} fn - Async function to execute
 * @param {number} maxRetries - Max retry attempts
 * @param {number} delay - Base delay in ms
 * @returns {Promise} Execution result
 */
export async function withRetry(fn, maxRetries = 3, delay = 1000) {
  let lastError
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (import.meta.env.DEV) console.warn(`Attempt ${i + 1} failed:`, error.message)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }
  }
  
  // All retries exhausted
  throw lastError
}

/**
 * Validate wallet address format
 * @param {string} address
 * @returns {boolean}
 */
export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Validate phone number format
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

export default {
  ErrorType,
  parseError,
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
  isValidPhone,
}
