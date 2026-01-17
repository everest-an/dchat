/**
 * Read Receipt Service
 * 
 * Handles read receipts for messages, including:
 * - Marking messages as read
 * - Getting read status
 * - Real-time read receipt updates
 * 
 * Author: Manus AI
 * Date: 2024-11-12
 */

import axios from 'axios'
import socketService from './socketService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

class ReadReceiptService {
  constructor() {
    this.readReceipts = new Map() // message_id -> read_data
    this.socketListenersSetup = false
  }

  /**
   * Setup Socket.IO listeners for real-time read receipts
   */
  setupSocketListeners() {
    if (this.socketListenersSetup) return;
    if (!socketService.isConnected()) {
      setTimeout(() => this.setupSocketListeners(), 1000);
      return;
    }
    this.socketListenersSetup = true;
    
    // Listen for message read events
    socketService.on('message_read', (data) => {
      console.log('Message read event:', data)
      this.handleMessageRead(data)
    })

    // Listen for all messages read events
    socketService.on('all_messages_read', (data) => {
      console.log('All messages read event:', data)
      this.handleAllMessagesRead(data)
    })
  }

  /**
   * Handle message read event
   */
  handleMessageRead(data) {
    const { message_id, reader_id, read_at } = data
    
    if (!this.readReceipts.has(message_id)) {
      this.readReceipts.set(message_id, [])
    }
    
    const receipts = this.readReceipts.get(message_id)
    if (!receipts.find(r => r.reader_id === reader_id)) {
      receipts.push({ reader_id, read_at })
    }
    
    // Trigger custom event for UI updates
    window.dispatchEvent(new CustomEvent('messageRead', { 
      detail: { message_id, reader_id, read_at } 
    }))
  }

  /**
   * Handle all messages read event
   */
  handleAllMessagesRead(data) {
    const { conversation_id, reader_id, count, read_at } = data
    
    // Trigger custom event for UI updates
    window.dispatchEvent(new CustomEvent('allMessagesRead', { 
      detail: { conversation_id, reader_id, count, read_at } 
    }))
  }

  /**
   * Mark a single message as read
   * @param {string} messageId - Message ID
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<boolean>}
   */
  async markMessageAsRead(messageId, conversationId) {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.warn('No auth token found')
        return false
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/read-receipts/mark-read`,
        {
          message_id: messageId,
          conversation_id: conversationId
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data.success) {
        // Update local cache
        this.handleMessageRead({
          message_id: messageId,
          reader_id: this.getCurrentUserId(),
          read_at: response.data.read_at
        })
        return true
      }

      return false
    } catch (error) {
      console.error('Error marking message as read:', error)
      return false
    }
  }

  /**
   * Mark all messages in a conversation as read
   * @param {string} conversationId - Conversation ID
   * @param {Array<string>} messageIds - Array of message IDs
   * @returns {Promise<boolean>}
   */
  async markAllMessagesAsRead(conversationId, messageIds) {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.warn('No auth token found')
        return false
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/read-receipts/mark-all-read`,
        {
          conversation_id: conversationId,
          message_ids: messageIds
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data.success) {
        // Update local cache
        const read_at = response.data.read_at
        const reader_id = this.getCurrentUserId()
        
        messageIds.forEach(messageId => {
          this.handleMessageRead({
            message_id: messageId,
            reader_id,
            read_at
          })
        })
        
        return true
      }

      return false
    } catch (error) {
      console.error('Error marking all messages as read:', error)
      return false
    }
  }

  /**
   * Get read status for a message
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>}
   */
  async getReadStatus(messageId) {
    try {
      // Check local cache first
      if (this.readReceipts.has(messageId)) {
        const receipts = this.readReceipts.get(messageId)
        return {
          is_read: receipts.length > 0,
          read_count: receipts.length,
          read_receipts: receipts
        }
      }

      // Fetch from API
      const token = localStorage.getItem('auth_token')
      if (!token) {
        return { is_read: false, read_count: 0, read_receipts: [] }
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/read-receipts/status/${messageId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.data.success) {
        // Update local cache
        this.readReceipts.set(messageId, response.data.read_receipts || [])
        return response.data
      }

      return { is_read: false, read_count: 0, read_receipts: [] }
    } catch (error) {
      console.error('Error getting read status:', error)
      return { is_read: false, read_count: 0, read_receipts: [] }
    }
  }

  /**
   * Get read status for all messages in a conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Object>}
   */
  async getConversationReadStatus(conversationId) {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        return { read_receipts: {}, total_read_messages: 0 }
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/read-receipts/conversation/${conversationId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.data.success) {
        // Update local cache
        Object.entries(response.data.read_receipts || {}).forEach(([messageId, receipts]) => {
          this.readReceipts.set(messageId, receipts)
        })
        return response.data
      }

      return { read_receipts: {}, total_read_messages: 0 }
    } catch (error) {
      console.error('Error getting conversation read status:', error)
      return { read_receipts: {}, total_read_messages: 0 }
    }
  }

  /**
   * Check if a message is read
   * @param {string} messageId - Message ID
   * @returns {boolean}
   */
  isMessageRead(messageId) {
    if (this.readReceipts.has(messageId)) {
      const receipts = this.readReceipts.get(messageId)
      return receipts.length > 0
    }
    return false
  }

  /**
   * Get current user ID from local storage
   * @returns {string|null}
   */
  getCurrentUserId() {
    try {
      const account = localStorage.getItem('account')
      return account
    } catch (error) {
      console.error('Error getting current user ID:', error)
      return null
    }
  }

  /**
   * Clear local cache
   */
  clearCache() {
    this.readReceipts.clear()
  }

  /**
   * Listen for read receipt events
   * @param {string} event - Event name ('messageRead' or 'allMessagesRead')
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    window.addEventListener(event, (e) => callback(e.detail))
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    window.removeEventListener(event, callback)
  }
}

// Export singleton instance
export const readReceiptService = new ReadReceiptService()
export default readReceiptService
