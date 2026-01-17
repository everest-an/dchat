/**
 * PresenceService - User Online Status Management
 * 
 * Manages user presence (online/offline/away/busy status) with real-time tracking
 * and activity detection.
 * 
 * Features:
 * - Real-time activity tracking
 * - Automatic status calculation
 * - Custom status messages
 * - Privacy controls
 * - localStorage persistence
 * - Event-based updates
 * 
 * @version 1.0.0
 * @created 2025-10-30
 */

// Status types
export const PresenceStatus = {
  ONLINE: 'online',
  AWAY: 'away',
  BUSY: 'busy',
  OFFLINE: 'offline'
};

// Time thresholds (in milliseconds)
const THRESHOLDS = {
  ONLINE: 5 * 60 * 1000,      // 5 minutes
  AWAY: 15 * 60 * 1000,       // 15 minutes
  UPDATE_INTERVAL: 30 * 1000   // 30 seconds
};

// Storage keys
const STORAGE_KEYS = {
  PREFIX: 'user_presence_',
  SETTINGS: 'presence_settings'
};

/**
 * PresenceService Class
 * 
 * Manages user presence status with activity tracking and real-time updates
 */
class PresenceService {
  constructor() {
    this.currentUserId = null;
    this.activityListeners = [];
    this.statusChangeCallbacks = [];
    this.updateInterval = null;
    this.lastActivity = Date.now();
    this.isTracking = false;
    
    console.log('✅ PresenceService initialized');
  }

  /**
   * Initialize presence tracking for a user
   * 
   * @param {string} userId - User's wallet address
   * @returns {Object} Initial presence data
   */
  initialize(userId) {
    if (!userId) {
      console.error('❌ PresenceService: userId is required');
      return null;
    }

    console.log(`🚀 PresenceService: Initializing for user ${userId}`);
    
    this.currentUserId = userId;
    this.lastActivity = Date.now();

    // Load or create presence data
    let presence = this.getUserPresence(userId);
    if (!presence) {
      presence = this.createPresence(userId);
    }

    // Update to online status
    presence.status = PresenceStatus.ONLINE;
    presence.lastActivity = new Date().toISOString();
    presence.lastSeen = new Date().toISOString();
    presence.updatedAt = new Date().toISOString();
    
    this.savePresence(userId, presence);

    // Start tracking
    this.startTracking(userId);

    console.log(`✅ PresenceService: Initialized for ${userId}`, presence);
    return presence;
  }

  /**
   * Create new presence object for user
   * 
   * @param {string} userId - User's wallet address
   * @returns {Object} New presence object
   */
  createPresence(userId) {
    const now = new Date().toISOString();
    return {
      userId,
      status: PresenceStatus.ONLINE,
      customStatus: null,
      lastActivity: now,
      lastSeen: now,
      isVisible: true,
      updatedAt: now
    };
  }

  /**
   * Get user's presence data
   * 
   * @param {string} userId - User's wallet address
   * @returns {Object|null} Presence data or null
   */
  getUserPresence(userId) {
    try {
      const key = STORAGE_KEYS.PREFIX + userId;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ Error loading presence:', error);
      return null;
    }
  }

  /**
   * Save user's presence data
   * 
   * @param {string} userId - User's wallet address
   * @param {Object} presence - Presence data
   */
  savePresence(userId, presence) {
    try {
      const key = STORAGE_KEYS.PREFIX + userId;
      presence.updatedAt = new Date().toISOString();
      localStorage.setItem(key, JSON.stringify(presence));
    } catch (error) {
      console.error('❌ Error saving presence:', error);
    }
  }

  /**
   * Get user's current status
   * 
   * @param {string} userId - User's wallet address
   * @returns {Object} Status object with status, lastSeen, customStatus
   */
  getUserStatus(userId) {
    const presence = this.getUserPresence(userId);
    
    if (!presence) {
      return {
        status: PresenceStatus.OFFLINE,
        lastSeen: null,
        customStatus: null,
        isVisible: true
      };
    }

    // Check if custom status has expired
    if (presence.customStatus && presence.customStatus.expiresAt) {
      const expiresAt = new Date(presence.customStatus.expiresAt);
      if (expiresAt < new Date()) {
        presence.customStatus = null;
        this.savePresence(userId, presence);
      }
    }

    // Calculate current status based on last activity
    const calculatedStatus = this.calculateStatus(presence.lastActivity);
    
    // If status changed, update it
    if (calculatedStatus !== presence.status && userId !== this.currentUserId) {
      presence.status = calculatedStatus;
      this.savePresence(userId, presence);
    }

    return {
      status: presence.status,
      lastSeen: presence.lastSeen,
      customStatus: presence.customStatus,
      isVisible: presence.isVisible
    };
  }

  /**
   * Calculate status based on last activity time
   * 
   * @param {string} lastActivity - ISO timestamp of last activity
   * @returns {string} Calculated status
   */
  calculateStatus(lastActivity) {
    if (!lastActivity) {
      return PresenceStatus.OFFLINE;
    }

    const now = Date.now();
    const lastActivityTime = new Date(lastActivity).getTime();
    const diff = now - lastActivityTime;

    if (diff < THRESHOLDS.ONLINE) {
      return PresenceStatus.ONLINE;
    } else if (diff < THRESHOLDS.AWAY) {
      return PresenceStatus.AWAY;
    } else {
      return PresenceStatus.OFFLINE;
    }
  }

  /**
   * Update user's status manually
   * 
   * @param {string} userId - User's wallet address
   * @param {string} status - New status (online/away/busy/offline)
   * @returns {boolean} Success
   */
  updateStatus(userId, status) {
    if (!Object.values(PresenceStatus).includes(status)) {
      console.error('❌ Invalid status:', status);
      return false;
    }

    const presence = this.getUserPresence(userId) || this.createPresence(userId);
    presence.status = status;
    presence.lastActivity = new Date().toISOString();
    
    if (status === PresenceStatus.ONLINE) {
      presence.lastSeen = new Date().toISOString();
    }

    this.savePresence(userId, presence);
    this.notifyStatusChange(userId, status);

    console.log(`✅ Status updated for ${userId}:`, status);
    return true;
  }

  /**
   * Set custom status message
   * 
   * @param {string} userId - User's wallet address
   * @param {string} emoji - Status emoji
   * @param {string} message - Status message
   * @param {number} duration - Duration in minutes (0 = no expiry)
   * @returns {boolean} Success
   */
  setCustomStatus(userId, emoji, message, duration = 0) {
    const presence = this.getUserPresence(userId) || this.createPresence(userId);
    
    const customStatus = {
      emoji: emoji || '',
      message: message || '',
      expiresAt: duration > 0 
        ? new Date(Date.now() + duration * 60 * 1000).toISOString()
        : null
    };

    presence.customStatus = customStatus;
    this.savePresence(userId, presence);
    this.notifyStatusChange(userId, presence.status);

    console.log(`✅ Custom status set for ${userId}:`, customStatus);
    return true;
  }

  /**
   * Clear custom status
   * 
   * @param {string} userId - User's wallet address
   * @returns {boolean} Success
   */
  clearCustomStatus(userId) {
    const presence = this.getUserPresence(userId);
    if (!presence) return false;

    presence.customStatus = null;
    this.savePresence(userId, presence);
    this.notifyStatusChange(userId, presence.status);

    console.log(`✅ Custom status cleared for ${userId}`);
    return true;
  }

  /**
   * Update last activity timestamp
   * 
   * @param {string} userId - User's wallet address
   */
  updateActivity(userId) {
    if (!userId) return;

    this.lastActivity = Date.now();
    
    const presence = this.getUserPresence(userId) || this.createPresence(userId);
    const now = new Date().toISOString();
    
    presence.lastActivity = now;
    presence.lastSeen = now;
    
    // Update to online if not busy
    if (presence.status !== PresenceStatus.BUSY) {
      presence.status = PresenceStatus.ONLINE;
    }
    
    this.savePresence(userId, presence);
  }

  /**
   * Get formatted last seen text
   * 
   * @param {string} lastSeen - ISO timestamp
   * @returns {string} Formatted text (e.g., "5 minutes ago")
   */
  getLastSeenText(lastSeen) {
    if (!lastSeen) return 'Never';

    const now = Date.now();
    const lastSeenTime = new Date(lastSeen).getTime();
    const diff = now - lastSeenTime;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Set status visibility (privacy control)
   * 
   * @param {string} userId - User's wallet address
   * @param {boolean} isVisible - Whether status is visible to others
   * @returns {boolean} Success
   */
  setStatusVisibility(userId, isVisible) {
    const presence = this.getUserPresence(userId) || this.createPresence(userId);
    presence.isVisible = isVisible;
    this.savePresence(userId, presence);

    console.log(`✅ Status visibility set for ${userId}:`, isVisible);
    return true;
  }

  /**
   * Start tracking user activity
   * 
   * @param {string} userId - User's wallet address
   */
  startTracking(userId) {
    if (this.isTracking) {
      console.log('⚠️ Already tracking activity');
      return;
    }

    console.log(`🎯 Starting activity tracking for ${userId}`);
    this.isTracking = true;

    // Throttle function to limit update frequency
    const throttle = (func, delay) => {
      let lastCall = 0;
      return (...args) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
          lastCall = now;
          func(...args);
        }
      };
    };

    // Mouse movement handler (throttled to 1/second)
    const handleMouseMove = throttle(() => {
      this.updateActivity(userId);
    }, 1000);

    // Keyboard handler
    const handleKeyPress = () => {
      this.updateActivity(userId);
    };

    // Window focus handler
    const handleFocus = () => {
      this.updateStatus(userId, PresenceStatus.ONLINE);
      this.updateActivity(userId);
    };

    // Window blur handler
    const handleBlur = () => {
      // Status will be calculated based on inactivity
    };

    // Visibility change handler
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        this.updateActivity(userId);
      }
    };

    // Add event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Store listeners for cleanup
    this.activityListeners = [
      { event: 'mousemove', handler: handleMouseMove },
      { event: 'keydown', handler: handleKeyPress },
      { event: 'focus', handler: handleFocus },
      { event: 'blur', handler: handleBlur },
      { event: 'visibilitychange', handler: handleVisibilityChange, target: document }
    ];

    // Start periodic status update
    this.updateInterval = setInterval(() => {
      this.periodicUpdate(userId);
    }, THRESHOLDS.UPDATE_INTERVAL);

    console.log('✅ Activity tracking started');
  }

  /**
   * Periodic status update
   * 
   * @param {string} userId - User's wallet address
   */
  periodicUpdate(userId) {
    const presence = this.getUserPresence(userId);
    if (!presence) return;

    const calculatedStatus = this.calculateStatus(presence.lastActivity);
    
    // Update status if changed
    if (calculatedStatus !== presence.status && presence.status !== PresenceStatus.BUSY) {
      presence.status = calculatedStatus;
      this.savePresence(userId, presence);
      this.notifyStatusChange(userId, calculatedStatus);
      console.log(`🔄 Status auto-updated to: ${calculatedStatus}`);
    }
  }

  /**
   * Stop tracking user activity
   */
  stopTracking() {
    if (!this.isTracking) return;

    console.log('🛑 Stopping activity tracking');

    // Remove event listeners
    this.activityListeners.forEach(({ event, handler, target }) => {
      (target || window).removeEventListener(event, handler);
    });
    this.activityListeners = [];

    // Clear interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Set to offline
    if (this.currentUserId) {
      this.updateStatus(this.currentUserId, PresenceStatus.OFFLINE);
    }

    this.isTracking = false;
    console.log('✅ Activity tracking stopped');
  }

  /**
   * Subscribe to status changes
   * 
   * @param {Function} callback - Callback function (userId, status)
   * @returns {Function} Unsubscribe function
   */
  onStatusChange(callback) {
    this.statusChangeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all subscribers of status change
   * 
   * @param {string} userId - User's wallet address
   * @param {string} status - New status
   */
  notifyStatusChange(userId, status) {
    this.statusChangeCallbacks.forEach(callback => {
      try {
        callback(userId, status);
      } catch (error) {
        console.error('❌ Error in status change callback:', error);
      }
    });
  }

  /**
   * Get all users with their presence status
   * 
   * @returns {Array} Array of user presence objects
   */
  getAllUserPresences() {
    const presences = [];
    
    // Iterate through localStorage to find all presence data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEYS.PREFIX)) {
        try {
          const data = localStorage.getItem(key);
          const presence = JSON.parse(data);
          
          // Calculate current status
          presence.status = this.calculateStatus(presence.lastActivity);
          
          presences.push(presence);
        } catch (error) {
          console.error('❌ Error loading presence:', error);
        }
      }
    }
    
    return presences;
  }

  /**
   * Clear all presence data (for testing/logout)
   */
  clearAllPresences() {
    const keys = [];
    
    // Collect all presence keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEYS.PREFIX)) {
        keys.push(key);
      }
    }
    
    // Remove all presence data
    keys.forEach(key => localStorage.removeItem(key));
    
    console.log(`✅ Cleared ${keys.length} presence records`);
  }

  /**
   * Cleanup on logout
   */
  cleanup() {
    this.stopTracking();
    
    if (this.currentUserId) {
      this.updateStatus(this.currentUserId, PresenceStatus.OFFLINE);
    }
    
    this.currentUserId = null;
    this.statusChangeCallbacks = [];
    
    console.log('✅ PresenceService cleaned up');
  }
}

// Create and export singleton instance
const presenceService = new PresenceService();
export default presenceService;
