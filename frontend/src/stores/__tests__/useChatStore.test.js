/**
 * useChatStore unit tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import useChatStore from '../useChatStore'

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      conversations: [],
      activeMessages: [],
      activeChatId: null,
      unreadTotal: 0,
      isLoadingMessages: false,
    })
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('loadConversations', () => {
    it('should load conversations from localStorage', () => {
      const convos = [
        { address: '0xabc', unread: 3, lastMessage: 'hi' },
        { address: '0xdef', unread: 1, lastMessage: 'bye' },
      ]
      localStorage.getItem.mockReturnValue(JSON.stringify(convos))

      useChatStore.getState().loadConversations('0x123')

      const state = useChatStore.getState()
      expect(state.conversations).toEqual(convos)
      expect(state.unreadTotal).toBe(4)
    })

    it('should handle empty localStorage', () => {
      localStorage.getItem.mockReturnValue(null)

      useChatStore.getState().loadConversations('0x123')

      expect(useChatStore.getState().conversations).toEqual([])
      expect(useChatStore.getState().unreadTotal).toBe(0)
    })

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.getItem.mockReturnValue('invalid-json')

      useChatStore.getState().loadConversations('0x123')

      expect(useChatStore.getState().conversations).toEqual([])
    })
  })

  describe('updateConversation', () => {
    it('should add a new conversation', () => {
      useChatStore.getState().updateConversation('0xabc', {
        lastMessage: 'hello',
        unread: 1,
      })

      const state = useChatStore.getState()
      expect(state.conversations).toHaveLength(1)
      expect(state.conversations[0].address).toBe('0xabc')
      expect(state.conversations[0].lastMessage).toBe('hello')
      expect(state.unreadTotal).toBe(1)
    })

    it('should update an existing conversation', () => {
      useChatStore.setState({
        conversations: [{ address: '0xabc', lastMessage: 'old', unread: 0 }],
      })

      useChatStore.getState().updateConversation('0xabc', {
        lastMessage: 'new',
        unread: 2,
      })

      const state = useChatStore.getState()
      expect(state.conversations).toHaveLength(1)
      expect(state.conversations[0].lastMessage).toBe('new')
      expect(state.unreadTotal).toBe(2)
    })
  })

  describe('loadMessages', () => {
    it('should load messages from localStorage', () => {
      const msgs = [{ id: 1, content: 'hi' }, { id: 2, content: 'hello' }]
      localStorage.getItem.mockReturnValue(JSON.stringify(msgs))

      const result = useChatStore.getState().loadMessages('0x123', '0xabc')

      expect(result).toEqual(msgs)
      expect(useChatStore.getState().activeMessages).toEqual(msgs)
      expect(useChatStore.getState().activeChatId).toBe('0xabc')
      expect(useChatStore.getState().isLoadingMessages).toBe(false)
    })

    it('should return empty array when no messages stored', () => {
      localStorage.getItem.mockReturnValue(null)

      const result = useChatStore.getState().loadMessages('0x123', '0xabc')

      expect(result).toEqual([])
    })
  })

  describe('addMessage', () => {
    it('should append a message and persist', () => {
      useChatStore.setState({ activeMessages: [{ id: 1, content: 'hi' }] })

      const result = useChatStore.getState().addMessage('0x123', '0xabc', {
        id: 2,
        content: 'hello',
      })

      expect(result).toHaveLength(2)
      expect(useChatStore.getState().activeMessages).toHaveLength(2)
      expect(localStorage.setItem).toHaveBeenCalled()
    })
  })

  describe('markAsRead', () => {
    it('should set unread to 0 for the specified address', () => {
      useChatStore.setState({
        conversations: [
          { address: '0xabc', unread: 5 },
          { address: '0xdef', unread: 3 },
        ],
        unreadTotal: 8,
      })

      useChatStore.getState().markAsRead('0xabc')

      const state = useChatStore.getState()
      expect(state.conversations[0].unread).toBe(0)
      expect(state.conversations[1].unread).toBe(3)
      expect(state.unreadTotal).toBe(3)
    })
  })

  describe('clearActiveChat', () => {
    it('should clear active messages and chat ID', () => {
      useChatStore.setState({
        activeMessages: [{ id: 1 }],
        activeChatId: '0xabc',
      })

      useChatStore.getState().clearActiveChat()

      expect(useChatStore.getState().activeMessages).toEqual([])
      expect(useChatStore.getState().activeChatId).toBeNull()
    })
  })
})
