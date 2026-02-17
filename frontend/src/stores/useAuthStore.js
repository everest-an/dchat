/**
 * Auth Store (Zustand)
 * 
 * Centralized authentication state management. Replaces scattered
 * localStorage calls and component-level auth state.
 */
import { create } from 'zustand'

const SESSION_KEY = 'dchat_session'
const DEFAULT_EXPIRY = 30 * 24 * 60 * 60 * 1000 // 30 days
const REFRESH_THRESHOLD = 7 * 24 * 60 * 60 * 1000 // 7 days

const useAuthStore = create((set, get) => ({
  // State
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  // Actions
  login: (userData, token, rememberMe = true) => {
    const session = {
      user: userData,
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + DEFAULT_EXPIRY,
      lastActivity: Date.now(),
      rememberMe,
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    set({ user: userData, token, isAuthenticated: true, isLoading: false })
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY)
    set({ user: null, token: null, isAuthenticated: false })
  },

  updateUser: (userData) => {
    const { token } = get()
    set({ user: userData })
    // Also update localStorage
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (sessionData) {
        const session = JSON.parse(sessionData)
        session.user = userData
        localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      }
    } catch { /* ignore */ }
  },

  /** Restore session from localStorage on app startup */
  restoreSession: () => {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (!sessionData) {
        set({ isLoading: false })
        return null
      }

      const session = JSON.parse(sessionData)
      const timeLeft = session.expiresAt - Date.now()

      if (timeLeft <= 0) {
        localStorage.removeItem(SESSION_KEY)
        set({ isLoading: false })
        return null
      }

      // Migrate old format if needed
      if (!session.user && !session.token) {
        localStorage.removeItem(SESSION_KEY)
        set({ isLoading: false })
        return null
      }

      // Auto-refresh if expiring soon
      if (timeLeft < REFRESH_THRESHOLD) {
        session.expiresAt = Date.now() + DEFAULT_EXPIRY
        session.lastActivity = Date.now()
        localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      }

      set({
        user: session.user,
        token: session.token,
        isAuthenticated: true,
        isLoading: false,
      })
      return session.user
    } catch {
      localStorage.removeItem(SESSION_KEY)
      set({ isLoading: false })
      return null
    }
  },

  /** Update last activity timestamp (throttled externally) */
  updateActivity: () => {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (!sessionData) return
      const session = JSON.parse(sessionData)
      session.lastActivity = Date.now()
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } catch { /* ignore */ }
  },

  /** Get session info for display */
  getSessionInfo: () => {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (!sessionData) return null
      const session = JSON.parse(sessionData)
      const timeLeft = session.expiresAt - Date.now()
      return {
        user: session.user,
        createdAt: new Date(session.createdAt),
        expiresAt: new Date(session.expiresAt),
        timeLeftDays: Math.max(0, Math.round(timeLeft / (24 * 60 * 60 * 1000))),
        isExpired: timeLeft <= 0,
        isExpiringSoon: timeLeft < REFRESH_THRESHOLD && timeLeft > 0,
      }
    } catch {
      return null
    }
  },
}))

export default useAuthStore
