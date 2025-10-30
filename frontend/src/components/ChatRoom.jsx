import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send, Paperclip, Image, FileText, Loader2, MoreVertical, Phone, Video, DollarSign } from 'lucide-react'
import { Button } from './ui/button'
import { useWeb3 } from '../contexts/Web3Context'
import { useToast } from '../contexts/ToastContext'
import { MessageStorageService } from '../services/MessageStorageService'
import { UserProfileService } from '../services/UserProfileService'
import { ipfsService } from '../services/IPFSService'
import { encryptMessage, decryptMessage } from '../utils/encryption'
import { subscriptionService } from '../services/SubscriptionService'
import UpgradeDialog from './dialogs/UpgradeDialog'
import PaymentDialog from './dialogs/PaymentDialog'

const ChatRoom = () => {
  const navigate = useNavigate()
  const { id: recipientAddress } = useParams()
  const { account, provider, signer, isConnected } = useWeb3()
  const { success, error: showError, info } = useToast()
  
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [recipientProfile, setRecipientProfile] = useState(null)
  const [messageService, setMessageService] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [upgradeMessage, setUpgradeMessage] = useState({ title: '', description: '' })
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const pollingInterval = useRef(null)

  // TODO: Translate '获取接收者资料'
  useEffect(() => {
    if (recipientAddress) {
      const profile = UserProfileService.getProfile(recipientAddress)
      setRecipientProfile({
        address: recipientAddress,
        username: UserProfileService.getDisplayName(recipientAddress),
        avatar: UserProfileService.getDisplayAvatar(recipientAddress),
        bio: profile?.bio || '',
        company: profile?.company || ''
      })
    }
  }, [recipientAddress])

  // TODO: Translate '初始化消息服务'
  useEffect(() => {
    if (provider && signer) {
      const service = new MessageStorageService(provider, signer)
      setMessageService(service)
    }
  }, [provider, signer])

  // TODO: Translate '加载消息'
  const loadMessages = useCallback(async () => {
    if (!messageService || !account || !recipientAddress) return

    try {
      setLoading(true)
      
      // TODO: Translate '从本地存储加载消息'
      const storageKey = `dchat_messages_${account}_${recipientAddress}`
      const stored = localStorage.getItem(storageKey)
      const localMessages = stored ? JSON.parse(stored) : []
      
      setMessages(localMessages)
      setLoading(false)
      
      // TODO: Translate '标记消息为已读'
      markMessagesAsRead(localMessages)
    } catch (err) {
      console.error('Error loading messages:', err)
      showError('Error', 'Failed to load messages')
      setLoading(false)
    }
  }, [messageService, account, recipientAddress])

  // TODO: Translate '标记消息为已读'
  const markMessagesAsRead = (msgs) => {
    const unreadCount = msgs.filter(m => m.sender === 'other' && !m.isRead).length
    if (unreadCount > 0) {
      // TODO: Translate '更新本地存储'
      const updatedMessages = msgs.map(m => 
        m.sender === 'other' ? { ...m, isRead: true } : m
      )
      const storageKey = `dchat_messages_${account}_${recipientAddress}`
      localStorage.setItem(storageKey, JSON.stringify(updatedMessages))
      setMessages(updatedMessages)
      
      // TODO: Translate '更新未读计数'
      updateUnreadCount()
    }
  }

  // TODO: Translate '更新未读计数'
  const updateUnreadCount = () => {
    const conversationsKey = 'dchat_conversations'
    const stored = localStorage.getItem(conversationsKey)
    const conversations = stored ? JSON.parse(stored) : []
    
    const updated = conversations.map(conv => 
      conv.address === recipientAddress ? { ...conv, unread: 0 } : conv
    )
    
    localStorage.setItem(conversationsKey, JSON.stringify(updated))
  }

  // TODO: Translate '初始加载'
  useEffect(() => {
    if (isConnected && messageService) {
      loadMessages()
    }
  }, [isConnected, messageService, loadMessages])

  // TODO: Translate '实时更新' - TODO: Translate '每'5TODO: Translate '秒检查新消息'
  useEffect(() => {
    if (!isConnected || !messageService) return

    pollingInterval.current = setInterval(() => {
      loadMessages()
    }, 5000)

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
      }
    }
  }, [isConnected, messageService, loadMessages])

  // TODO: Translate '自动滚动到底部'
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // TODO: Translate '发送文本消息'
  const handleSendMessage = async () => {
    if (!message.trim() || sending) return

    const messageText = message.trim()
    setMessage('')
    setSending(true)

    try {
      // TODO: Translate '创建消息对象'
      const newMessage = {
        id: Date.now().toString(),
        text: messageText,
        sender: 'me',
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        isRead: false,
        type: 'text'
      }

      // TODO: Translate '立即显示消息'
      const updatedMessages = [...messages, newMessage]
      setMessages(updatedMessages)

      // TODO: Translate '保存到本地存储'
      const storageKey = `dchat_messages_${account}_${recipientAddress}`
      localStorage.setItem(storageKey, JSON.stringify(updatedMessages))

      // TODO: Translate '更新对话列表'
      updateConversationsList(messageText)

      success('Sent!', 'Message sent successfully')
    } catch (err) {
      console.error('Error sending message:', err)
      showError('Error', 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  // TODO: Translate '更新对话列表'
  const updateConversationsList = (lastMessage) => {
    const conversationsKey = 'dchat_conversations'
    const stored = localStorage.getItem(conversationsKey)
    const conversations = stored ? JSON.parse(stored) : []
    
    const existingIndex = conversations.findIndex(c => c.address === recipientAddress)
    
    const conversationData = {
      address: recipientAddress,
      username: recipientProfile?.username || recipientAddress,
      avatar: recipientProfile?.avatar || '👤',
      lastMessage: lastMessage.substring(0, 50),
      timestamp: Date.now(),
      unread: 0
    }
    
    if (existingIndex >= 0) {
      conversations[existingIndex] = conversationData
    } else {
      conversations.unshift(conversationData)
    }
    
    localStorage.setItem(conversationsKey, JSON.stringify(conversations))
  }

  // TODO: Translate '处理文件上传'
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size limit
    if (!subscriptionService.canUploadFile(account, file.size)) {
      const limits = subscriptionService.getUserLimits(account)
      const maxSize = subscriptionService.formatSize(limits.fileSize)
      setUpgradeMessage({
        title: 'File Size Limit Exceeded',
        description: `Free plan allows files up to ${maxSize}. Upgrade to Pro for files up to 100MB, or Enterprise for unlimited file size.`
      })
      setShowUpgradeDialog(true)
      e.target.value = '' // Reset file input
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      info('Uploading...', 'Uploading file to IPFS')

      // TODO: Translate '上传到' IPFS
      const result = await ipfsService.uploadFile(file, (progress) => {
        setUploadProgress(progress)
      })

      if (result.success) {
        // TODO: Translate '创建文件消息'
        const fileMessage = {
          id: Date.now().toString(),
          text: file.name,
          sender: 'me',
          timestamp: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          isRead: false,
          type: ipfsService.getFileType(file.name),
          fileUrl: result.url,
          fileSize: ipfsService.formatFileSize(result.size),
          fileName: file.name
        }

        // TODO: Translate '添加到消息列表'
        const updatedMessages = [...messages, fileMessage]
        setMessages(updatedMessages)

        // TODO: Translate '保存到本地存储'
        const storageKey = `dchat_messages_${account}_${recipientAddress}`
        localStorage.setItem(storageKey, JSON.stringify(updatedMessages))

        // TODO: Translate '更新对话列表'
        updateConversationsList(`📎 ${file.name}`)

        success('Uploaded!', 'File uploaded successfully')
      } else {
        showError('Upload Failed', result.error)
      }
    } catch (err) {
      console.error('Error uploading file:', err)
      showError('Error', 'Failed to upload file')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // TODO: Translate '渲染消息'
  const renderMessage = (msg) => {
    const isMe = msg.sender === 'me'

    if (msg.type === 'payment') {
      return (
        <div
          key={msg.id}
          className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}
        >
          {!isMe && (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-lg mr-2 flex-shrink-0">
              {recipientProfile?.avatar || '👤'}
            </div>
          )}
          <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
            <div
              className={`rounded-2xl px-4 py-3 border-2 ${
                isMe
                  ? 'bg-green-50 border-green-200 text-green-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-5 h-5" />
                <span className="font-semibold">{isMe ? 'Payment Sent' : 'Payment Received'}</span>
              </div>
              <p className="text-sm">{msg.text}</p>
              {msg.escrowId && (
                <p className="text-xs mt-1 opacity-70">Escrow ID: {msg.escrowId}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  msg.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  msg.status === 'released' ? 'bg-green-100 text-green-800' :
                  msg.status === 'refunded' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {msg.status || 'pending'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 px-2">
              <span className="text-xs text-gray-500">{msg.timestamp}</span>
              {isMe && msg.isRead && (
                <span className="text-xs text-blue-500">✓✓</span>
              )}
            </div>
          </div>
        </div>
      )
    }

    if (msg.type === 'text') {
      return (
        <div
          key={msg.id}
          className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}
        >
          {!isMe && (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-lg mr-2 flex-shrink-0">
              {recipientProfile?.avatar || '👤'}
            </div>
          )}
          <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
            <div
              className={`rounded-2xl px-4 py-2 ${
                isMe
                  ? 'bg-black text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-900 rounded-bl-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
            </div>
            <div className="flex items-center gap-2 mt-1 px-2">
              <span className="text-xs text-gray-500">{msg.timestamp}</span>
              {isMe && msg.isRead && (
                <span className="text-xs text-blue-500">✓✓</span>
              )}
            </div>
          </div>
        </div>
      )
    }

    // TODO: Translate '文件消息'
    return (
      <div
        key={msg.id}
        className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}
      >
        {!isMe && (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-lg mr-2 flex-shrink-0">
            {recipientProfile?.avatar || '👤'}
          </div>
        )}
        <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
          <div
            className={`rounded-2xl overflow-hidden ${
              isMe ? 'bg-black' : 'bg-gray-100'
            }`}
          >
            {msg.type === 'image' && (
              <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={msg.fileUrl}
                  alt={msg.fileName}
                  className="max-w-full h-auto cursor-pointer hover:opacity-90"
                />
              </a>
            )}
            {msg.type === 'video' && (
              <video controls className="max-w-full">
                <source src={msg.fileUrl} />
              </video>
            )}
            {(msg.type === 'document' || msg.type === 'file') && (
              <a
                href={msg.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 px-4 py-3 ${
                  isMe ? 'text-white' : 'text-gray-900'
                }`}
              >
                <FileText className="w-8 h-8" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{msg.fileName}</p>
                  <p className="text-sm opacity-70">{msg.fileSize}</p>
                </div>
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 px-2">
            <span className="text-xs text-gray-500">{msg.timestamp}</span>
            {isMe && msg.isRead && (
              <span className="text-xs text-blue-500">✓✓</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please connect your wallet</p>
          <Button onClick={() => navigate('/login')}>Connect Wallet</Button>
        </div>
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
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xl">
            {recipientProfile?.avatar || '👤'}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">
              {recipientProfile?.username || 'Loading...'}
            </h2>
            {recipientProfile?.company && (
              <p className="text-xs text-gray-500">{recipientProfile.company}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Video className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-4xl mb-4">
              {recipientProfile?.avatar || '👤'}
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {recipientProfile?.username}
            </h3>
            <p className="text-gray-500 text-sm">
              Start your conversation with {recipientProfile?.username}
            </p>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-blue-900">Uploading...</span>
            <span className="text-sm text-blue-900">{uploadProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowPaymentDialog(true)}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="Send payment"
          >
            <DollarSign className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.md"
          />
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            disabled={sending || uploading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || sending || uploading}
            className="p-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Upgrade Dialog */}
      <UpgradeDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        title={upgradeMessage.title}
        description={upgradeMessage.description}
      />

      {/* Payment Dialog */}
      <PaymentDialog
        open={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        onSuccess={(paymentData) => {
          setShowPaymentDialog(false)
          success('Payment Created', 'Payment escrow created successfully')
          // Optionally send a payment message in chat
          const paymentMessage = {
            id: Date.now().toString(),
            text: `Sent ${paymentData.amount} ETH - ${paymentData.description}`,
            sender: 'me',
            timestamp: new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            isRead: false,
            type: 'payment',
            amount: paymentData.amount,
            escrowId: paymentData.escrowId,
            status: 'pending'
          }
          const updatedMessages = [...messages, paymentMessage]
          setMessages(updatedMessages)
          const storageKey = `dchat_messages_${account}_${recipientAddress}`
          localStorage.setItem(storageKey, JSON.stringify(updatedMessages))
        }}
        recipientAddress={recipientAddress}
        userAddress={account}
      />
    </div>
  )
}

export default ChatRoom
