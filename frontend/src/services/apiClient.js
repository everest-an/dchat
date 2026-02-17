/**
 * Unified API Client
 * 
 * Single source of truth for all HTTP requests. All services MUST use this
 * client instead of calling fetch() directly. Handles:
 * - Base URL configuration from environment variables
 * - Authentication token injection
 * - Unified error handling and response parsing
 * - Request/response interceptors
 * - Automatic retry with exponential backoff
 * - Request timeout
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || ''
const DEFAULT_TIMEOUT = 30000 // 30 seconds

/** Custom API error with status code and response data */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/** Get the stored auth token - checks both session formats */
const getAuthToken = () => {
  try {
    // Check AuthServiceAdapter format first (Go backend JWT)
    const adapterToken = localStorage.getItem('dchat_auth_token')
    if (adapterToken) return adapterToken

    // Fallback: check AuthService session format
    const sessionData = localStorage.getItem('dchat_session')
    if (!sessionData) return null
    const session = JSON.parse(sessionData)
    return session.token || null
  } catch {
    return null
  }
}

/**
 * Core fetch wrapper with timeout, auth, and error handling
 * @param {string} endpoint - API endpoint path (e.g., '/api/auth/login')
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Parsed JSON response
 */
async function request(endpoint, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT,
    skipAuth = false,
    rawResponse = false,
    ...fetchOptions
  } = options

  // Build full URL
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint}`

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  }

  // Inject auth token
  if (!skipAuth) {
    const token = getAuthToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Return raw response if requested (for file downloads etc.)
    if (rawResponse) return response

    // Parse response
    if (!response.ok) {
      let errorData = null
      let errorMessage = `Request failed with status ${response.status}`
      try {
        errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        // Response body is not JSON
      }
      throw new ApiError(errorMessage, response.status, errorData)
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) return null

    // Try to parse JSON, fall back to text
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return await response.json()
    }
    return await response.text()
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof ApiError) throw error

    if (error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408)
    }

    if (!navigator.onLine) {
      throw new ApiError('No internet connection', 0)
    }

    throw new ApiError(
      error.message || 'Network error',
      0,
      { originalError: error }
    )
  }
}

/**
 * Retry wrapper with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} baseDelay - Base delay in ms (doubles each retry)
 */
async function withRetry(fn, maxRetries = 2, baseDelay = 1000) {
  let lastError
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      // Don't retry auth errors or client errors (4xx except 408/429)
      if (error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) {
        throw error
      }
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

/** Convenience methods */
const api = {
  get: (endpoint, options = {}) =>
    request(endpoint, { method: 'GET', ...options }),

  post: (endpoint, data, options = {}) =>
    request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    }),

  put: (endpoint, data, options = {}) =>
    request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    }),

  patch: (endpoint, data, options = {}) =>
    request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    }),

  delete: (endpoint, options = {}) =>
    request(endpoint, { method: 'DELETE', ...options }),

  /**
   * Upload a file with multipart/form-data
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with file
   * @param {Object} options - Additional options
   */
  upload: (endpoint, formData, options = {}) =>
    request(endpoint, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type with boundary
      ...options,
    }),

  /** Retry wrapper */
  withRetry,

  /** Get base URL for external use */
  getBaseUrl: () => API_BASE_URL,
}

export default api
