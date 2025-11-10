/**
 * Group Chat Example Component
 * Demonstrates how to use Web3GroupService and socketService
 * 
 * This is a reference implementation showing best practices for:
 * - Creating and managing groups
 * - Sending and receiving messages
 * - Real-time updates via Socket.IO
 * - Message status tracking (delivered/read)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Web3GroupService } from '../services/Web3GroupService';
import { socketService } from '../services/socketService';

const GroupChatExample = () => {
  // State management
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Initialize services
  const groupService = new Web3GroupService();
  
  // Load user's groups on mount
  useEffect(() => {
    loadUserGroups();
    
    // Connect to Socket.IO
    const userAddress = localStorage.getItem('wallet_address');
    if (userAddress) {
      socketService.connect(userAddress);
    }
    
    // Setup Socket.IO event listeners
    const unsubscribeMessage = socketService.onMessage(handleNewMessage);
    const unsubscribeStatus = socketService.onMessageStatus(handleMessageStatus);
    const unsubscribeTyping = socketService.onTyping(handleTypingIndicator);
    
    // Cleanup on unmount
    return () => {
      unsubscribeMessage();
      unsubscribeStatus();
      unsubscribeTyping();
      socketService.disconnect();
    };
  }, []);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Load user's groups
  const loadUserGroups = async () => {
    try {
      setLoading(true);
      const userAddress = localStorage.getItem('wallet_address');
      const response = await groupService.getUserGroups(userAddress);
      
      if (response.success) {
        setGroups(response.groups);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Failed to load groups: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Create a new group
  const createGroup = async () => {
    const groupName = prompt('Enter group name:');
    if (!groupName) return;
    
    try {
      setLoading(true);
      const response = await groupService.createGroup({
        name: groupName,
        description: 'Created via Web3GroupService',
        is_public: false
      });
      
      if (response.success) {
        alert('Group created successfully!');
        loadUserGroups();
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Failed to create group: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Select a group and join its room
  const selectGroup = async (group) => {
    setSelectedGroup(group);
    setMessages([]);
    
    // Join Socket.IO room
    socketService.joinRoom(group.id);
    
    // Load group messages (from backend API)
    // TODO: Implement loadGroupMessages API
    
    // Mark all messages as read
    socketService.markAllRead(group.id);
  };
  
  // Send a message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup) return;
    
    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Send via Socket.IO for real-time delivery
      socketService.sendMessage(selectedGroup.id, newMessage, messageId);
      
      // Add to local state immediately (optimistic update)
      const message = {
        id: messageId,
        room_id: selectedGroup.id,
        user_id: localStorage.getItem('wallet_address'),
        message: newMessage,
        timestamp: Date.now(),
        status: 'sending'
      };
      
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      
      // Stop typing indicator
      socketService.stopTyping(selectedGroup.id);
      
      // TODO: Also save to backend for persistence
      // await groupService.sendGroupMessage(selectedGroup.id, newMessage);
      
    } catch (err) {
      setError('Failed to send message: ' + err.message);
    }
  };
  
  // Handle incoming messages
  const handleNewMessage = (data) => {
    if (data.room_id === selectedGroup?.id) {
      setMessages(prev => {
        // Check if message already exists (avoid duplicates)
        const exists = prev.some(msg => msg.id === data.message_id);
        if (exists) return prev;
        
        return [...prev, {
          id: data.message_id,
          room_id: data.room_id,
          user_id: data.user_id,
          message: data.message,
          timestamp: data.timestamp,
          status: 'delivered'
        }];
      });
      
      // Mark as delivered
      socketService.markMessageDelivered(data.message_id, data.room_id);
      
      // Mark as read if user is viewing the chat
      if (document.hasFocus()) {
        socketService.markMessageRead(data.message_id, data.room_id);
      }
    }
  };
  
  // Handle message status updates
  const handleMessageStatus = (data) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === data.message_id) {
        return { ...msg, status: data.status };
      }
      return msg;
    }));
  };
  
  // Handle typing indicator
  const handleTypingIndicator = (data) => {
    if (data.room_id === selectedGroup?.id) {
      setIsTyping(data.typing);
    }
  };
  
  // Handle input change and typing indicator
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
    if (!isTyping && selectedGroup) {
      socketService.startTyping(selectedGroup.id);
      setIsTyping(true);
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedGroup) {
        socketService.stopTyping(selectedGroup.id);
        setIsTyping(false);
      }
    }, 2000);
  };
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Invite member to group
  const inviteMember = async () => {
    if (!selectedGroup) return;
    
    const memberAddress = prompt('Enter member wallet address:');
    if (!memberAddress) return;
    
    try {
      setLoading(true);
      const response = await groupService.inviteMember(selectedGroup.id, memberAddress);
      
      if (response.success) {
        alert('Member invited successfully!');
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Failed to invite member: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Leave group
  const leaveGroup = async () => {
    if (!selectedGroup) return;
    
    if (!confirm('Are you sure you want to leave this group?')) return;
    
    try:
      setLoading(true);
      const response = await groupService.leaveGroup(selectedGroup.id);
      
      if (response.success) {
        alert('Left group successfully!');
        socketService.leaveRoom(selectedGroup.id);
        setSelectedGroup(null);
        loadUserGroups();
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Failed to leave group: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="group-chat-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Groups</h2>
          <button onClick={createGroup} disabled={loading}>
            + New Group
          </button>
        </div>
        
        <div className="groups-list">
          {groups.map(group => (
            <div
              key={group.id}
              className={`group-item ${selectedGroup?.id === group.id ? 'active' : ''}`}
              onClick={() => selectGroup(group)}
            >
              <h3>{group.name}</h3>
              <p>{group.member_count} members</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="chat-area">
        {selectedGroup ? (
          <>
            <div className="chat-header">
              <h2>{selectedGroup.name}</h2>
              <div className="chat-actions">
                <button onClick={inviteMember}>Invite Member</button>
                <button onClick={leaveGroup}>Leave Group</button>
              </div>
            </div>
            
            <div className="messages-container">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`message ${msg.user_id === localStorage.getItem('wallet_address') ? 'own' : 'other'}`}
                >
                  <div className="message-header">
                    <span className="message-sender">{msg.user_id.slice(0, 10)}...</span>
                    <span className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="message-content">{msg.message}</div>
                  <div className="message-status">
                    {msg.status === 'sending' && '⏳'}
                    {msg.status === 'delivered' && '✓'}
                    {msg.status === 'read' && '✓✓'}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {isTyping && (
              <div className="typing-indicator">
                Someone is typing...
              </div>
            )}
            
            <div className="message-input">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                disabled={loading}
              />
              <button onClick={sendMessage} disabled={loading || !newMessage.trim()}>
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="no-group-selected">
            <p>Select a group to start chatting</p>
          </div>
        )}
      </div>
      
      {error && (
        <div className="error-toast">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
    </div>
  );
};

export default GroupChatExample;
