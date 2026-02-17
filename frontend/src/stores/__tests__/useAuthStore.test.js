/**
 * useAuthStore unit tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import useAuthStore from '../useAuthStore'

const SESSION_KEY = 'dchat_session'

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test.
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
    })
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('should set user, token, and isAuthenticated', () => {
      const user = { id: 1, wallet: '0xabc' }
      const token = 'jwt-token-123'

      useAuthStore.getState().login(user, token)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(user)
      expect(state.token).toBe(token)
      expect(state.isAuthenticated).toBe(true)
      expect(state.isLoading).toBe(false)
    })

    it('should persist session to localStorage', () => {
      const user = { id: 1 }
      const token = 'tok'

      useAuthStore.getState().login(user, token)

      expect(localStorage.setItem).toHaveBeenCalledWith(
        SESSION_KEY,
        expect.any(String)
      )
      const stored = JSON.parse(localStorage.setItem.mock.calls[0][1])
      expect(stored.user).toEqual(user)
      expect(stored.token).toBe(token)
      expect(stored.expiresAt).toBeGreaterThan(Date.now())
    })
  })

  describe('logout', () => {
    it('should clear user state and remove from localStorage', () => {
      // First login.
      useAuthStore.getState().login({ id: 1 }, 'tok')
      // Then logout.
      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(localStorage.removeItem).toHaveBeenCalledWith(SESSION_KEY)
    })
  })

  describe('updateUser', () => {
    it('should update user in store state', () => {
      useAuthStore.getState().login({ id: 1, name: 'old' }, 'tok')
      useAuthStore.getState().updateUser({ id: 1, name: 'new' })

      expect(useAuthStore.getState().user.name).toBe('new')
    })
  })

  describe('restoreSession', () => {
    it('should return null and set isLoading=false when no session exists', () => {
      localStorage.getItem.mockReturnValue(null)

      const result = useAuthStore.getState().restoreSession()

      expect(result).toBeNull()
      expect(useAuthStore.getState().isLoading).toBe(false)
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('should restore valid session from localStorage', () => {
      const session = {
        user: { id: 1, wallet: '0xabc' },
        token: 'jwt-tok',
        createdAt: Date.now() - 1000,
        expiresAt: Date.now() + 86400000, // +1 day
        lastActivity: Date.now(),
        rememberMe: true,
      }
      localStorage.getItem.mockReturnValue(JSON.stringify(session))

      const result = useAuthStore.getState().restoreSession()

      expect(result).toEqual(session.user)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().token).toBe('jwt-tok')
    })

    it('should clear expired session', () => {
      const session = {
        user: { id: 1 },
        token: 'tok',
        createdAt: Date.now() - 86400000 * 60,
        expiresAt: Date.now() - 1000, // expired
        lastActivity: Date.now() - 86400000,
      }
      localStorage.getItem.mockReturnValue(JSON.stringify(session))

      const result = useAuthStore.getState().restoreSession()

      expect(result).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith(SESSION_KEY)
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('should auto-refresh session expiring soon', () => {
      const session = {
        user: { id: 1 },
        token: 'tok',
        createdAt: Date.now() - 86400000 * 25,
        expiresAt: Date.now() + 86400000 * 3, // 3 days left (< 7 day threshold)
        lastActivity: Date.now() - 86400000,
        rememberMe: true,
      }
      localStorage.getItem.mockReturnValue(JSON.stringify(session))

      useAuthStore.getState().restoreSession()

      // Should have called setItem to refresh the session.
      expect(localStorage.setItem).toHaveBeenCalled()
      const refreshed = JSON.parse(localStorage.setItem.mock.calls[0][1])
      expect(refreshed.expiresAt).toBeGreaterThan(session.expiresAt)
    })

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.getItem.mockReturnValue('not-valid-json')

      const result = useAuthStore.getState().restoreSession()

      expect(result).toBeNull()
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('getSessionInfo', () => {
    it('should return null when no session exists', () => {
      localStorage.getItem.mockReturnValue(null)

      const info = useAuthStore.getState().getSessionInfo()
      expect(info).toBeNull()
    })

    it('should return session info with computed fields', () => {
      const session = {
        user: { id: 1 },
        token: 'tok',
        createdAt: Date.now() - 86400000,
        expiresAt: Date.now() + 86400000 * 15,
        lastActivity: Date.now(),
      }
      localStorage.getItem.mockReturnValue(JSON.stringify(session))

      const info = useAuthStore.getState().getSessionInfo()

      expect(info).not.toBeNull()
      expect(info.isExpired).toBe(false)
      expect(info.timeLeftDays).toBeGreaterThan(0)
    })
  })
})
