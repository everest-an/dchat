/**
 * Sticker and GIF Service
 * 
 * Provides sticker and GIF functionality for chat messages.
 * Integrates with backend API for GIF search and sticker management.
 * 
 * Features:
 * - GIF search via Tenor
 * - Trending GIFs
 * - GIF categories
 * - Favorite stickers/GIFs
 * - Recent stickers/GIFs
 * - Emoji search
 * 
 * @author Manus AI
 * @date 2024-11-05
 */

import api from './api';

class StickerService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }
  
  /**
   * Search GIFs
   * @param {Object} options - Search options
   * @param {string} options.query - Search query
   * @param {number} [options.limit=20] - Maximum results
   * @param {string} [options.pos] - Position for pagination
   * @param {string} [options.locale='en_US'] - Language code
   * @returns {Promise<Object>} Search results
   */
  async searchGifs({ query, limit = 20, pos, locale = 'en_US' }) {
    try {
      // Check cache
      const cacheKey = `gifs:search:${query}:${limit}:${pos}:${locale}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        locale
      });
      
      if (pos) params.append('pos', pos);
      
      // Call API
      const response = await api.get(`/stickers/gifs/search?${params.toString()}`);
      const data = response.data;
      
      // Cache results
      this._setCache(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error('Error searching GIFs:', error);
      throw error;
    }
  }
  
  /**
   * Get trending GIFs
   * @param {Object} options - Options
   * @param {number} [options.limit=20] - Maximum results
   * @param {string} [options.pos] - Position for pagination
   * @param {string} [options.locale='en_US'] - Language code
   * @returns {Promise<Object>} Trending GIFs
   */
  async getTrendingGifs({ limit = 20, pos, locale = 'en_US' } = {}) {
    try {
      // Check cache
      const cacheKey = `gifs:trending:${limit}:${pos}:${locale}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        limit: limit.toString(),
        locale
      });
      
      if (pos) params.append('pos', pos);
      
      // Call API
      const response = await api.get(`/stickers/gifs/trending?${params.toString()}`);
      const data = response.data;
      
      // Cache results
      this._setCache(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error('Error getting trending GIFs:', error);
      throw error;
    }
  }
  
  /**
   * Get GIF categories
   * @param {string} [locale='en_US'] - Language code
   * @returns {Promise<Object>} GIF categories
   */
  async getGifCategories(locale = 'en_US') {
    try {
      // Check cache
      const cacheKey = `gifs:categories:${locale}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Call API
      const response = await api.get(`/stickers/gifs/categories?locale=${locale}`);
      const data = response.data;
      
      // Cache results (longer TTL for categories)
      this._setCache(cacheKey, data, 24 * 60 * 60 * 1000); // 24 hours
      
      return data;
    } catch (error) {
      console.error('Error getting GIF categories:', error);
      throw error;
    }
  }
  
  /**
   * Get favorite stickers and GIFs
   * @returns {Promise<Array<Object>>} Favorite stickers
   */
  async getFavorites() {
    try {
      const response = await api.get('/stickers/favorites');
      return response.data.favorites || [];
    } catch (error) {
      console.error('Error getting favorites:', error);
      throw error;
    }
  }
  
  /**
   * Add sticker or GIF to favorites
   * @param {Object} sticker - Sticker data
   * @param {string} sticker.id - Sticker ID
   * @param {string} sticker.type - Type ('gif' or 'sticker')
   * @param {string} sticker.url - Sticker URL
   * @param {string} [sticker.title] - Sticker title
   * @param {string} [sticker.thumbnail_url] - Thumbnail URL
   * @returns {Promise<Object>} Added favorite
   */
  async addFavorite(sticker) {
    try {
      const response = await api.post('/stickers/favorites', sticker);
      return response.data.favorite;
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  }
  
  /**
   * Remove sticker or GIF from favorites
   * @param {string} stickerId - Sticker ID
   * @returns {Promise<void>}
   */
  async removeFavorite(stickerId) {
    try {
      await api.delete(`/stickers/favorites/${stickerId}`);
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  }
  
  /**
   * Get recently used stickers and GIFs
   * @param {number} [limit=20] - Maximum results
   * @returns {Promise<Array<Object>>} Recent stickers
   */
  async getRecent(limit = 20) {
    try {
      const response = await api.get(`/stickers/recent?limit=${limit}`);
      return response.data.recent || [];
    } catch (error) {
      console.error('Error getting recent stickers:', error);
      throw error;
    }
  }
  
  /**
   * Add sticker or GIF to recent history
   * @param {Object} sticker - Sticker data
   * @param {string} sticker.id - Sticker ID
   * @param {string} sticker.type - Type ('gif' or 'sticker')
   * @param {string} sticker.url - Sticker URL
   * @param {string} [sticker.title] - Sticker title
   * @param {string} [sticker.thumbnail_url] - Thumbnail URL
   * @returns {Promise<Object>} Added recent sticker
   */
  async addRecent(sticker) {
    try {
      const response = await api.post('/stickers/recent', sticker);
      return response.data.recent;
    } catch (error) {
      console.error('Error adding recent sticker:', error);
      throw error;
    }
  }
  
  /**
   * Search emoji by keyword
   * @param {string} query - Search query
   * @param {number} [limit=20] - Maximum results
   * @returns {Promise<Array<string>>} Emoji results
   */
  async searchEmoji(query, limit = 20) {
    try {
      if (!query || query.length < 1) {
        return [];
      }
      
      // Check cache
      const cacheKey = `emoji:search:${query}:${limit}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        return cached.results || [];
      }
      
      // Call API
      const response = await api.get(`/stickers/emoji/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      const data = response.data;
      
      // Cache results
      this._setCache(cacheKey, data);
      
      return data.results || [];
    } catch (error) {
      console.error('Error searching emoji:', error);
      return [];
    }
  }
  
  /**
   * Get popular emoji
   * @returns {Array<string>} Popular emoji
   */
  getPopularEmoji() {
    return [
      '😊', '😂', '❤️', '👍', '😍',
      '😭', '🔥', '🎉', '💕', '✨',
      '😎', '🥰', '😢', '🙏', '💯',
      '😅', '😘', '🤔', '😉', '👏'
    ];
  }
  
  /**
   * Get emoji categories
   * @returns {Object} Emoji categories
   */
  getEmojiCategories() {
    return {
      'Smileys & People': [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
        '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
        '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
        '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏'
      ],
      'Animals & Nature': [
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
        '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
        '🌸', '🌺', '🌻', '🌷', '🌹', '🌿', '🍀', '🌾'
      ],
      'Food & Drink': [
        '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈',
        '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆',
        '🍕', '🍔', '🍟', '🌭', '🍿', '🧈', '🍳', '🥞'
      ],
      'Activities': [
        '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉',
        '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏',
        '🎮', '🎯', '🎲', '🎰', '🎳', '🎪', '🎨', '🎭'
      ],
      'Travel & Places': [
        '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑',
        '🚒', '🚐', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵',
        '✈️', '🚁', '🚂', '🚊', '🚝', '🚄', '🚅', '🚆'
      ],
      'Objects': [
        '⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️',
        '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥',
        '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️'
      ],
      'Symbols': [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
        '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
        '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️'
      ],
      'Flags': [
        '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️',
        '🇺🇳', '🇺🇸', '🇬🇧', '🇨🇳', '🇯🇵', '🇰🇷', '🇫🇷', '🇩🇪'
      ]
    };
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

export default new StickerService();
