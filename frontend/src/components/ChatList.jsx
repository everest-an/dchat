import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ChatList = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  // Mock chat data
  const chats = [
    {
      id: '1',
      name: 'Sarah Johnson',
      company: 'Acme Inc.',
      lastMessage: 'How is the project going?',
      timestamp: '2 min ago',
      unread: 2,
      avatar: '👩‍💼'
    },
    {
      id: '2',
      name: 'Mark Smith',
      company: 'Global Insights',
      lastMessage: 'Are you ready for tomorrow\'s meeting?',
      timestamp: '1 hour ago',
      unread: 0,
      avatar: '👨‍💼'
    },
    {
      id: '3',
      name: 'Lisa Wong',
      company: 'Innovate Ltd.',
      lastMessage: 'Looking for AI collaboration partners',
      timestamp: '3 hours ago',
      unread: 1,
      avatar: '👩‍💻'
    },
    {
      id: '4',
      name: 'Tech Team',
      company: 'Team Group',
      lastMessage: 'Alex: New features are now live',
      timestamp: 'Yesterday',
      unread: 0,
      avatar: '👥'
    }
  ]

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.company.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-black">Chats</h1>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts or companies"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => navigate(`/chat/${chat.id}`)}
            className="flex items-center px-4 py-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
          >
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl mr-3 flex-shrink-0">
              {chat.avatar}
            </div>

            {/* Chat Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-black truncate">{chat.name}</h3>
                  <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">{chat.timestamp}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 truncate mb-1">{chat.company}</p>
                  <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                </div>
                
                {chat.unread > 0 && (
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center ml-2 flex-shrink-0">
                    <span className="text-xs text-white font-medium">{chat.unread}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ChatList

