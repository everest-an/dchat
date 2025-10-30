import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send, Paperclip, Users, UserPlus, Settings, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { useWeb3 } from '../contexts/Web3Context'
import { useToast } from '../contexts/ToastContext'
import { UserProfileService } from '../services/UserProfileService'
import GroupService from '../services/GroupService'
import GroupMessageService from '../services/GroupMessageService'
import ipfsService from '../services/ipfsService'

const GroupChat = () => {
  const navigate = useNavigate()
  const { id: groupId } = useParams()
  const { account } = useWeb3()
  const { success, error: showError } = useToast()
  
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [groupInfo, setGroupInfo] = useState(null)
  const [members, setMembers] = useState([])
  const [showMembers, setShowMembers] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberAddress, setNewMemberAddress] = useState('')
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  // 加载群组信息
  useEffect(() => {
    if (groupId) {
      loadGroupInfo()
      loadMessages()
    }
  }, [groupId])

  const loadGroupInfo = () => {
    try {
      const groupsKey = 'dchat_groups'
      const stored = localStorage.getItem(groupsKey)
      const groups = stored ? JSON.parse(stored) : []
      
      const group = groups.find(g => g.id === groupId)
      if (group) {
        setGroupInfo(group)
        setMembers(group.members || [])
      }
      setLoading(false)
    } catch (err) {
      console.error('Error loading group:', err)
      setLoading(false)
    }
  }

  const loadMessages = () => {
    try {
      const messagesKey = `dchat_group_messages_${groupId}`
      const stored = localStorage.getItem(messagesKey)
      const msgs = stored ? JSON.parse(stored) : []
      setMessages(msgs)
    } catch (err) {
      console.error('Error loading messages:', err)
    }
  }

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 发送消息
  const handleSendMessage = async () => {
    if (!message.trim() || sending) return

    const messageText = message.trim()
    setMessage('')
    setSending(true)

    try {
      // 使用 GroupMessageService 发送消息
      const newMessage = await GroupMessageService.sendMessage(
        groupId,
        account,
        messageText
      )

      // 更新本地消息列表
      setMessages([...messages, newMessage])

      success('Sent!', 'Message sent to group')
    } catch (err) {
      console.error('Error sending message:', err)
      showError('Error', 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  // 添加成员
  const handleAddMember = () => {
    if (!newMemberAddress.trim()) {
      showError('Error', 'Please enter a wallet address')
      return
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(newMemberAddress)) {
      showError('Error', 'Invalid Ethereum address')
      return
    }

    if (members.some(m => m.address.toLowerCase() === newMemberAddress.toLowerCase())) {
      showError('Error', 'Member already in group')
      return
    }

    const newMember = {
      address: newMemberAddress,
      username: UserProfileService.getDisplayName(newMemberAddress),
      avatar: UserProfileService.getDisplayAvatar(newMemberAddress),
      role: 'member',
      joinedAt: Date.now()
    }

    const updatedMembers = [...members, newMember]
    setMembers(updatedMembers)

    // 更新群组信息
    const groupsKey = 'dchat_groups'
    const stored = localStorage.getItem(groupsKey)
    const groups = stored ? JSON.parse(stored) : []
    const groupIndex = groups.findIndex(g => g.id === groupId)
    
    if (groupIndex >= 0) {
      groups[groupIndex].members = updatedMembers
      groups[groupIndex].memberCount = updatedMembers.length
      localStorage.setItem(groupsKey, JSON.stringify(groups))
      setGroupInfo(groups[groupIndex])
    }

    setNewMemberAddress('')
    setShowAddMember(false)
    success('Added!', `${newMember.username} added to group`)
  }

  // 渲染消息
  const renderMessage = (msg) => {
    const isMe = msg.sender.toLowerCase() === account.toLowerCase()

    return (
      <div key={msg.id} className="mb-4">
        {!isMe && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm">
              {msg.senderAvatar}
            </div>
            <span className="text-xs font-medium text-gray-700">
              {msg.senderName}
            </span>
          </div>
        )}
        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[70%] rounded-2xl px-4 py-2 ${
              isMe
                ? 'bg-black text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
            <span className={`text-xs ${isMe ? 'text-gray-300' : 'text-gray-500'} mt-1 block`}>
              {msg.timestamp}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/chat')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
            {groupInfo?.name?.charAt(0) || 'G'}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">
              {groupInfo?.name || 'Group Chat'}
            </h2>
            <p className="text-xs text-gray-500">
              {members.length} members
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMembers(true)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowAddMember(true)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-3xl font-bold mb-4">
              {groupInfo?.name?.charAt(0) || 'G'}
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {groupInfo?.name || 'Group Chat'}
            </h3>
            <p className="text-gray-500 text-sm">
              Start the conversation in this group
            </p>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*,.pdf,.doc,.docx"
          />
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || sending}
            className="p-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Members Dialog */}
      {showMembers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Group Members</h2>
              <button
                onClick={() => setShowMembers(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto max-h-96">
              {members.map((member) => (
                <div
                  key={member.address}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xl">
                    {member.avatar}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{member.username}</h3>
                    <p className="text-xs text-gray-500 font-mono">
                      {member.address.slice(0, 10)}...{member.address.slice(-8)}
                    </p>
                  </div>
                  {member.role === 'admin' && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Member Dialog */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Add Member</h2>
            <input
              type="text"
              value={newMemberAddress}
              onChange={(e) => setNewMemberAddress(e.target.value)}
              placeholder="Enter wallet address (0x...)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black mb-4"
            />
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowAddMember(false)
                  setNewMemberAddress('')
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddMember}
                className="flex-1 bg-black hover:bg-gray-800 text-white"
              >
                Add Member
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupChat
