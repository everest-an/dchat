import React, { useState, useEffect, useCallback } from 'react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  Sidebar,
  Search,
  ConversationList,
  Conversation,
  Avatar,
  ConversationHeader,
  MessageSeparator,
  TypingIndicator
} from '@chatscope/chat-ui-kit-react';
import { socketService } from '../services/socketService';
import { apiCall, API_ENDPOINTS } from '../config/api';
import VerificationBadge from './PrivadoID/VerificationBadge';
import PrivadoIDService from '../services/privadoid/PrivadoIDService';

// Demo data for fallback mode
const DEMO_CONVERSATIONS = [
  {
    id: 'demo-1',
    name: "Alice Johnson",
    lastMessage: "Hey, how are you?",
    time: "5m ago",
    unread: 2,
    avatar: "https://ui-avatars.com/api/?name=Alice+Johnson&background=4F46E5&color=fff",
    userId: 101,
    verifications: [
      { verification_type: 'kyc_humanity', status: 'active', verified_at: '2025-01-10', issuer_did: 'did:polygonid:demo' }
    ]
  },
  {
    id: 'demo-2',
    name: "Bob Smith",
    lastMessage: "Let's discuss the project",
    time: "1h ago",
    unread: 0,
    avatar: "https://ui-avatars.com/api/?name=Bob+Smith&background=10B981&color=fff",
    userId: 102,
    verifications: [
      { verification_type: 'kyb_registration', status: 'active', verified_at: '2025-01-08', issuer_did: 'did:polygonid:demo' },
      { verification_type: 'kyc_humanity', status: 'active', verified_at: '2025-01-05', issuer_did: 'did:polygonid:demo' }
    ]
  },
  {
    id: 'demo-3',
    name: "Carol White",
    lastMessage: "Thanks for the update!",
    time: "3h ago",
    unread: 1,
    avatar: "https://ui-avatars.com/api/?name=Carol+White&background=F59E0B&color=fff",
    userId: 103,
    verifications: []
  }
];

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      message: "Welcome to Dchat! This is a secure, decentralized messaging platform.",
      sentTime: "just now",
      sender: "System",
      direction: "incoming",
      position: "single"
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [conversations, setConversations] = useState(DEMO_CONVERSATIONS);
  const [activeConversation, setActiveConversation] = useState(DEMO_CONVERSATIONS[0]);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize socket connection and load data
  useEffect(() => {
    const initChat = async () => {
      setIsLoading(true);
      
      try {
        // Get user info from localStorage
        const authToken = localStorage.getItem('authToken');
        const userDataStr = localStorage.getItem('userData');
        const userData = userDataStr ? JSON.parse(userDataStr) : null;
        const userId = userData?.walletAddress || userData?.id || 'anonymous';

        // Try to load conversations from backend
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'https://backend-op1c06n9l-everest-ans-projects.vercel.app';
          const response = await fetch(`${API_URL}/api/conversations`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.conversations && data.conversations.length > 0) {
              setConversations(data.conversations);
              setActiveConversation(data.conversations[0]);
              setIsDemoMode(false);
            }
          }
        } catch (err) {
          console.log('Backend unavailable, using demo mode');
        }

        // Connect to socket
        socketService.connect(userId);
        
        // Check connection status
        setTimeout(() => {
          setIsConnected(socketService.isConnected());
        }, 2000);

      } catch (err) {
        console.error('Chat initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initChat();

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Handle incoming messages from socket
  useEffect(() => {
    const unsubscribe = socketService.onMessage((data) => {
      const newMessage = {
        id: Date.now(),
        message: data.message || data.content,
        sentTime: "just now",
        sender: data.sender || data.username || "Unknown",
        direction: "incoming",
        position: "single"
      };
      setMessages(prev => [...prev, newMessage]);
    });

    return () => unsubscribe && unsubscribe();
  }, []);

  // Handle typing indicators
  useEffect(() => {
    const unsubscribe = socketService.onTyping((data) => {
      if (data.room_id === activeConversation?.id) {
        setIsTyping(data.isTyping !== false);
        // Auto-clear typing indicator after 3 seconds
        setTimeout(() => setIsTyping(false), 3000);
      }
    });

    return () => unsubscribe && unsubscribe();
  }, [activeConversation]);

  const handleSend = useCallback((message) => {
    if (message.trim() === '') return;

    const newMessage = {
      id: Date.now(),
      message: message,
      sentTime: "just now",
      sender: "You",
      direction: "outgoing",
      position: "single"
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');

    // Send via socket if connected
    if (isConnected && activeConversation) {
      socketService.sendMessage(activeConversation.id, message);
    }

    // Demo mode: simulate response
    if (isDemoMode) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const responseMessage = {
          id: Date.now() + 1,
          message: "Thanks for your message! This is a demo response. Connect to the backend for real messaging.",
          sentTime: "just now",
          sender: activeConversation.name,
          direction: "incoming",
          position: "single"
        };
        setMessages(prev => [...prev, responseMessage]);
      }, 2000);
    }
  }, [isConnected, isDemoMode, activeConversation]);

  const handleConversationClick = useCallback((conversation) => {
    setActiveConversation(conversation);
    // Mark as read
    setConversations(prev => prev.map(conv => 
      conv.id === conversation.id ? { ...conv, unread: 0 } : conv
    ));
    
    // Join room via socket
    if (isConnected) {
      socketService.joinRoom(conversation.id);
    }
  }, [isConnected]);

  if (isLoading) {
    return (
      <div style={{ 
        position: 'relative', 
        height: '100vh', 
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #e5e7eb',
            borderTopColor: '#000',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#6b7280' }}>Loading chat...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#fef3c7',
          color: '#92400e',
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: '14px',
          zIndex: 1000,
          borderBottom: '1px solid #fcd34d'
        }}>
          🔔 Demo Mode - Messages are simulated. Connect to backend for real messaging.
        </div>
      )}
      
      <MainContainer style={{ border: 'none', paddingTop: isDemoMode ? '40px' : 0 }}>
        <Sidebar position="left" scrollable={false}>
          <Search placeholder="Search conversations..." />
          <ConversationList>
            {conversations.map((conversation) => (
              <Conversation
                key={conversation.id}
                name={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{conversation.name}</span>
                    {/* 在会话列表显示验证徽章 */}
                    {conversation.verifications && conversation.verifications.filter(v => v.status === 'active').length > 0 && (
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {conversation.verifications.filter(v => v.status === 'active').slice(0, 2).map((v, idx) => (
                          <VerificationBadge 
                            key={idx} 
                            verification={v} 
                            size="small" 
                            showLabel={false}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                }
                lastSenderName={conversation.name}
                info={conversation.lastMessage}
                active={activeConversation.id === conversation.id}
                unreadCnt={conversation.unread}
                onClick={() => handleConversationClick(conversation)}
              >
                <Avatar src={conversation.avatar} name={conversation.name} />
              </Conversation>
            ))}
          </ConversationList>
        </Sidebar>

        <ChatContainer>
          <ConversationHeader>
            <ConversationHeader.Back />
            <Avatar src={activeConversation.avatar} name={activeConversation.name} />
            <ConversationHeader.Content
              userName={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{activeConversation.name}</span>
                  {/* 在会话头部显示验证徽章 */}
                  {activeConversation.verifications && activeConversation.verifications.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {activeConversation.verifications.filter(v => v.status === 'active').slice(0, 3).map((v, idx) => (
                        <VerificationBadge 
                          key={idx} 
                          verification={v} 
                          size="small" 
                          showLabel={false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              }
              info="Active now"
            />
            <ConversationHeader.Actions>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  fontSize: '20px',
                  color: '#4F46E5',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => e.target.style.color = '#3730A3'}
                onMouseLeave={(e) => e.target.style.color = '#4F46E5'}
                title="Voice Call"
              >
                📞
              </button>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  fontSize: '20px',
                  color: '#4F46E5',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => e.target.style.color = '#3730A3'}
                onMouseLeave={(e) => e.target.style.color = '#4F46E5'}
                title="Video Call"
              >
                📹
              </button>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  fontSize: '20px',
                  color: '#4F46E5',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => e.target.style.color = '#3730A3'}
                onMouseLeave={(e) => e.target.style.color = '#4F46E5'}
                title="More Options"
              >
                ⋮
              </button>
            </ConversationHeader.Actions>
          </ConversationHeader>

          <MessageList
            typingIndicator={isTyping && <TypingIndicator content={`${activeConversation.name} is typing`} />}
          >
            <MessageSeparator content="Today" />
            {messages.map((msg) => (
              <Message
                key={msg.id}
                model={{
                  message: msg.message,
                  sentTime: msg.sentTime,
                  sender: msg.sender,
                  direction: msg.direction,
                  position: msg.position
                }}
              >
                {msg.direction === 'incoming' && (
                  <Message.Header>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 500, fontSize: '13px', color: '#374151' }}>{msg.sender}</span>
                      {/* 显示发送者的验证徽章 */}
                      {activeConversation.verifications && activeConversation.verifications.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {activeConversation.verifications.filter(v => v.status === 'active').slice(0, 2).map((v, idx) => (
                            <VerificationBadge 
                              key={idx} 
                              verification={v} 
                              size="small" 
                              showLabel={false}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </Message.Header>
                )}
                {msg.direction === 'incoming' && (
                  <Avatar src={activeConversation.avatar} name={msg.sender} />
                )}
              </Message>
            ))}
          </MessageList>

          <MessageInput
            placeholder="Type message here..."
            value={inputValue}
            onChange={(val) => setInputValue(val)}
            onSend={handleSend}
            attachButton={true}
            onAttachClick={() => console.log('Attach clicked')}
          />
        </ChatContainer>
      </MainContainer>
    </div>
  );
};

export default ChatInterface;
