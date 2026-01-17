/**
 * GroupMessageService.js
 * 
 * Manages group messages, file sharing, and IPFS storage
 */

import ipfsService from './IPFSService'
import { UserProfileService } from './UserProfileService'
import GroupService from './GroupService'

class GroupMessageService {
  constructor() {
    this.MESSAGE_KEY_PREFIX = 'dchat_group_messages_'
  }

  /**
   * Generate a unique message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get storage key for group messages
   */
  getMessageKey(groupId) {
    return `${this.MESSAGE_KEY_PREFIX}${groupId}`
  }

  /**
   * Send a text message to a group
   * @param {string} groupId - Group ID
   * @param {string} sender - Sender's wallet address
   * @param {string} text - Message text
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Sent message
   */
  async sendMessage(groupId, sender, text, options = {}) {
    try {
      console.log('📤 Sending message to group:', groupId)

      // Validate inputs
      if (!groupId || !sender || !text) {
        throw new Error('Group ID, sender, and text are required')
      }

      // Check if user is a member
      if (!GroupService.isMember(groupId, sender)) {
        throw new Error('User is not a member of this group')
      }

      // Check permissions
      const permissions = GroupService.getMemberPermissions(groupId, sender)
      if (!permissions || !permissions.canSendMessages) {
        throw new Error('User does not have permission to send messages')
      }

      // Create message object
      const message = {
        id: this.generateMessageId(),
        groupId,
        sender,
        senderName: UserProfileService.getDisplayName(sender),
        senderAvatar: UserProfileService.getDisplayAvatar(sender),
        type: 'text',
        content: text.trim(),
        timestamp: Date.now(),
        ipfsHash: null,
        encrypted: false,
        replyTo: options.replyTo || null,
        reactions: {},
        edited: false,
        deleted: false
      }

      // Save message locally
      this.saveMessageLocally(groupId, message)

      // Upload to IPFS (async, don't wait)
      this.uploadMessageToIPFS(message).catch(err => {
        console.error('Failed to upload message to IPFS:', err)
      })

      console.log('✅ Message sent successfully:', message.id)
      return message

    } catch (error) {
      console.error('❌ Error sending message:', error)
      throw error
    }
  }

  /**
   * Send a file message to a group
   * @param {string} groupId - Group ID
   * @param {string} sender - Sender's wallet address
   * @param {File} file - File to send
   * @param {string} caption - Optional caption
   * @returns {Promise<Object>} Sent message
   */
  async sendFileMessage(groupId, sender, file, caption = '') {
    try {
      console.log('📎 Sending file message to group:', groupId, file.name)

      // Validate inputs
      if (!groupId || !sender || !file) {
        throw new Error('Group ID, sender, and file are required')
      }

      // Check if user is a member
      if (!GroupService.isMember(groupId, sender)) {
        throw new Error('User is not a member of this group')
      }

      // Check permissions
      const permissions = GroupService.getMemberPermissions(groupId, sender)
      if (!permissions || !permissions.canSendMessages) {
        throw new Error('User does not have permission to send messages')
      }

      // Check if file sharing is allowed
      const group = GroupService.getGroup(groupId)
      if (!group.settings.allowFileSharing) {
        throw new Error('File sharing is not allowed in this group')
      }

      // Upload file to IPFS
      console.log('📤 Uploading file to IPFS...')
      const ipfsHash = await ipfsService.uploadFile(file)

      if (!ipfsHash) {
        throw new Error('Failed to upload file to IPFS')
      }

      // Get IPFS URL
      const ipfsUrl = ipfsService.getGatewayUrl(ipfsHash)

      // Determine message type based on file type
      let messageType = 'file'
      if (file.type.startsWith('image/')) {
        messageType = 'image'
      } else if (file.type.startsWith('video/')) {
        messageType = 'video'
      } else if (file.type.startsWith('audio/')) {
        messageType = 'audio'
      }

      // Create message object
      const message = {
        id: this.generateMessageId(),
        groupId,
        sender,
        senderName: UserProfileService.getDisplayName(sender),
        senderAvatar: UserProfileService.getDisplayAvatar(sender),
        type: messageType,
        content: caption.trim(),
        fileData: {
          name: file.name,
          size: file.size,
          type: file.type,
          ipfsHash,
          url: ipfsUrl
        },
        timestamp: Date.now(),
        ipfsHash,
        encrypted: false,
        replyTo: null,
        reactions: {},
        edited: false,
        deleted: false
      }

      // Save message locally
      this.saveMessageLocally(groupId, message)

      console.log('✅ File message sent successfully:', message.id)
      return message

    } catch (error) {
      console.error('❌ Error sending file message:', error)
      throw error
    }
  }

  /**
   * Send a system message (member joined, left, etc.)
   */
  async sendSystemMessage(groupId, type, data) {
    try {
      console.log('🔔 Sending system message:', type)

      const message = {
        id: this.generateMessageId(),
        groupId,
        sender: 'system',
        senderName: 'System',
        senderAvatar: { type: 'emoji', emoji: '🔔' },
        type: 'system',
        content: this.formatSystemMessage(type, data),
        systemType: type,
        systemData: data,
        timestamp: Date.now(),
        ipfsHash: null,
        encrypted: false,
        replyTo: null,
        reactions: {},
        edited: false,
        deleted: false
      }

      // Save message locally
      this.saveMessageLocally(groupId, message)

      return message

    } catch (error) {
      console.error('Error sending system message:', error)
      throw error
    }
  }

  /**
   * Format system message text
   */
  formatSystemMessage(type, data) {
    switch (type) {
      case 'member_joined':
        return `${data.username} joined the group`
      case 'member_left':
        return `${data.username} left the group`
      case 'member_removed':
        return `${data.username} was removed from the group`
      case 'member_promoted':
        return `${data.username} is now an admin`
      case 'member_demoted':
        return `${data.username} is no longer an admin`
      case 'group_created':
        return `Group created by ${data.username}`
      case 'group_updated':
        return `Group information updated`
      case 'settings_changed':
        return `Group settings changed`
      default:
        return 'Group activity'
    }
  }

  /**
   * Save message to localStorage
   */
  saveMessageLocally(groupId, message) {
    try {
      const messages = this.getMessages(groupId)
      messages.push(message)
      
      const key = this.getMessageKey(groupId)
      localStorage.setItem(key, JSON.stringify(messages))

      console.log('💾 Message saved locally:', message.id)
    } catch (error) {
      console.error('Error saving message locally:', error)
      throw error
    }
  }

  /**
   * Upload message to IPFS
   */
  async uploadMessageToIPFS(message) {
    try {
      console.log('📤 Uploading message to IPFS:', message.id)

      // Prepare data for IPFS (exclude local-only fields)
      const ipfsData = {
        id: message.id,
        groupId: message.groupId,
        sender: message.sender,
        type: message.type,
        content: message.content,
        fileData: message.fileData,
        timestamp: message.timestamp,
        replyTo: message.replyTo
      }

      // Upload to IPFS
      const ipfsHash = await ipfsService.uploadJSON(ipfsData)

      if (ipfsHash) {
        // Update message with IPFS hash
        message.ipfsHash = ipfsHash
        this.updateMessageLocally(message.groupId, message.id, { ipfsHash })

        console.log('✅ Message uploaded to IPFS:', ipfsHash)
        return ipfsHash
      }

      return null
    } catch (error) {
      console.error('❌ Error uploading message to IPFS:', error)
      return null
    }
  }

  /**
   * Get all messages for a group
   */
  getMessages(groupId, limit = null, offset = 0) {
    try {
      const key = this.getMessageKey(groupId)
      const stored = localStorage.getItem(key)
      const messages = stored ? JSON.parse(stored) : []

      // Filter out deleted messages
      const activeMessages = messages.filter(m => !m.deleted)

      // Apply pagination if limit specified
      if (limit) {
        return activeMessages.slice(offset, offset + limit)
      }

      return activeMessages
    } catch (error) {
      console.error('Error getting messages:', error)
      return []
    }
  }

  /**
   * Get a specific message by ID
   */
  getMessage(groupId, messageId) {
    try {
      const messages = this.getMessages(groupId)
      return messages.find(m => m.id === messageId) || null
    } catch (error) {
      console.error('Error getting message:', error)
      return null
    }
  }

  /**
   * Search messages in a group
   */
  searchMessages(groupId, query) {
    try {
      const messages = this.getMessages(groupId)
      const lowerQuery = query.toLowerCase()

      return messages.filter(m => {
        // Search in text content
        if (m.content && m.content.toLowerCase().includes(lowerQuery)) {
          return true
        }

        // Search in file names
        if (m.fileData && m.fileData.name.toLowerCase().includes(lowerQuery)) {
          return true
        }

        // Search in sender name
        if (m.senderName && m.senderName.toLowerCase().includes(lowerQuery)) {
          return true
        }

        return false
      })
    } catch (error) {
      console.error('Error searching messages:', error)
      return []
    }
  }

  /**
   * Get messages by date range
   */
  getMessagesByDate(groupId, startDate, endDate) {
    try {
      const messages = this.getMessages(groupId)

      return messages.filter(m => {
        const messageDate = new Date(m.timestamp)
        return messageDate >= startDate && messageDate <= endDate
      })
    } catch (error) {
      console.error('Error getting messages by date:', error)
      return []
    }
  }

  /**
   * Get messages by sender
   */
  getMessagesBySender(groupId, senderAddress) {
    try {
      const messages = this.getMessages(groupId)

      return messages.filter(
        m => m.sender.toLowerCase() === senderAddress.toLowerCase()
      )
    } catch (error) {
      console.error('Error getting messages by sender:', error)
      return []
    }
  }

  /**
   * Update a message locally
   */
  updateMessageLocally(groupId, messageId, updates) {
    try {
      const messages = this.getMessages(groupId)
      const messageIndex = messages.findIndex(m => m.id === messageId)

      if (messageIndex >= 0) {
        messages[messageIndex] = {
          ...messages[messageIndex],
          ...updates
        }

        const key = this.getMessageKey(groupId)
        localStorage.setItem(key, JSON.stringify(messages))

        console.log('💾 Message updated locally:', messageId)
        return messages[messageIndex]
      }

      return null
    } catch (error) {
      console.error('Error updating message:', error)
      return null
    }
  }

  /**
   * Edit a message
   */
  async editMessage(groupId, messageId, newContent, userAddress) {
    try {
      console.log('✏️ Editing message:', messageId)

      const message = this.getMessage(groupId, messageId)
      if (!message) {
        throw new Error('Message not found')
      }

      // Check if user is the sender
      if (message.sender.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Only the sender can edit the message')
      }

      // Check if message type is text
      if (message.type !== 'text') {
        throw new Error('Only text messages can be edited')
      }

      // Update message
      const updatedMessage = this.updateMessageLocally(groupId, messageId, {
        content: newContent.trim(),
        edited: true,
        editedAt: Date.now()
      })

      console.log('✅ Message edited successfully')
      return updatedMessage

    } catch (error) {
      console.error('❌ Error editing message:', error)
      throw error
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(groupId, messageId, userAddress) {
    try {
      console.log('🗑️ Deleting message:', messageId)

      const message = this.getMessage(groupId, messageId)
      if (!message) {
        throw new Error('Message not found')
      }

      // Check if user is the sender or an admin
      const isAdmin = GroupService.isAdmin(groupId, userAddress)
      const isSender = message.sender.toLowerCase() === userAddress.toLowerCase()

      if (!isAdmin && !isSender) {
        throw new Error('Only the sender or admins can delete the message')
      }

      // Mark as deleted
      const updatedMessage = this.updateMessageLocally(groupId, messageId, {
        deleted: true,
        deletedAt: Date.now(),
        deletedBy: userAddress
      })

      console.log('✅ Message deleted successfully')
      return updatedMessage

    } catch (error) {
      console.error('❌ Error deleting message:', error)
      throw error
    }
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(groupId, messageId, emoji, userAddress) {
    try {
      console.log('👍 Adding reaction to message:', messageId, emoji)

      const message = this.getMessage(groupId, messageId)
      if (!message) {
        throw new Error('Message not found')
      }

      // Initialize reactions if not exists
      if (!message.reactions) {
        message.reactions = {}
      }

      // Initialize emoji array if not exists
      if (!message.reactions[emoji]) {
        message.reactions[emoji] = []
      }

      // Add user if not already reacted
      if (!message.reactions[emoji].includes(userAddress)) {
        message.reactions[emoji].push(userAddress)
      }

      // Update message
      const updatedMessage = this.updateMessageLocally(groupId, messageId, {
        reactions: message.reactions
      })

      console.log('✅ Reaction added successfully')
      return updatedMessage

    } catch (error) {
      console.error('❌ Error adding reaction:', error)
      throw error
    }
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(groupId, messageId, emoji, userAddress) {
    try {
      console.log('👎 Removing reaction from message:', messageId, emoji)

      const message = this.getMessage(groupId, messageId)
      if (!message) {
        throw new Error('Message not found')
      }

      // Check if reaction exists
      if (!message.reactions || !message.reactions[emoji]) {
        return message
      }

      // Remove user from reaction
      message.reactions[emoji] = message.reactions[emoji].filter(
        addr => addr.toLowerCase() !== userAddress.toLowerCase()
      )

      // Remove emoji if no users left
      if (message.reactions[emoji].length === 0) {
        delete message.reactions[emoji]
      }

      // Update message
      const updatedMessage = this.updateMessageLocally(groupId, messageId, {
        reactions: message.reactions
      })

      console.log('✅ Reaction removed successfully')
      return updatedMessage

    } catch (error) {
      console.error('❌ Error removing reaction:', error)
      throw error
    }
  }

  /**
   * Clear all messages in a group (admin only)
   */
  async clearGroupMessages(groupId, userAddress) {
    try {
      console.log('🧹 Clearing group messages:', groupId)

      // Check if user is admin
      if (!GroupService.isAdmin(groupId, userAddress)) {
        throw new Error('Only admins can clear group messages')
      }

      // Clear messages
      const key = this.getMessageKey(groupId)
      localStorage.setItem(key, JSON.stringify([]))

      console.log('✅ Group messages cleared successfully')
      return true

    } catch (error) {
      console.error('❌ Error clearing group messages:', error)
      throw error
    }
  }

  /**
   * Get message count for a group
   */
  getMessageCount(groupId) {
    try {
      const messages = this.getMessages(groupId)
      return messages.length
    } catch (error) {
      console.error('Error getting message count:', error)
      return 0
    }
  }

  /**
   * Get last message for a group
   */
  getLastMessage(groupId) {
    try {
      const messages = this.getMessages(groupId)
      return messages.length > 0 ? messages[messages.length - 1] : null
    } catch (error) {
      console.error('Error getting last message:', error)
      return null
    }
  }

  /**
   * Get unread message count (placeholder - needs read receipt implementation)
   */
  getUnreadCount(groupId, userAddress) {
    // TODO: Implement read receipts
    return 0
  }

  /**
   * Mark messages as read (placeholder - needs read receipt implementation)
   */
  async markAsRead(groupId, userAddress) {
    // TODO: Implement read receipts
    return true
  }
}

// Export singleton instance
export default new GroupMessageService()
