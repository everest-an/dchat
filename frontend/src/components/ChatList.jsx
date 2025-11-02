import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, QrCode, ScanLine, Settings, User } from 'lucide-react'
import { Button } from './ui/button'
import { useWeb3 } from '../contexts/Web3Context'
import { useToast } from '../contexts/ToastContext'
import { UserProfileService } from '../services/UserProfileService'
import QRCodeDialog from './QRCodeDialog'
import ScanQRDialog from './ScanQRDialog'
import EditProfileDialog from './dialogs/EditProfileDialog'
import CreateGroupDialog from './dialogs/CreateGroupDialog'
import NewChatDialog from './NewChatDialog'
import StatusBadge from './StatusBadge'
import presenceService from '../services/PresenceService'
import { useLanguage } from '../contexts/LanguageContext'


const ChatList = ({ user }) => {
  const { t } = useLanguage()

  const navigate = useNavigate()
  const { account, disconnect } = useWeb3()
  const { success, error: showError } = useToast()
  
  // useWeb3 accountTODO: Translate {t('or_option')}user.walletAddress
  const userAddress = account || user?.walletAddress
  
  const [conversations, setConversations] = useState([])
  const [filteredConversations, setFilteredConversations] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showQRCode, setShowQRCode] = useState(false)
  const [showScan, setShowScan] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatAddress, setNewChatAddress] = useState('')
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [myProfile, setMyProfile] = useState(null)

  // TODO: Translate {t('load_user_profile')}
  const loadMyProfile = () => {
    if (userAddress) {
      const profile = UserProfileService.getProfile(userAddress)
      setMyProfile({
        username: UserProfileService.getDisplayName(userAddress),
        avatar: UserProfileService.getDisplayAvatar(userAddress),
        bio: profile?.bio || ''
      })
    }
  }

  // Initialize presence tracking
  useEffect(() => {
    if (userAddress) {
      presenceService.initialize(userAddress)
    }
    return () => {
      presenceService.cleanup()
    }
  }, [userAddress])

  useEffect(() => {
    loadMyProfile()
    
    // TODO: Translate {t('listen_profile_update_event')}
    const handleProfileUpdate = (e) => {
      if (e.detail.address.toLowerCase() === userAddress?.toLowerCase()) {
        loadMyProfile()
      }
    }
    
    window.addEventListener('profileUpdated', handleProfileUpdate)
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate)
  }, [userAddress])

  // TODO: Translate {t('load_chat_list')}
  useEffect(() => {
    loadConversations()
    
    // TODO: Translate {t('per_message')}5TODO: Translate {t('refresh_every_second')}
    const interval = setInterval(loadConversations, 5000)
    return () => clearInterval(interval)
  }, [userAddress])

  const loadConversations = () => {
    try {
      const conversationsKey = 'dchat_conversations'
      const stored = localStorage.getItem(conversationsKey)
      const convs = stored ? JSON.parse(stored) : []
      
      // TODO: Translate {t('sort_by_time')}
      const sorted = convs.sort((a, b) => b.timestamp - a.timestamp)
      setConversations(sorted)
      setFilteredConversations(sorted)
    } catch (err) {
      console.error('Error loading conversations:', err)
    }
  }

  // TODO: Translate {t('search_filter')}
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = conversations.filter(conv =>
      conv.username.toLowerCase().includes(query) ||
      conv.address.toLowerCase().includes(query) ||
      conv.lastMessage.toLowerCase().includes(query)
    )
    setFilteredConversations(filtered)
  }, [searchQuery, conversations])

  // TODO: Translate {t('create_new_chat')}
  const handleNewChat = () => {
    if (!newChatAddress.trim()) {
      showError('Error', 'Please enter a wallet address')
      return
    }

    // TODO: Translate {t('validate_address_format')}
    if (!/^0x[a-fA-F0-9]{40}$/.test(newChatAddress)) {
      showError('Error', 'Invalid Ethereum address')
      return
    }

    // TODO: Translate {t('check_own_address')}
    if (newChatAddress.toLowerCase() === userAddress.toLowerCase()) {
      showError('Error', 'Cannot chat with yourself')
      return
    }

    // TODO: Translate {t('navigate_to_chat_page')}
    navigate(`/chat/${newChatAddress}`)
    setShowNewChat(false)
    setNewChatAddress('')
  }

  // Handle start chat from NewChatDialog
  const handleStartChat = (chatData) => {
    if (chatData.type === 'direct') {
      navigate(`/chat/${chatData.address}`)
    }
  }

  // TODO: Translate {t('format_time')}
  const formatTime = (timestamp) => {
    const now = Date.now()
    const diff = now - timestamp
    
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour
    
    if (diff < minute) return 'Just now'
    if (diff < hour) return `${Math.floor(diff / minute)}m ago`
    if (diff < day) return `${Math.floor(diff / hour)}h ago`
    if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
    
    return new Date(timestamp).toLocaleDateString()
  }

  // TODO: Translate {t('render_chat_item')}
  const renderConversation = (conv) => (
    <div
      key={conv.address}
      onClick={() => navigate(`/chat/${conv.address}`)}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b"
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-2xl">
          {conv.avatar}
        </div>
        {/* Online status badge */}
        <div className="absolute bottom-0 right-0">
          <StatusBadge userId={conv.address} size="sm" />
        </div>
        {conv.unread > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
            {conv.unread > 9 ? '9+' : conv.unread}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 truncate">
            {conv.username}
          </h3>
          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
            {formatTime(conv.timestamp)}
          </span>
        </div>
        <p className="text-sm text-gray-600 truncate">
          {conv.lastMessage}
        </p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold">Chats</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQRCode(true)}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="My QR Code"
            >
              <QrCode className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowScan(true)}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Scan QR Code"
            >
              <ScanLine className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowProfile(true)}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Edit Profile"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      {/* My Profile Card */}
      <div className="px-4 py-3 bg-gradient-to-r from-black to-gray-800 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-2xl overflow-hidden">
            {myProfile?.avatar?.type === 'ipfs' && myProfile?.avatar?.url ? (
              <img 
                src={myProfile.avatar.url} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{myProfile?.avatar?.emoji || myProfile?.avatar || '👤'}</span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{myProfile?.username || 'Loading...'}</h3>
            <p className="text-sm opacity-80">
              {myProfile?.bio || 'No bio yet'}
            </p>
          </div>
          <button
            onClick={() => setShowProfile(true)}
            className="px-3 py-1 bg-white bg-opacity-20 rounded-lg text-sm hover:bg-opacity-30"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-4xl mb-4">
              💬
            </div>
            <h3 className="font-semibold text-lg mb-2">No conversations yet</h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery
                ? 'No results found'
                : 'Start a new conversation or scan a QR code'}
            </p>
            {!searchQuery && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowNewChat(true)}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
                <Button
                  onClick={() => setShowScan(true)}
                  variant="outline"
                >
                  <ScanLine className="w-4 h-4 mr-2" />
                  Scan QR
                </Button>
              </div>
            )}
          </div>
        ) : (
          filteredConversations.map(renderConversation)
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t space-y-2">
        <Button
          onClick={() => setShowNewChat(true)}
          className="w-full bg-black hover:bg-gray-800 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
        <Button
          onClick={() => setShowCreateGroup(true)}
          variant="outline"
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Dialogs */}
      <QRCodeDialog
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
        address={userAddress}
      />
      
      <ScanQRDialog
        isOpen={showScan}
        onClose={() => setShowScan(false)}
      />
      
      <EditProfileDialog
        isOpen={showProfile}
        onClose={() => {
          setShowProfile(false)
          // TODO: Translate {t('reload_profile_data')}
          loadMyProfile()
        }}
        address={userAddress}
      />
      
      <CreateGroupDialog
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />

      {/* New Chat Dialog */}
      <NewChatDialog
        isOpen={showNewChat}
        onClose={() => setShowNewChat(false)}
        onStartChat={handleStartChat}
        contacts={conversations.map(conv => ({
          address: conv.address,
          name: conv.displayName,
          username: conv.displayName,
          avatar: conv.avatar
        }))}
      />
    </div>
  )
}

export default ChatList
