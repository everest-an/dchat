/**
 * Socket.IO Client Service
 * Handles real-time communication with the backend
 */

import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.userId = null;
    this.messageHandlers = new Set();
    this.statusHandlers = new Set();
    this.typingHandlers = new Set();
    this.messageStatusHandlers = new Set();
  }

  /**
   * Connect to Socket.IO server
   * @param {string} userId - User ID for authentication
   */
  connect(userId) {
    if (this.connected && this.userId === userId) {
      console.log('Already connected to Socket.IO server');
      return;
    }

    // Disconnect existing connection if any
    if (this.socket) {
      this.disconnect();
    }

    // Socket.IO server URL - use environment variable or default
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8001';

    console.log('Connecting to Socket.IO server:', SOCKET_URL);

    // Create socket connection
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.userId = userId;

    // Set up event listeners
    this.setupEventListeners();

    // Authenticate after connection
    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      this.connected = true;
      this.authenticate(userId);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
      this.connected = false;
    });

    this.socket.on('error', (error) => {
      console.error('Socket.IO error:', error);
    });
  }

  /**
   * Authenticate with the server
   * @param {string} userId - User ID
   */
  authenticate(userId) {
    if (!this.socket) return;

    this.socket.emit('authenticate', {
      user_id: userId
    });

    this.socket.once('authenticated', (data) => {
      console.log('Authenticated as:', data.user_id);
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.userId = null;
    }
  }

  /**
   * Set up event listeners for incoming messages
   */
  setupEventListeners() {
    if (!this.socket) return;

    // New message received
    this.socket.on('new_message', (data) => {
      console.log('New message received:', data);
      this.messageHandlers.forEach(handler => handler(data));
    });

    // User status changed
    this.socket.on('user_status', (data) => {
      console.log('User status changed:', data);
      this.statusHandlers.forEach(handler => handler(data));
    });

    // User typing indicator
    this.socket.on('user_typing', (data) => {
      console.log('User typing:', data);
      this.typingHandlers.forEach(handler => handler(data));
    });

    // User joined room
    this.socket.on('user_joined', (data) => {
      console.log('User joined room:', data);
    });

    // User left room
    this.socket.on('user_left', (data) => {
      console.log('User left room:', data);
    });

    // Room joined confirmation
    this.socket.on('room_joined', (data) => {
      console.log('Joined room:', data.room_id);
    });

    // Message status updates (delivered/read)
    this.socket.on('message_status', (data) => {
      console.log('Message status update:', data);
      this.messageStatusHandlers.forEach(handler => handler(data));
    });

    // All messages read notification
    this.socket.on('all_messages_read', (data) => {
      console.log('All messages read:', data);
      this.messageStatusHandlers.forEach(handler => handler({
        ...data,
        status: 'all_read'
      }));
    });
  }

  /**
   * Join a chat room
   * @param {string} roomId - Room ID to join
   */
  joinRoom(roomId) {
    if (!this.socket || !this.connected) {
      console.error('Not connected to Socket.IO server');
      return;
    }

    this.socket.emit('join_room', {
      room_id: roomId
    });
  }

  /**
   * Leave a chat room
   * @param {string} roomId - Room ID to leave
   */
  leaveRoom(roomId) {
    if (!this.socket || !this.connected) {
      return;
    }

    this.socket.emit('leave_room', {
      room_id: roomId
    });
  }

  /**
   * Send a message to a room
   * @param {string} roomId - Room ID
   * @param {string} message - Message content
   * @param {string} messageId - Unique message ID
   */
  sendMessage(roomId, message, messageId = null) {
    if (!this.socket || !this.connected) {
      console.error('Not connected to Socket.IO server');
      return;
    }

    const msgId = messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.socket.emit('send_message', {
      room_id: roomId,
      message: message,
      message_id: msgId,
      timestamp: Date.now()
    });

    return msgId;
  }

  /**
   * Notify that user is typing
   * @param {string} roomId - Room ID
   */
  startTyping(roomId) {
    if (!this.socket || !this.connected) {
      return;
    }

    this.socket.emit('typing_start', {
      room_id: roomId
    });
  }

  /**
   * Notify that user stopped typing
   * @param {string} roomId - Room ID
   */
  stopTyping(roomId) {
    if (!this.socket || !this.connected) {
      return;
    }

    this.socket.emit('typing_stop', {
      room_id: roomId
    });
  }

  /**
   * Get list of online users
   */
  getOnlineUsers() {
    if (!this.socket || !this.connected) {
      return;
    }

    this.socket.emit('get_online_users', {});

    return new Promise((resolve) => {
      this.socket.once('online_users', (data) => {
        resolve(data.users);
      });
    });
  }

  /**
   * Register a message handler
   * @param {Function} handler - Callback function for new messages
   */
  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Register a status handler
   * @param {Function} handler - Callback function for status changes
   */
  onStatus(handler) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  /**
   * Mark message as delivered
   * @param {string} messageId - Message ID
   * @param {string} roomId - Room ID
   */
  markMessageDelivered(messageId, roomId) {
    if (!this.socket || !this.connected) {
      return;
    }

    this.socket.emit('message_delivered', {
      message_id: messageId,
      room_id: roomId
    });
  }

  /**
   * Mark message as read
   * @param {string} messageId - Message ID
   * @param {string} roomId - Room ID
   */
  markMessageRead(messageId, roomId) {
    if (!this.socket || !this.connected) {
      return;
    }

    this.socket.emit('message_read', {
      message_id: messageId,
      room_id: roomId
    });
  }

  /**
   * Mark all messages in a room as read
   * @param {string} roomId - Room ID
   */
  markAllRead(roomId) {
    if (!this.socket || !this.connected) {
      return;
    }

    this.socket.emit('mark_all_read', {
      room_id: roomId
    });
  }

  /**
   * Register a message status handler
   * @param {Function} handler - Callback function for message status updates
   */
  onMessageStatus(handler) {
    this.messageStatusHandlers.add(handler);
    return () => this.messageStatusHandlers.delete(handler);
  }

  /**
   * Register a typing handler
   * @param {Function} handler - Callback function for typing indicators
   */
  onTyping(handler) {
    this.typingHandlers.add(handler);
    return () => this.typingHandlers.delete(handler);
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
