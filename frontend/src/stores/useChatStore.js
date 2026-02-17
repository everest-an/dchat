/**
 * Chat Store (Zustand)
 * 
 * Centralized chat state management. Manages conversations list,
 * active chat messages, and unread counts.
 */
import { create } from 'zustand'

const CONVERSATIONS_KEY = 'dchat_conversations'

const useChatStore = create((set, get) => ({
  // State
  conversations: [],
  activeMessages: [],
  activeChatId: null,
  unreadTotal: 0,
  isLoadingMessages: false,

  // Actions
  /** Load conversations from localStorage */
  loadConversations: (account) => {
    try {
      const stored = localStorage.getItem(CONVERSATIONS_KEY)
      const conversations = stored ? JSON.parse(stored) : []
      const unreadTotal = conversations.reduce((sum, c) => sum + (c.unread || 0), 0)
      set({ conversations, unreadTotal })
    } catch {
      set({ conversations: [], unreadTotal: 0 })
    }
  },

  /** Update a conversation in the list */
  updateConversation: (address, data) => {
    const { conversations } = get()
    const index = conversations.findIndex(c => c.address === address)
    const updated = [...conversations]

    if (index >= 0) {
      updated[index] = { ...updated[index], ...data, timestamp: Date.now() }
    } else {
      updated.unshift({ address, ...data, timestamp: Date.now() })
    }

    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(updated))
    const unreadTotal = updated.reduce((sum, c) => sum + (c.unread || 0), 0)
    set({ conversations: updated, unreadTotal })
  },

  /** Load messages for a specific chat */
  loadMessages: (account, recipientAddress) => {
    set({ isLoadingMessages: true, activeChatId: recipientAddress })
    try {
      const storageKey = `dchat_messages_${account}_${recipientAddress}`
      const stored = localStorage.getItem(storageKey)
      const messages = stored ? JSON.parse(stored) : []
      set({ activeMessages: messages, isLoadingMessages: false })
      return messages
    } catch {
      set({ activeMessages: [], isLoadingMessages: false })
      return []
    }
  },

  /** Add a message to the active chat */
  addMessage: (account, recipientAddress, message) => {
    const { activeMessages } = get()
    const updated = [...activeMessages, message]
    set({ activeMessages: updated })

    // Persist to localStorage
    const storageKey = `dchat_messages_${account}_${recipientAddress}`
    localStorage.setItem(storageKey, JSON.stringify(updated))
    return updated
  },

  /** Update messages in bulk (e.g., after loading from blockchain) */
  setMessages: (account, recipientAddress, messages) => {
    set({ activeMessages: messages })
    const storageKey = `dchat_messages_${account}_${recipientAddress}`
    localStorage.setItem(storageKey, JSON.stringify(messages))
  },

  /** Clear active chat */
  clearActiveChat: () => {
    set({ activeMessages: [], activeChatId: null })
  },

  /** Mark conversation as read */
  markAsRead: (address) => {
    const { conversations } = get()
    const updated = conversations.map(c =>
      c.address === address ? { ...c, unread: 0 } : c
    )
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(updated))
    const unreadTotal = updated.reduce((sum, c) => sum + (c.unread || 0), 0)
    set({ conversations: updated, unreadTotal })
  },
}))

export default useChatStore
