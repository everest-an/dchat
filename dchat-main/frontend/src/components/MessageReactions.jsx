/**
 * Message Reactions Component
 * 
 * Displays and manages emoji reactions for messages.
 * Allows users to add, remove, and view reactions.
 * 
 * Author: Manus AI
 * Date: 2024-11-12
 */

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Smile } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥']

const MessageReactions = ({ messageId, currentUserId, initialReactions = [] }) => {
  const [reactions, setReactions] = useState(initialReactions)
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(false)

  // Load reactions on mount
  useEffect(() => {
    loadReactions()
  }, [messageId])

  const loadReactions = async () => {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) return

      const response = await axios.get(
        `${API_BASE_URL}/api/reactions/message/${messageId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      )

      if (response.data.success) {
        setReactions(response.data.reactions || [])
      }
    } catch (error) {
      console.error('Error loading reactions:', error)
    }
  }

  const addReaction = async (emoji) => {
    if (loading) return

    setLoading(true)
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        setLoading(false)
        return
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/reactions/add`,
        {
          message_id: messageId,
          emoji: emoji
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data.success) {
        // Update local reactions
        await loadReactions()
      }

      setShowPicker(false)
    } catch (error) {
      console.error('Error adding reaction:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeReaction = async (emoji) => {
    if (loading) return

    setLoading(true)
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        setLoading(false)
        return
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/reactions/remove`,
        {
          message_id: messageId,
          emoji: emoji
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data.success) {
        // Update local reactions
        await loadReactions()
      }
    } catch (error) {
      console.error('Error removing reaction:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReactionClick = (emoji) => {
    // Check if current user already reacted with this emoji
    const userReaction = reactions.find(
      r => r.emoji === emoji && r.users && r.users.includes(currentUserId)
    )

    if (userReaction) {
      // Remove reaction
      removeReaction(emoji)
    } else {
      // Add reaction
      addReaction(emoji)
    }
  }

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: []
      }
    }
    acc[reaction.emoji].count = reaction.count || 1
    if (reaction.users) {
      acc[reaction.emoji].users = reaction.users
    }
    return acc
  }, {})

  const hasUserReacted = (emoji) => {
    return groupedReactions[emoji]?.users?.includes(currentUserId) || false
  }

  return (
    <div className="flex items-center gap-1 flex-wrap mt-1">
      {/* Display existing reactions */}
      {Object.values(groupedReactions).map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReactionClick(reaction.emoji)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
            hasUserReacted(reaction.emoji)
              ? 'bg-blue-100 border border-blue-300'
              : 'bg-gray-100 border border-gray-200 hover:bg-gray-200'
          }`}
          disabled={loading}
        >
          <span>{reaction.emoji}</span>
          <span className="font-medium">{reaction.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          title="Add reaction"
        >
          <Smile className="w-4 h-4 text-gray-600" />
        </button>

        {/* Emoji picker */}
        {showPicker && (
          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-10">
            <div className="flex gap-1">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => addReaction(emoji)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors text-lg"
                  disabled={loading}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageReactions
