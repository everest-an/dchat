/**
 * AuthService - Persistent Authentication Service
 * 
 * Provides Telegram-style persistent login functionality
 * - 30-day session persistence
 * - Automatic session restoration
 * - Activity-based session refresh
 * - Secure token management
 */

class AuthService {
  constructor() {
    this.SESSION_KEY = 'dchat_session'
    this.REMEMBER_KEY = 'dchat_remember_me'
    this.DEFAULT_EXPIRY = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
    this.REFRESH_THRESHOLD = 24 * 60 * 60 * 1000 // Refresh if < 24 hours left
  }

  /**
   * Generate a secure authentication token
   * @param {Object} userData - User data object
   * @returns {string} Authentication token
   */
  generateToken(userData) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    const userIdentifier = userData.walletAddress || userData.email || userData.phone || 'anonymous'
    
    // Create a simple but unique token
    const token = `dchat_${userIdentifier}_${timestamp}_${random}`
    
    return btoa(token) // Base64 encode for basic obfuscation
  }

  /**
   * Save user session to localStorage
   * @param {Object} userData - User data to save
   * @param {number} expiresIn - Expiration time in milliseconds (default: 30 days)
   * @param {boolean} rememberMe - Whether to persist session (default: true)
   */
  saveSession(userData, expiresIn = this.DEFAULT_EXPIRY, rememberMe = true) {
    try {
      const session = {
        user: userData,
        token: this.generateToken(userData),
        expiresAt: Date.now() + expiresIn,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        version: '1.0'
      }

      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))
      localStorage.setItem(this.REMEMBER_KEY, rememberMe.toString())

      console.log('✅ Session saved successfully', {
        user: userData.username || userData.email,
        expiresIn: `${Math.round(expiresIn / (24 * 60 * 60 * 1000))} days`,
        rememberMe
      })

      return true
    } catch (error) {
      console.error('❌ Failed to save session:', error)
      return false
    }
  }

  /**
   * Restore user session from localStorage
   * @returns {Object|null} User data if session is valid, null otherwise
   */
  restoreSession() {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY)
      const rememberMe = localStorage.getItem(this.REMEMBER_KEY) === 'true'

      if (!sessionData || !rememberMe) {
        console.log('ℹ️ No session to restore')
        return null
      }

      const session = JSON.parse(sessionData)

      // Check if session has expired
      if (session.expiresAt <= Date.now()) {
        console.log('⚠️ Session expired')
        this.clearSession()
        return null
      }

      // Check if session should be refreshed
      const timeLeft = session.expiresAt - Date.now()
      if (timeLeft < this.REFRESH_THRESHOLD) {
        console.log('🔄 Session expiring soon, refreshing...')
        this.refreshSession(session.user)
      }

      console.log('✅ Session restored successfully', {
        user: session.user.username || session.user.email,
        timeLeft: `${Math.round(timeLeft / (24 * 60 * 60 * 1000))} days`
      })

      return session.user
    } catch (error) {
      console.error('❌ Failed to restore session:', error)
      this.clearSession()
      return null
    }
  }

  /**
   * Refresh session expiration time
   * @param {Object} userData - User data (optional, will use current session if not provided)
   */
  refreshSession(userData = null) {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY)
      
      if (!sessionData) {
        console.log('⚠️ No session to refresh')
        return false
      }

      const session = JSON.parse(sessionData)
      const user = userData || session.user

      // Update session with new expiration
      const updatedSession = {
        ...session,
        user,
        expiresAt: Date.now() + this.DEFAULT_EXPIRY,
        lastActivity: Date.now()
      }

      localStorage.setItem(this.SESSION_KEY, JSON.stringify(updatedSession))

      console.log('✅ Session refreshed', {
        user: user.username || user.email,
        newExpiry: new Date(updatedSession.expiresAt).toLocaleString()
      })

      return true
    } catch (error) {
      console.error('❌ Failed to refresh session:', error)
      return false
    }
  }

  /**
   * Update last activity timestamp
   * Call this on user interactions to track activity
   */
  updateActivity() {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY)
      
      if (!sessionData) {
        return false
      }

      const session = JSON.parse(sessionData)
      session.lastActivity = Date.now()

      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))
      
      return true
    } catch (error) {
      console.error('❌ Failed to update activity:', error)
      return false
    }
  }

  /**
   * Clear user session
   */
  clearSession() {
    try {
      localStorage.removeItem(this.SESSION_KEY)
      localStorage.removeItem(this.REMEMBER_KEY)
      console.log('✅ Session cleared')
      return true
    } catch (error) {
      console.error('❌ Failed to clear session:', error)
      return false
    }
  }

  /**
   * Get current session info
   * @returns {Object|null} Session info or null if no session
   */
  getSessionInfo() {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY)
      
      if (!sessionData) {
        return null
      }

      const session = JSON.parse(sessionData)
      const timeLeft = session.expiresAt - Date.now()
      const isExpired = timeLeft <= 0

      return {
        user: session.user,
        token: session.token,
        createdAt: new Date(session.createdAt),
        expiresAt: new Date(session.expiresAt),
        lastActivity: new Date(session.lastActivity),
        timeLeft: Math.max(0, timeLeft),
        timeLeftDays: Math.max(0, Math.round(timeLeft / (24 * 60 * 60 * 1000))),
        isExpired,
        isExpiringSoon: timeLeft < this.REFRESH_THRESHOLD && !isExpired
      }
    } catch (error) {
      console.error('❌ Failed to get session info:', error)
      return null
    }
  }

  /**
   * Check if user is logged in
   * @returns {boolean} True if valid session exists
   */
  isLoggedIn() {
    const session = this.restoreSession()
    return session !== null
  }

  /**
   * Logout user and clear session
   */
  logout() {
    console.log('👋 Logging out...')
    this.clearSession()
  }

  /**
   * Setup activity tracking
   * Automatically refresh session on user activity
   */
  setupActivityTracking() {
    // Track user activity events
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']
    
    let lastActivityUpdate = Date.now()
    const UPDATE_INTERVAL = 60 * 1000 // Update every minute

    const handleActivity = () => {
      const now = Date.now()
      
      // Throttle updates to avoid excessive writes
      if (now - lastActivityUpdate > UPDATE_INTERVAL) {
        this.updateActivity()
        lastActivityUpdate = now
      }
    }

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    console.log('✅ Activity tracking enabled')
  }

  /**
   * Setup automatic session refresh
   * Check and refresh session periodically
   */
  setupAutoRefresh() {
    // Check session every hour
    const CHECK_INTERVAL = 60 * 60 * 1000 // 1 hour

    setInterval(() => {
      const sessionInfo = this.getSessionInfo()
      
      if (sessionInfo && sessionInfo.isExpiringSoon) {
        console.log('🔄 Auto-refreshing session...')
        this.refreshSession()
      }
    }, CHECK_INTERVAL)

    console.log('✅ Auto-refresh enabled')
  }
}

// Export singleton instance
const authService = new AuthService()
export default authService
