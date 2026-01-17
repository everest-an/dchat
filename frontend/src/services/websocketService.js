/**
 * Native WebSocket Service for Go Backend
 * Replaces Socket.IO with native WebSocket implementation
 */

import { API_CONFIG } from '../config/api.config';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.userId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageHandlers = new Set();
    this.statusHandlers = new Set();
    this.typingHandlers = new Set();
    this.readHandlers = new Set();
    this.heartbeatInterval = null;
  }

  /**
   * Connect to WebSocket server
   * @param {string} token - JWT token for authentication
   * @param {number} userId - User ID
   */
  connect(token, userId) {
    if (this.connected && this.userId === userId) {
      console.log('Already connected to WebSocket server');
      return Promise.resolve();
    }

    // Disconnect existing connection if any
    if (this.ws) {
      this.disconnect();
    }

    this.userId = userId;

    return new Promise((resolve, reject) => {
      const wsUrl = `${API_CONFIG.WS_URL}?token=${encodeURIComponent(token)}`;
      console.log('Connecting to WebSocket server:', wsUrl);

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('✅ Connected to WebSocket server');
          this.connected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('❌ Disconnected from WebSocket server');
          this.connected = false;
          this.stopHeartbeat();
          this.attemptReconnect(token, userId);
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   * @param {Object} message - Parsed message object
   */
  handleMessage(message) {
    console.log('📩 Received message:', message);

    switch (message.type) {
      case 'chat':
        this.messageHandlers.forEach(handler => handler(message));
        break;
      
      case 'status':
        this.statusHandlers.forEach(handler => handler(message));
        break;
      
      case 'typing':
        this.typingHandlers.forEach(handler => handler(message));
        break;
      
      case 'read':
        this.readHandlers.forEach(handler => handler(message));
        break;
      
      case 'sent':
        // Message sent confirmation
        this.messageHandlers.forEach(handler => handler(message));
        break;
      
      case 'pong':
        // Heartbeat response
        break;
      
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  /**
   * Send a message
   * @param {Object} message - Message object
   */
  send(message) {
    if (!this.connected || !this.ws) {
      console.error('Not connected to WebSocket server');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  /**
   * Send a chat message
   * @param {number} toUserId - Recipient user ID
   * @param {string} content - Message content
   * @param {boolean} encrypted - Whether the message is encrypted
   */
  sendChatMessage(toUserId, content, encrypted = false) {
    return this.send({
      type: 'chat',
      to: toUserId,
      content: content,
      encrypted: encrypted,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send typing indicator
   * @param {number} toUserId - Recipient user ID
   */
  sendTyping(toUserId) {
    return this.send({
      type: 'typing',
      to: toUserId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send read receipt
   * @param {number} fromUserId - Sender user ID
   */
  sendReadReceipt(fromUserId) {
    return this.send({
      type: 'read',
      from: fromUserId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Register a message handler
   * @param {Function} handler - Callback function for new messages
   * @returns {Function} Unsubscribe function
   */
  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Register a status handler
   * @param {Function} handler - Callback function for status changes
   * @returns {Function} Unsubscribe function
   */
  onStatus(handler) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  /**
   * Register a typing handler
   * @param {Function} handler - Callback function for typing indicators
   * @returns {Function} Unsubscribe function
   */
  onTyping(handler) {
    this.typingHandlers.add(handler);
    return () => this.typingHandlers.delete(handler);
  }

  /**
   * Register a read receipt handler
   * @param {Function} handler - Callback function for read receipts
   * @returns {Function} Unsubscribe function
   */
  onRead(handler) {
    this.readHandlers.add(handler);
    return () => this.readHandlers.delete(handler);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.connected) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempt to reconnect
   * @param {string} token - JWT token
   * @param {number} userId - User ID
   */
  attemptReconnect(token, userId) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect(token, userId).catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connected = false;
    this.userId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return this.connected;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
