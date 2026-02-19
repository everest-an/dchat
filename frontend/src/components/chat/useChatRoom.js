/**
 * useChatRoom Hook
 *
 * Encapsulates all business logic for the ChatRoom:
 * - Message loading, sending, encryption/decryption
 * - File upload to IPFS
 * - Socket.IO real-time messaging
 * - Read receipts
 * - Conversation list management
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useWeb3 } from '../../contexts/Web3Context'
import { useToast } from '../../contexts/ToastContext'
import { MessageStorageService } from '../../services/MessageStorageService'
import { UnifiedUserService } from '../../services/UnifiedUserService'
import ipfsService from '../../services/IPFSService'
import { subscriptionService } from '../../services/SubscriptionService'
import socketService from '../../services/socketService'
import readReceiptService from '../../services/ReadReceiptService'
import { KeyManagementService } from '../../services/KeyManagementService'
import { encryptMessage, decryptMessage } from '../../utils/encryption'
import { logError } from '../../utils/errorHandler'

/**
 * @returns {object} All state and handlers needed by ChatRoom UI
 */
export function useChatRoom() {
  const { id: recipientAddress } = useParams()
  const { account, provider, signer, isConnected } = useWeb3()
  const { success, error: showError, info } = useToast()

  const isFileTransfer = recipientAddress === 'file-helper' || recipientAddress === account

  // State
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [recipientProfile, setRecipientProfile] = useState(null)
  const [messageService, setMessageService] = useState(null)
  const [userKeys, setUserKeys] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [upgradeMessage, setUpgradeMessage] = useState({ title: '', description: '' })
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [editingMessage, setEditingMessage] = useState(null) // {id, text} when editing

  // --- Recipient profile ---
  useEffect(() => {
    if (!recipientAddress) return
    const userData = UnifiedUserService.getUser(recipientAddress)
    setRecipientProfile({
      address: recipientAddress,
      username: userData.displayName,
      avatar: userData.avatar,
      avatarType: userData.avatarType,
      bio: userData.bio,
      company: userData.company,
    })

    const unsubscribe = UnifiedUserService.subscribe((updatedAddress) => {
      if (updatedAddress?.toLowerCase() === recipientAddress?.toLowerCase()) {
        const updated = UnifiedUserService.getUser(recipientAddress)
        setRecipientProfile({
          address: recipientAddress,
          username: updated.displayName,
          avatar: updated.avatar,
          avatarType: updated.avatarType,
          bio: updated.bio,
          company: updated.company,
        })
      }
    })
    return unsubscribe
  }, [recipientAddress])

  // --- Initialize keys and message service ---
  useEffect(() => {
    const init = async () => {
      if (account) {
        try {
          const keys = await KeyManagementService.initializeKeys(account)
          setUserKeys(keys)
        } catch (err) {
          logError('useChatRoom.initKeys', err)
          showError('Error', 'Failed to initialize encryption keys')
        }
      }
      if (provider && signer) {
        setMessageService(new MessageStorageService(provider, signer))
      }
    }
    init()
  }, [provider, signer, account])

  // --- Helpers ---
  const getStorageKey = useCallback(
    () => `dchat_messages_${account}_${recipientAddress}`,
    [account, recipientAddress]
  )

  const updateConversationsList = useCallback(
    (lastMessage) => {
      const conversationsKey = 'dchat_conversations'
      const stored = localStorage.getItem(conversationsKey)
      const conversations = stored ? JSON.parse(stored) : []
      const existingIndex = conversations.findIndex((c) => c.address === recipientAddress)
      const data = {
        address: recipientAddress,
        username: recipientProfile?.username || recipientAddress,
        avatar: recipientProfile?.avatar || '👤',
        lastMessage: lastMessage.substring(0, 50),
        timestamp: Date.now(),
        unread: 0,
      }
      if (existingIndex >= 0) {
        conversations[existingIndex] = data
      } else {
        conversations.unshift(data)
      }
      localStorage.setItem(conversationsKey, JSON.stringify(conversations))
    },
    [recipientAddress, recipientProfile]
  )

  const updateUnreadCount = useCallback(() => {
    const stored = localStorage.getItem('dchat_conversations')
    const conversations = stored ? JSON.parse(stored) : []
    const updated = conversations.map((conv) =>
      conv.address === recipientAddress ? { ...conv, unread: 0 } : conv
    )
    localStorage.setItem('dchat_conversations', JSON.stringify(updated))
  }, [recipientAddress])

  // --- Mark messages as read ---
  const markMessagesAsRead = useCallback(
    async (msgs) => {
      const unread = msgs.filter((m) => m.sender === 'other' && !m.isRead)
      if (unread.length === 0) return

      const updated = msgs.map((m) => (m.sender === 'other' ? { ...m, isRead: true } : m))
      localStorage.setItem(getStorageKey(), JSON.stringify(updated))
      setMessages(updated)

      const conversationId = [account, recipientAddress].sort().join('_')
      const messageIds = unread.map((m) => m.id)
      await readReceiptService.markAllMessagesAsRead(conversationId, messageIds)
      updateUnreadCount()
    },
    [account, recipientAddress, getStorageKey, updateUnreadCount]
  )

  // --- Load messages ---
  const loadMessages = useCallback(async () => {
    if (!messageService || !account || !recipientAddress) return
    try {
      setLoading(true)
      const stored = localStorage.getItem(getStorageKey())
      const localMessages = stored ? JSON.parse(stored) : []
      setMessages(localMessages)
      setLoading(false)
      markMessagesAsRead(localMessages)
    } catch (err) {
      logError('useChatRoom.loadMessages', err)
      showError('Error', 'Failed to load messages')
      setLoading(false)
    }
  }, [messageService, account, recipientAddress, getStorageKey, markMessagesAsRead])

  // Initial load
  useEffect(() => {
    if (isConnected && messageService) loadMessages()
  }, [isConnected, messageService, loadMessages])

  // --- Socket.IO real-time messaging ---
  useEffect(() => {
    if (!account || recipientAddress === 'file-helper') return

    socketService.connect(account)
    const roomId = [account, recipientAddress].sort().join('_')
    socketService.joinRoom(roomId)

    const unsubscribe = socketService.onMessage(async (data) => {
      if (data.room_id !== roomId || data.user_id === account) return

      let decryptedText = data.message
      const isEncrypted = data.is_encrypted || false

      if (isEncrypted && userKeys) {
        try {
          decryptedText = await decryptMessage(data.message, userKeys.privateKey)
        } catch (err) {
          logError('useChatRoom.decryptIncoming', err)
          decryptedText = '[Decryption Failed]'
        }
      }

      const newMessage = {
        id: data.message_id,
        text: decryptedText,
        sender: 'other',
        timestamp: new Date(data.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        createdAtMs: data.timestamp || Date.now(),
        isRead: false,
        type: 'text',
        encrypted: isEncrypted,
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev
        const updated = [...prev, newMessage]
        localStorage.setItem(getStorageKey(), JSON.stringify(updated))
        return updated
      })

      updateConversationsList(decryptedText)
    })

    // Listen for recall events from the other party
    const unsubRecall = socketService.onRecall((data) => {
      if (data.message_id == null) return
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === data.message_id || m.backendId === data.message_id
            ? { ...m, recalled: true, text: 'This message has been recalled' }
            : m
        )
        localStorage.setItem(getStorageKey(), JSON.stringify(updated))
        return updated
      })
    })

    // Listen for edit events from the other party
    const unsubEdit = socketService.onEdit((data) => {
      if (data.message_id == null || !data.content) return
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === data.message_id || m.backendId === data.message_id
            ? { ...m, text: data.content, edited: true }
            : m
        )
        localStorage.setItem(getStorageKey(), JSON.stringify(updated))
        return updated
      })
    })

    return () => {
      socketService.leaveRoom(roomId)
      unsubscribe()
      unsubRecall()
      unsubEdit()
    }
  }, [account, recipientAddress, userKeys, getStorageKey, updateConversationsList])

  // --- Send message ---
  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || sending) return
    const messageText = message.trim()
    setMessage('')
    setSending(true)

    try {
      // File transfer / self-chat: no encryption
      if (isFileTransfer) {
        const newMsg = {
          id: `msg_${Date.now()}`,
          text: messageText,
          sender: 'me',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          createdAtMs: Date.now(),
          isRead: true,
          type: 'text',
        }
        const updated = [...messages, newMsg]
        setMessages(updated)
        localStorage.setItem(getStorageKey(), JSON.stringify(updated))
        updateConversationsList(messageText)
        setSending(false)
        return
      }

      // Encrypted message
      const recipientPublicKey = await KeyManagementService.getPublicKey(recipientAddress)
      if (!recipientPublicKey) {
        showError('Error', 'Recipient has not set up encryption keys yet')
        setSending(false)
        return
      }

      const encryptedContent = await encryptMessage(messageText, recipientPublicKey)
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const newMsg = {
        id: messageId,
        text: messageText,
        sender: 'me',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        createdAtMs: Date.now(),
        isRead: false,
        type: 'text',
        encrypted: true,
      }

      const updated = [...messages, newMsg]
      setMessages(updated)
      localStorage.setItem(getStorageKey(), JSON.stringify(updated))
      updateConversationsList(messageText)

      // Send via Socket.IO
      const roomId = [account, recipientAddress].sort().join('_')
      socketService.sendMessage(roomId, encryptedContent, messageId, true)

      success('Sent!', 'Encrypted message sent')
    } catch (err) {
      logError('useChatRoom.sendMessage', err)
      showError('Error', 'Failed to send message')
    } finally {
      setSending(false)
    }
  }, [
    message, sending, messages, isFileTransfer, account, recipientAddress,
    getStorageKey, updateConversationsList, showError, success,
  ])

  // --- File upload ---
  const handleFileUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (!subscriptionService.canUploadFile(account, file.size)) {
        const limits = subscriptionService.getUserLimits(account)
        const maxSize = subscriptionService.formatSize(limits.fileSize)
        setUpgradeMessage({
          title: 'File Size Limit Exceeded',
          description: `Free plan allows files up to ${maxSize}. Upgrade to Pro for files up to 100MB, or Enterprise for unlimited file size.`,
        })
        setShowUpgradeDialog(true)
        e.target.value = ''
        return
      }

      setUploading(true)
      setUploadProgress(0)

      try {
        info('Uploading...', 'Uploading file to IPFS')
        const ipfsHash = await ipfsService.uploadFile(file)
        const messageText = `[FILE]${file.name}|${ipfsHash}|${file.type}|${file.size}`

        if (isFileTransfer) {
          const fileUrl = ipfsService.getGatewayUrl(ipfsHash)
          const newMsg = {
            id: `msg_${Date.now()}`,
            text: messageText,
            sender: 'me',
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            isRead: true,
            type: 'file',
            fileInfo: { name: file.name, hash: ipfsHash, type: file.type, size: file.size, url: fileUrl },
          }
          const updated = [...messages, newMsg]
          setMessages(updated)
          localStorage.setItem(getStorageKey(), JSON.stringify(updated))
          updateConversationsList(`Sent a file: ${file.name}`)
          success('Saved!', 'File saved to cloud')
          setUploading(false)
          e.target.value = ''
          return
        }

        // Encrypted file message
        const recipientPublicKey = await KeyManagementService.getPublicKey(recipientAddress)
        if (!recipientPublicKey) {
          showError('Error', 'Recipient has not set up encryption keys yet')
          setUploading(false)
          return
        }

        const encryptedContent = await encryptMessage(messageText, recipientPublicKey)
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        const newMsg = {
          id: messageId,
          text: messageText,
          sender: 'me',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          isRead: false,
          type: 'file',
          fileInfo: {
            name: file.name,
            hash: ipfsHash,
            type: file.type,
            size: file.size,
            url: ipfsService.getGatewayUrl(ipfsHash),
          },
          encrypted: true,
        }

        const updated = [...messages, newMsg]
        setMessages(updated)
        localStorage.setItem(getStorageKey(), JSON.stringify(updated))
        updateConversationsList(`Sent a file: ${file.name}`)

        const roomId = [account, recipientAddress].sort().join('_')
        socketService.sendMessage(roomId, encryptedContent, messageId, true)

        success('Sent!', 'File sent successfully')
      } catch (err) {
        logError('useChatRoom.fileUpload', err)
        showError('Error', 'Failed to upload file')
      } finally {
        setUploading(false)
        e.target.value = ''
      }
    },
    [
      account, messages, isFileTransfer, recipientAddress,
      getStorageKey, updateConversationsList, showError, success, info,
    ]
  )

  // --- Payment success handler ---
  const handlePaymentSuccess = useCallback(
    (paymentData) => {
      setShowPaymentDialog(false)
      success('Payment Created', 'Payment escrow created successfully')
      const paymentMessage = {
        id: Date.now().toString(),
        text: `Sent ${paymentData.amount} ETH - ${paymentData.description}`,
        sender: 'me',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        isRead: false,
        type: 'payment',
        amount: paymentData.amount,
        escrowId: paymentData.escrowId,
        status: 'pending',
      }
      const updated = [...messages, paymentMessage]
      setMessages(updated)
      localStorage.setItem(getStorageKey(), JSON.stringify(updated))
    },
    [messages, getStorageKey, success]
  )

  // --- Recall message ---
  const handleRecallMessage = useCallback(
    (msgId) => {
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === msgId ? { ...m, recalled: true, text: 'This message has been recalled' } : m
        )
        localStorage.setItem(getStorageKey(), JSON.stringify(updated))
        return updated
      })

      // Notify via socket
      const roomId = [account, recipientAddress].sort().join('_')
      socketService.recallMessage(roomId, msgId)
      info('Recalled', 'Message has been recalled')
    },
    [account, recipientAddress, getStorageKey, info]
  )

  // --- Start editing ---
  const handleStartEdit = useCallback(
    (msg) => {
      setEditingMessage({ id: msg.id, text: msg.text })
      setMessage(msg.text)
    },
    []
  )

  // --- Save edit ---
  const handleSaveEdit = useCallback(
    (newContent) => {
      if (!editingMessage || !newContent.trim()) return

      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === editingMessage.id ? { ...m, text: newContent.trim(), edited: true } : m
        )
        localStorage.setItem(getStorageKey(), JSON.stringify(updated))
        return updated
      })

      // Notify via socket
      const roomId = [account, recipientAddress].sort().join('_')
      socketService.editMessage(roomId, editingMessage.id, newContent.trim())

      setEditingMessage(null)
      setMessage('')
      info('Edited', 'Message has been updated')
    },
    [editingMessage, account, recipientAddress, getStorageKey, info]
  )

  // --- Cancel edit ---
  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null)
    setMessage('')
  }, [])

  // --- Voice message ---
  const handleVoiceSend = useCallback(
    (fileData) => {
      const newMsg = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: 'Voice message',
        sender: 'me',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        createdAtMs: Date.now(),
        isRead: false,
        type: 'audio',
        fileUrl: fileData.file_url,
        fileName: fileData.file_name,
        fileSize: fileData.file_size,
        duration: fileData.duration,
      }

      const updated = [...messages, newMsg]
      setMessages(updated)
      localStorage.setItem(getStorageKey(), JSON.stringify(updated))
      updateConversationsList('Voice message')

      // Send via Socket.IO
      if (!isFileTransfer) {
        const roomId = [account, recipientAddress].sort().join('_')
        socketService.sendMessage(roomId, JSON.stringify({
          type: 'audio',
          file_url: fileData.file_url,
          file_name: fileData.file_name,
          file_size: fileData.file_size,
          duration: fileData.duration,
        }), newMsg.id, false)
      }

      success('Sent!', 'Voice message sent')
    },
    [messages, isFileTransfer, account, recipientAddress, getStorageKey, updateConversationsList, success]
  )

  return {
    // State
    message,
    messages,
    loading,
    sending,
    uploading,
    uploadProgress,
    recipientAddress,
    recipientProfile,
    isFileTransfer,
    isConnected,
    account,
    showMenu,
    showUpgradeDialog,
    upgradeMessage,
    showPaymentDialog,
    editingMessage,
    // Actions
    setMessage,
    setShowMenu,
    setShowUpgradeDialog,
    setShowPaymentDialog,
    handleSendMessage,
    handleFileUpload,
    handlePaymentSuccess,
    handleRecallMessage,
    handleStartEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleVoiceSend,
    info,
  }
}
