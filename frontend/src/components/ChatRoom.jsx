import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, Send, Camera, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ChatRoom = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [message, setMessage] = useState('')

  // Mock chat data
  const chatData = {
    '1': {
      name: 'Sarah Johnson',
      company: 'Acme Inc.',
      avatar: '👩‍💼',
      messages: [
        { id: 1, text: 'Hello! Can we discuss the new project collaboration in detail?', sender: 'other', timestamp: '10:30' },
        { id: 2, text: 'Of course, I\'m very interested in this project. Can I first understand the specific requirements?', sender: 'me', timestamp: '10:32' },
        { id: 3, text: 'We need to develop an enterprise-level data analytics platform, expected to complete in 3 months.', sender: 'other', timestamp: '10:35' },
        { id: 4, text: 'Sounds very challenging. Our team has rich experience in this area, we can schedule time for detailed communication.', sender: 'me', timestamp: '10:38' },
        { id: 5, text: 'Great! Is 2 PM tomorrow convenient? We can have a video conference.', sender: 'other', timestamp: '10:40' }
      ]
    }
  }

  const chat = chatData[id] || { name: 'Unknown User', company: '', avatar: '👤', messages: [] }

  const handleSendMessage = () => {
    if (message.trim()) {
      // This should send message to backend
      console.log('Send message:', message)
      setMessage('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 头部导航 */}
      <div className="flex items-center px-4 py-3 bg-white border-b border-gray-200 pt-12">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="mr-3"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center flex-1">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg mr-3">
            {chat.avatar}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-medium text-black">{chat.name}</h2>
              <Lock className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">{chat.company}</p>
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {chat.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                msg.sender === 'me'
                  ? 'bg-black text-white rounded-br-md'
                  : 'bg-gray-100 text-black rounded-bl-md'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
              <p
                className={`text-xs mt-1 ${
                  msg.sender === 'me' ? 'text-gray-300' : 'text-gray-500'
                }`}
              >
                {msg.timestamp}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 输入区域 */}
      <div className="px-4 py-4 bg-white border-t border-gray-200">
        <div className="flex items-end gap-3">
          {/* 附件按钮 */}
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full">
              <Camera className="w-5 h-5 text-gray-500" />
            </Button>
            <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full">
              <Paperclip className="w-5 h-5 text-gray-500" />
            </Button>
          </div>

          {/* 输入框 */}
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-4 py-3 bg-gray-100 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
              rows="1"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>

          {/* 发送按钮 */}
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="w-10 h-10 rounded-full bg-black hover:bg-gray-800 disabled:bg-gray-300 p-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ChatRoom

