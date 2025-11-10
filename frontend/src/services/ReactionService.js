/**
 * Reaction Service
 * 
 * Provides message reaction functionality similar to Telegram/Slack.
 * Users can react to messages with emoji or custom reactions.
 * 
 * Features:
 * - Add/remove reactions
 * - Get message reactions
 * - Get reaction users
 * - Popular reactions
 * - Reaction statistics
 * 
 * @author Manus AI
 * @date 2024-11-05
 */

import api from './api';
import socketService from './socketService';

class ReactionService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.listeners = new Map();
    
    // Listen for real-time reaction updates
    this._setupSocketListeners();
  }
  
  /**
   * Setup Socket.IO listeners for real-time updates
   * @private
   */
  _setupSocketListeners() {
    // Listen for reaction added
    socketService.on('reaction_added', (data) => {
      this._handleReactionAdded(data);
    });
    
    // Listen for reaction removed
    socketService.on('reaction_removed', (data) => {
      this._handleReactionRemoved(data);
    });
  }
  
  /**
   * Handle reaction added event
   * @private
   * @param {Object} data - Reaction data
   */
  _handleReactionAdded(data) {
    const { message_id, emoji, user_id, count } = data;
    
    // Invalidate cache
    this.cache.delete(`reactions:${message_id}`);
    
    // Notify listeners
    this._notifyListeners(message_id, {
      type: 'added',
      emoji,
      user_id,
      count
    });
  }
  
  /**
   * Handle reaction removed event
   * @private
   * @param {Object} data - Reaction data
   */
  _handleReactionRemoved(data) {
    const { message_id, emoji, user_id, count } = data;
    
    // Invalidate cache
    this.cache.delete(`reactions:${message_id}`);
    
    // Notify listeners
    this._notifyListeners(message_id, {
      type: 'removed',
      emoji,
      user_id,
      count
    });
  }
  
  /**
   * Add reaction to a message
   * @param {string} messageId - Message ID
   * @param {string} emoji - Emoji to react with
   * @param {string} [type='emoji'] - Reaction type
   * @returns {Promise<Object>} Reaction details
   */
  async addReaction(messageId, emoji, type = 'emoji') {
    try {
      const response = await api.post(`/reactions/message/${messageId}`, {
        emoji,
        type
      });
      
      // Invalidate cache
      this.cache.delete(`reactions:${messageId}`);
      
      return response.data;
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }
  
  /**
   * Remove reaction from a message
   * @param {string} messageId - Message ID
   * @param {string} emoji - Emoji to remove
   * @returns {Promise<Object>} Response
   */
  async removeReaction(messageId, emoji) {
    try {
      const response = await api.delete(`/reactions/message/${messageId}/emoji/${encodeURIComponent(emoji)}`);
      
      // Invalidate cache
      this.cache.delete(`reactions:${messageId}`);
      
      return response.data;
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }
  
  /**
   * Toggle reaction (add if not exists, remove if exists)
   * @param {string} messageId - Message ID
   * @param {string} emoji - Emoji
   * @param {string} userId - Current user ID
   * @returns {Promise<Object>} Response
   */
  async toggleReaction(messageId, emoji, userId) {
    try {
      // Get current reactions
      const reactions = await this.getMessageReactions(messageId);
      
      // Check if user already reacted with this emoji
      const emojiReaction = reactions.reactions[emoji];
      const hasReacted = emojiReaction && emojiReaction.users.includes(userId);
      
      if (hasReacted) {
        return await this.removeReaction(messageId, emoji);
      } else {
        return await this.addReaction(messageId, emoji);
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      throw error;
    }
  }
  
  /**
   * Get reactions for a message
   * @param {string} messageId - Message ID
   * @param {boolean} [includeUsers=false] - Include user details
   * @returns {Promise<Object>} Message reactions
   */
  async getMessageReactions(messageId, includeUsers = false) {
    try {
      // Check cache
      const cacheKey = `reactions:${messageId}:${includeUsers}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Call API
      const params = includeUsers ? '?include_users=true' : '';
      const response = await api.get(`/reactions/message/${messageId}${params}`);
      const data = response.data;
      
      // Cache results
      this._setCache(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error('Error getting message reactions:', error);
      throw error;
    }
  }
  
  /**
   * Get users who reacted with a specific emoji
   * @param {string} messageId - Message ID
   * @param {string} emoji - Emoji
   * @param {number} [limit=50] - Maximum users
   * @param {number} [offset=0] - Offset for pagination
   * @returns {Promise<Object>} Reaction users
   */
  async getReactionUsers(messageId, emoji, limit = 50, offset = 0) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      const response = await api.get(
        `/reactions/message/${messageId}/emoji/${encodeURIComponent(emoji)}/users?${params.toString()}`
      );
      
      return response.data;
    } catch (error) {
      console.error('Error getting reaction users:', error);
      throw error;
    }
  }
  
  /**
   * Get user's reactions
   * @param {string} userId - User ID
   * @param {number} [limit=20] - Maximum reactions
   * @param {number} [offset=0] - Offset for pagination
   * @returns {Promise<Object>} User reactions
   */
  async getUserReactions(userId, limit = 20, offset = 0) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      const response = await api.get(`/reactions/user/${userId}/reactions?${params.toString()}`);
      
      return response.data;
    } catch (error) {
      console.error('Error getting user reactions:', error);
      throw error;
    }
  }
  
  /**
   * Get popular reactions
   * @param {number} [limit=10] - Maximum reactions
   * @param {string} [period='all'] - Time period ('day', 'week', 'month', 'all')
   * @returns {Promise<Array<Object>>} Popular reactions
   */
  async getPopularReactions(limit = 10, period = 'all') {
    try {
      // Check cache
      const cacheKey = `popular:${limit}:${period}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        return cached.reactions || [];
      }
      
      // Call API
      const params = new URLSearchParams({
        limit: limit.toString(),
        period
      });
      
      const response = await api.get(`/reactions/popular?${params.toString()}`);
      const data = response.data;
      
      // Cache results (longer TTL for popular reactions)
      this._setCache(cacheKey, data, 60 * 60 * 1000); // 1 hour
      
      return data.reactions || [];
    } catch (error) {
      console.error('Error getting popular reactions:', error);
      return this.getDefaultReactions();
    }
  }
  
  /**
   * Get reaction statistics
   * @returns {Promise<Object>} Reaction stats
   */
  async getReactionStats() {
    try {
      const response = await api.get('/reactions/stats');
      return response.data.stats || {};
    } catch (error) {
      console.error('Error getting reaction stats:', error);
      throw error;
    }
  }
  
  /**
   * Get default reactions (quick reactions)
   * @returns {Array<string>} Default emoji reactions
   */
  getDefaultReactions() {
    return [
      '👍', // Thumbs up
      '❤️', // Heart
      '😂', // Laughing
      '🔥', // Fire
      '🎉', // Party
      '👏', // Clap
      '😍', // Heart eyes
      '🤔', // Thinking
      '😢', // Sad
      '💯'  // 100
    ];
  }
  
  /**
   * Get reaction categories
   * @returns {Object} Reaction categories
   */
  getReactionCategories() {
    return {
      'Positive': ['👍', '❤️', '😍', '🥰', '😊', '🎉', '👏', '💯', '🔥', '✨'],
      'Funny': ['😂', '🤣', '😆', '😹', '😸', '🤪', '😜', '😝', '🙃', '😏'],
      'Negative': ['👎', '😢', '😭', '😔', '😞', '😟', '😠', '😡', '🤬', '💔'],
      'Surprised': ['😮', '😲', '😯', '🤯', '😳', '🙀', '😱', '🤭', '😵', '🤐'],
      'Thinking': ['🤔', '🤨', '🧐', '🤓', '😐', '😑', '😶', '🙄', '😬', '🤷'],
      'Support': ['🙏', '🤝', '💪', '✊', '👊', '🤞', '🤟', '👌', '✌️', '🤘']
    };
  }
  
  /**
   * Format reaction count for display
   * @param {number} count - Reaction count
   * @returns {string} Formatted count
   */
  formatReactionCount(count) {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    } else {
      return count.toString();
    }
  }
  
  /**
   * Subscribe to reaction updates for a message
   * @param {string} messageId - Message ID
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(messageId, callback) {
    if (!this.listeners.has(messageId)) {
      this.listeners.set(messageId, new Set());
    }
    
    this.listeners.get(messageId).add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(messageId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(messageId);
        }
      }
    };
  }
  
  /**
   * Notify listeners of reaction updates
   * @private
   * @param {string} messageId - Message ID
   * @param {Object} data - Update data
   */
  _notifyListeners(messageId, data) {
    const listeners = this.listeners.get(messageId);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in reaction listener:', error);
        }
      });
    }
  }
  
  /**
   * Get from cache
   * @private
   * @param {string} key - Cache key
   * @returns {*} Cached value or null
   */
  _getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }
  
  /**
   * Set cache
   * @private
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} [ttl] - Time to live in milliseconds
   */
  _setCache(key, data, ttl) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.cacheTimeout
    });
    
    // Auto-cleanup old cache entries
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }
  
  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default new ReactionService();
