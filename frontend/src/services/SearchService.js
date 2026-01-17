/**
 * Search Service
 * 
 * Provides full-text search functionality for messages, users, files, and groups.
 * Integrates with backend search API.
 * 
 * Features:
 * - Message search with filters
 * - User search
 * - Universal search (all types)
 * - Search suggestions
 * - Search history
 * 
 * @author Manus AI
 * @date 2024-11-05
 */

import api from './api';

class SearchService {
  constructor() {
    this.searchCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }
  
  /**
   * Search messages
   * @param {Object} options - Search options
   * @param {string} options.query - Search query
   * @param {string} [options.userId] - Filter by sender user ID
   * @param {string} [options.conversationId] - Filter by conversation
   * @param {string} [options.startDate] - Filter by start date (ISO format)
   * @param {string} [options.endDate] - Filter by end date (ISO format)
   * @param {number} [options.limit=20] - Maximum results
   * @param {number} [options.offset=0] - Offset for pagination
   * @returns {Promise<Object>} Search results
   */
  async searchMessages({
    query,
    userId,
    conversationId,
    startDate,
    endDate,
    limit = 20,
    offset = 0
  }) {
    try {
      // Check cache
      const cacheKey = `messages:${query}:${userId}:${conversationId}:${startDate}:${endDate}:${limit}:${offset}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      if (userId) params.append('user_id', userId);
      if (conversationId) params.append('conversation_id', conversationId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      // Call API
      const response = await api.get(`/search/messages?${params.toString()}`);
      const data = response.data;
      
      // Cache results
      this._setCache(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }
  
  /**
   * Search users
   * @param {Object} options - Search options
   * @param {string} options.query - Search query
   * @param {number} [options.limit=20] - Maximum results
   * @param {number} [options.offset=0] - Offset for pagination
   * @returns {Promise<Object>} Search results
   */
  async searchUsers({ query, limit = 20, offset = 0 }) {
    try {
      // Check cache
      const cacheKey = `users:${query}:${limit}:${offset}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      // Call API
      const response = await api.get(`/search/users?${params.toString()}`);
      const data = response.data;
      
      // Cache results
      this._setCache(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }
  
  /**
   * Search across all content types
   * @param {Object} options - Search options
   * @param {string} options.query - Search query
   * @param {Array<string>} [options.types=['messages', 'users']] - Types to search
   * @param {number} [options.limit=5] - Maximum results per type
   * @returns {Promise<Object>} Search results grouped by type
   */
  async searchAll({ query, types = ['messages', 'users'], limit = 5 }) {
    try {
      // Check cache
      const cacheKey = `all:${query}:${types.join(',')}:${limit}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        q: query,
        types: types.join(','),
        limit: limit.toString()
      });
      
      // Call API
      const response = await api.get(`/search/all?${params.toString()}`);
      const data = response.data;
      
      // Cache results
      this._setCache(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error('Error searching all:', error);
      throw error;
    }
  }
  
  /**
   * Get search suggestions
   * @param {string} query - Partial search query
   * @param {number} [limit=10] - Maximum suggestions
   * @returns {Promise<Array<string>>} Search suggestions
   */
  async getSuggestions(query, limit = 10) {
    try {
      if (!query || query.length < 1) {
        return [];
      }
      
      // Check cache
      const cacheKey = `suggestions:${query}:${limit}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        return cached.suggestions || [];
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString()
      });
      
      // Call API
      const response = await api.get(`/search/suggestions?${params.toString()}`);
      const data = response.data;
      
      // Cache results (shorter TTL for suggestions)
      this._setCache(cacheKey, data, 60 * 1000); // 1 minute
      
      return data.suggestions || [];
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }
  
  /**
   * Get search history
   * @param {number} [limit=20] - Maximum history items
   * @returns {Promise<Array<Object>>} Search history
   */
  async getHistory(limit = 20) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString()
      });
      
      const response = await api.get(`/search/history?${params.toString()}`);
      return response.data.history || [];
    } catch (error) {
      console.error('Error getting search history:', error);
      return [];
    }
  }
  
  /**
   * Clear search history
   * @returns {Promise<void>}
   */
  async clearHistory() {
    try {
      await api.delete('/search/history');
    } catch (error) {
      console.error('Error clearing search history:', error);
      throw error;
    }
  }
  
  /**
   * Highlight search terms in text
   * @param {string} text - Text to highlight
   * @param {string} query - Search query
   * @returns {string} HTML with highlighted terms
   */
  highlightText(text, query) {
    if (!query || !text) {
      return text;
    }
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
  
  /**
   * Parse search query for advanced syntax
   * @param {string} query - Search query
   * @returns {Object} Parsed query with filters
   */
  parseQuery(query) {
    const filters = {
      query: query,
      from: null,
      to: null,
      date: null,
      type: null
    };
    
    // Extract filters from query
    // Examples:
    // - "hello from:john" -> query="hello", from="john"
    // - "meeting date:2024-11-05" -> query="meeting", date="2024-11-05"
    
    const fromMatch = query.match(/from:(\S+)/);
    if (fromMatch) {
      filters.from = fromMatch[1];
      filters.query = query.replace(/from:\S+/, '').trim();
    }
    
    const toMatch = query.match(/to:(\S+)/);
    if (toMatch) {
      filters.to = toMatch[1];
      filters.query = query.replace(/to:\S+/, '').trim();
    }
    
    const dateMatch = query.match(/date:(\S+)/);
    if (dateMatch) {
      filters.date = dateMatch[1];
      filters.query = query.replace(/date:\S+/, '').trim();
    }
    
    const typeMatch = query.match(/type:(\S+)/);
    if (typeMatch) {
      filters.type = typeMatch[1];
      filters.query = query.replace(/type:\S+/, '').trim();
    }
    
    return filters;
  }
  
  /**
   * Get from cache
   * @private
   * @param {string} key - Cache key
   * @returns {*} Cached value or null
   */
  _getFromCache(key) {
    const cached = this.searchCache.get(key);
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
    this.searchCache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Auto-cleanup old cache entries
    if (this.searchCache.size > 100) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }
  }
  
  /**
   * Clear all cache
   */
  clearCache() {
    this.searchCache.clear();
  }
}

export default new SearchService();
