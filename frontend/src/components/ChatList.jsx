import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWeb3 } from '../contexts/Web3Context'
import { MessageStorageService } from '../services/MessageStorageService'

const ChatList = () => {
  const navigate = useNavigate()
  const { account, provider, signer, isConnected } = useWeb3()
  const [searchQuery, setSearchQuery] = useState('')
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [messageService, setMessageService] = useState(null)

  // 初始化消息服务
  useEffect(() => {
    if (provider && signer) {
      const service = new MessageStorageService(provider, signer)
      setMessageService(service)
    }
  }, [provider, signer])

  // 加载对话列表
  const loadConversations = useCallback(async () => {
    if (!messageService || !account) return

    try {
      setLoading(true)
      
      // 获取用户的所有消息
      const result = await messageService.getUserMessages(account, 0, 100)
      
      if (result.success) {
        // 按对话分组
        const conversationMap = new Map()
        
        result.messages.forEach(msg => {
          // 确定对话对象
          const otherParty = msg.sender.toLowerCase() === account.toLowerCase() 
            ? msg.recipient 
            : msg.sender
          
          if (!conversationMap.has(otherParty)) {
            conversationMap.set(otherParty, {
              address: otherParty,
              messages: []
            })
          }
          
          conversationMap.get(otherParty).messages.push(msg)
        })
        
        // 转换为数组并排序
        const convList = Array.from(conversationMap.values()).map(conv => {
          const lastMsg = conv.messages[conv.messages.length - 1]
          const unreadCount = conv.messages.filter(
            msg => !msg.isRead && msg.recipient.toLowerCase() === account.toLowerCase()
          ).length
          
          return {
            id: conv.address,
            address: conv.address,
            name: `${conv.address.slice(0, 6)}...${conv.address.slice(-4)}`,
            company: 'Web3 User',
            lastMessage: lastMsg.encryptedContent.slice(0, 50) + (lastMsg.encryptedContent.length > 50 ? '...' : ''),
            timestamp: formatTimestamp(lastMsg.timestamp),
            unread: unreadCount,
            avatar: '👤',
            lastMessageTime: lastMsg.timestamp
          }
        })
        
        // 按最后消息时间排序
        convList.sort((a, b) => b.lastMessageTime - a.lastMessageTime)
        
        setConversations(convList)
      }
    } catch (err) {
      console.error('Error loading conversations:', err)
    } finally {
      setLoading(false)
    }
  }, [messageService, account])

  // 格式化时间戳
  const formatTimestamp = (timestamp) => {
    const now = Date.now() / 1000
    const diff = now - timestamp
    
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? 's' : ''} ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`
    
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  // 初始加载对话
  useEffect(() => {
    if (isConnected && messageService) {
      loadConversations()
    }
  }, [isConnected, messageService, loadConversations])

  // 过滤对话
  const filteredConversations = conversations.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.company.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 新建对话
  const handleNewChat = () => {
    const address = prompt('Enter recipient wallet address:')
    if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
      navigate(`/chat/${address}`)
    } else if (address) {
      alert('Invalid Ethereum address')
    }
  }

  // 如果未连接钱包
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        <Lock className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Wallet</h2>
        <p className="text-gray-600 mb-6">Please connect your wallet to access chats</p>
        <Button onClick={() => navigate('/login')} className="bg-black hover:bg-gray-800">
          Connect Wallet
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-black">Chats</h1>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full"
            onClick={handleNewChat}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by address or name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
          />
        </div>
        
        {/* Account Info */}
        <div className="mt-3 px-3 py-2 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Lock className="w-3 h-3 text-green-500" />
            <span className="font-mono">{account?.slice(0, 6)}...{account?.slice(-4)}</span>
          </div>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4">
            <Lock className="w-12 h-12 mb-2" />
            <p className="text-center mb-1">No conversations yet</p>
            <p className="text-sm text-center mb-4">Start a new secure conversation</p>
            <Button 
              onClick={handleNewChat}
              className="bg-black hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>
        ) : (
          filteredConversations.map((chat) => (
            <div
              key={chat.id}
              onClick={() => navigate(`/chat/${chat.address}`)}
              className="flex items-center px-4 py-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors border-b border-gray-100"
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
                    <Lock className="w-3 h-3 text-green-500" title="Encrypted" />
                  </div>
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {chat.timestamp}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 truncate pr-2">
                    {chat.lastMessage}
                  </p>
                  {chat.unread > 0 && (
                    <span className="flex-shrink-0 min-w-[20px] h-5 px-2 bg-black text-white text-xs rounded-full flex items-center justify-center">
                      {chat.unread}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  {chat.address.slice(0, 10)}...{chat.address.slice(-8)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <Lock className="w-3 h-3" />
          <span>All messages are encrypted and stored on blockchain</span>
        </div>
      </div>
    </div>
  )
}

export default ChatList
