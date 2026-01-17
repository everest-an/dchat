import React, { useState } from 'react';
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
  const [conversations, setConversations] = useState([
    {
      id: 1,
      name: "Alice Johnson",
      lastMessage: "Hey, how are you?",
      time: "5m ago",
      unread: 2,
      avatar: "https://ui-avatars.com/api/?name=Alice+Johnson&background=4F46E5&color=fff"
    },
    {
      id: 2,
      name: "Bob Smith",
      lastMessage: "Let's discuss the project",
      time: "1h ago",
      unread: 0,
      avatar: "https://ui-avatars.com/api/?name=Bob+Smith&background=10B981&color=fff"
    },
    {
      id: 3,
      name: "Carol White",
      lastMessage: "Thanks for the update!",
      time: "3h ago",
      unread: 1,
      avatar: "https://ui-avatars.com/api/?name=Carol+White&background=F59E0B&color=fff"
    }
  ]);
  
  const [activeConversation, setActiveConversation] = useState(conversations[0]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (message) => {
    if (message.trim() === '') return;

    const newMessage = {
      id: messages.length + 1,
      message: message,
      sentTime: "just now",
      sender: "You",
      direction: "outgoing",
      position: "single"
    };

    setMessages([...messages, newMessage]);
    setInputValue('');

    // Simulate typing indicator
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      // Simulate response
      const responseMessage = {
        id: messages.length + 2,
        message: "Thanks for your message! This is a demo response.",
        sentTime: "just now",
        sender: activeConversation.name,
        direction: "incoming",
        position: "single"
      };
      setMessages(prev => [...prev, responseMessage]);
    }, 2000);
  };

  const handleConversationClick = (conversation) => {
    setActiveConversation(conversation);
    // Mark as read
    setConversations(conversations.map(conv => 
      conv.id === conversation.id ? { ...conv, unread: 0 } : conv
    ));
  };

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      <MainContainer style={{ border: 'none' }}>
        <Sidebar position="left" scrollable={false}>
          <Search placeholder="Search conversations..." />
          <ConversationList>
            {conversations.map((conversation) => (
              <Conversation
                key={conversation.id}
                name={conversation.name}
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
              userName={activeConversation.name}
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
