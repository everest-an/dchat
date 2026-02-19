import { useState, useEffect, useRef, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Send, Users, UserPlus, Settings,
  Loader2, Shield, ShieldAlert, Crown
} from 'lucide-react'
import { Button } from './ui/button'
import MentionSelector from './chat/MentionSelector'
import VoiceRecorder from './chat/VoiceRecorder'
import VoicePlayer from './chat/VoicePlayer'
import { useToast } from '../contexts/ToastContext'
import useAuthStore from '../stores/useAuthStore'
import GroupService from '../services/GroupService'
import socketService from '../services/socketService'

const GroupChat = () => {
  const navigate = useNavigate()
  const { id: groupId } = useParams()
  const { user } = useAuthStore()
  const { success, error: showError } = useToast()

  const currentUserId = user?.id

  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [groupInfo, setGroupInfo] = useState(null)
  const [showMembers, setShowMembers] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberId, setNewMemberId] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStart, setMentionStart] = useState(-1) // cursor position of @

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Load group info
  const loadGroupInfo = useCallback(async () => {
    try {
      const group = await GroupService.getGroup(groupId)
      setGroupInfo(group)
    } catch (err) {
      console.error('Error loading group:', err)
      showError('Error', 'Failed to load group info')
    }
  }, [groupId, showError])

  // Load messages
  const loadMessages = useCallback(async (pageNum = 1) => {
    try {
      const res = await GroupService.getMessages(groupId, {
        page: pageNum,
        page_size: 50,
      })
      const data = res.data ?? []
      if (pageNum === 1) {
        setMessages(data)
      } else {
        setMessages(prev => [...data, ...prev])
      }
      setHasMore(data.length === 50)
      setPage(pageNum)
    } catch (err) {
      console.error('Error loading messages:', err)
    }
  }, [groupId])

  // Initial load
  useEffect(() => {
    if (!groupId) return
    const init = async () => {
      setLoading(true)
      await Promise.all([loadGroupInfo(), loadMessages(1)])
      setLoading(false)
    }
    init()
  }, [groupId, loadGroupInfo, loadMessages])

  // WebSocket: listen for group messages
  useEffect(() => {
    if (!groupId || !currentUserId) return

    const handleMessage = (data) => {
      // Accept group_chat messages for this group from other users
      if (
        data.type === 'group_chat' &&
        String(data.group_id) === String(groupId) &&
        data.sender_id !== currentUserId
      ) {
        const incoming = {
          id: data.id || data.message_id || Date.now(),
          group_id: data.group_id,
          sender_id: data.sender_id,
          sender: data.sender || null,
          content: data.content || data.message,
          message_type: data.message_type || 'text',
          created_at: data.created_at || new Date().toISOString(),
        }
        setMessages(prev => {
          if (prev.some(m => m.id === incoming.id)) return prev
          return [...prev, incoming]
        })
      }
    }

    const unsubscribe = socketService.onMessage(handleMessage)

    return () => {
      unsubscribe()
    }
  }, [groupId, currentUserId])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle @mention detection in input
  const handleInputChange = (e) => {
    const val = e.target.value
    setMessage(val)

    const cursor = e.target.selectionStart
    // Find the last @ before cursor that isn't preceded by a non-space character
    const textBeforeCursor = val.slice(0, cursor)
    const atIdx = textBeforeCursor.lastIndexOf('@')

    if (atIdx >= 0 && (atIdx === 0 || textBeforeCursor[atIdx - 1] === ' ')) {
      const query = textBeforeCursor.slice(atIdx + 1)
      // Close if there's a space in the query (user moved past the mention)
      if (query.includes(' ')) {
        setMentionOpen(false)
      } else {
        setMentionOpen(true)
        setMentionQuery(query)
        setMentionStart(atIdx)
      }
    } else {
      setMentionOpen(false)
    }
  }

  // Handle @mention selection from dropdown
  const handleMentionSelect = (opt) => {
    const before = message.slice(0, mentionStart)
    const after = message.slice(inputRef.current?.selectionStart ?? message.length)
    const mentionText = opt.isAll ? '@all ' : `@${opt.name} `
    const newMsg = before + mentionText + after
    setMessage(newMsg)
    setMentionOpen(false)

    // Re-focus input
    setTimeout(() => {
      if (inputRef.current) {
        const pos = before.length + mentionText.length
        inputRef.current.focus()
        inputRef.current.setSelectionRange(pos, pos)
      }
    }, 0)
  }

  // Send message
  const handleSendMessage = async () => {
    if (!message.trim() || sending) return

    const text = message.trim()
    setMessage('')
    setSending(true)

    try {
      const created = await GroupService.sendMessage(groupId, {
        content: text,
        message_type: 'text',
      })
      setMessages(prev => [...prev, created])
    } catch (err) {
      console.error('Error sending message:', err)
      showError('Error', 'Failed to send message')
      setMessage(text) // restore text on error
    } finally {
      setSending(false)
    }
  }

  // Voice message handler
  const handleVoiceSend = async (fileData) => {
    try {
      const created = await GroupService.sendMessage(groupId, {
        content: 'Voice message',
        message_type: 'audio',
        file_url: fileData.file_url,
        file_name: fileData.file_name,
        file_size: fileData.file_size,
        duration: fileData.duration,
      })
      setMessages(prev => [...prev, created])
      success('Sent!', 'Voice message sent')
    } catch (err) {
      console.error('Error sending voice message:', err)
      showError('Error', 'Failed to send voice message')
    }
  }

  // Add member
  const handleAddMember = async () => {
    const userId = parseInt(newMemberId, 10)
    if (!userId || isNaN(userId)) {
      showError('Error', 'Please enter a valid user ID')
      return
    }

    try {
      await GroupService.addMember(groupId, userId)
      setNewMemberId('')
      setShowAddMember(false)
      await loadGroupInfo() // refresh members
      success('Added!', 'Member added to group')
    } catch (err) {
      showError('Error', err.message || 'Failed to add member')
    }
  }

  // Role badge helper
  const roleBadge = (role) => {
    if (role === 'owner') {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
          <Crown className="w-3 h-3" /> Owner
        </span>
      )
    }
    if (role === 'admin') {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
          <Shield className="w-3 h-3" /> Admin
        </span>
      )
    }
    return null
  }

  // Check if current user is admin or owner
  const isAdminOrOwner =
    groupInfo?.Members?.some(
      m => m.user_id === currentUserId && (m.role === 'admin' || m.role === 'owner')
    ) ?? false

  // Highlight @mentions in message text
  const highlightMentions = (text, isMe) => {
    if (!text) return null
    const sanitized = DOMPurify.sanitize(text)
    // Split on @mentions pattern
    const parts = sanitized.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (/^@\w+/.test(part)) {
        return (
          <span
            key={i}
            className={`font-semibold ${
              isMe ? 'text-blue-300' : 'text-blue-600'
            } cursor-pointer hover:underline`}
          >
            {part}
          </span>
        )
      }
      return part
    })
  }

  // Render a message
  const renderMessage = (msg) => {
    const isMe = msg.sender_id === currentUserId
    const senderName =
      msg.sender?.name || msg.sender?.username || `User #${msg.sender_id}`

    // System messages
    if (msg.message_type === 'system') {
      return (
        <div key={msg.id} className="flex justify-center mb-3">
          <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
            {msg.content}
          </span>
        </div>
      )
    }

    const timestamp = msg.created_at
      ? new Date(msg.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : ''

    return (
      <div key={msg.id} className="mb-4">
        {!isMe && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-center text-xs text-white font-bold">
              {senderName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-gray-700">
              {senderName}
            </span>
          </div>
        )}
        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
          {msg.message_type === 'audio' && msg.file_url ? (
            <div className="max-w-[70%]">
              <VoicePlayer fileUrl={msg.file_url} duration={msg.duration} isMe={isMe} />
              <div className="mt-1 px-2">
                <span className="text-xs text-gray-500">{timestamp}</span>
              </div>
            </div>
          ) : (
            <div
              className={`max-w-[70%] rounded-2xl overflow-hidden ${
                isMe
                  ? 'bg-black text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-900 rounded-bl-sm'
              }`}
            >
              <div className="px-4 py-2">
                <div className="text-sm whitespace-pre-wrap break-words">
                  {highlightMentions(msg.content, isMe)}
                </div>
              </div>
              <div className="px-4 pb-2">
                <span
                  className={`text-xs block ${
                    isMe ? 'text-gray-300' : 'text-gray-500'
                  }`}
                >
                  {timestamp}
                </span>
              </div>
            </div>
          )}
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

  const members = groupInfo?.Members ?? []

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app')}
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
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowMembers(true)}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="Members"
          >
            <Users className="w-5 h-5" />
          </button>
          {isAdminOrOwner && (
            <button
              onClick={() => setShowAddMember(true)}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Add member"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          )}
          {isAdminOrOwner && (
            <button
              onClick={() => navigate(`/app/group/${groupId}/settings`)}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Group settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {hasMore && messages.length > 0 && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => loadMessages(page + 1)}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Load earlier messages
            </button>
          </div>
        )}

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
      <div className="relative px-4 py-3 border-t bg-white">
        <MentionSelector
          members={members}
          query={mentionQuery}
          onSelect={handleMentionSelect}
          onClose={() => setMentionOpen(false)}
          visible={mentionOpen}
        />
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (mentionOpen) return // let MentionSelector handle keys
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder="Type a message... (@ to mention)"
            disabled={sending}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
          />
          {message.trim() ? (
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || sending}
              className="p-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          ) : (
            <VoiceRecorder onVoiceSend={handleVoiceSend} disabled={sending} />
          )}
        </div>
      </div>

      {/* Members Dialog */}
      {showMembers && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                Group Members ({members.length})
              </h2>
              <button
                onClick={() => setShowMembers(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto max-h-96">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-center text-white font-bold">
                    {(member.User?.name || member.nickname || 'U')
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {member.User?.name || member.nickname || `User #${member.user_id}`}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      {member.User?.wallet_address
                        ? `${member.User.wallet_address.slice(0, 10)}...${member.User.wallet_address.slice(-6)}`
                        : ''}
                    </p>
                  </div>
                  {roleBadge(member.role)}
                  {member.is_muted && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                      <ShieldAlert className="w-3 h-3" /> Muted
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Add Member</h2>
            <input
              type="text"
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
              placeholder="Enter user ID"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black mb-4"
            />
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowAddMember(false)
                  setNewMemberId('')
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
