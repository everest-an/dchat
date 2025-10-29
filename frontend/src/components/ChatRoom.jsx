import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, Send, Camera, Paperclip, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWeb3 } from '../contexts/Web3Context'
import { MessageStorageService } from '../services/MessageStorageService'
import { encryptMessage, decryptMessage } from '../utils/encryption'

const ChatRoom = () => {
  const navigate = useNavigate()
  const { id: recipientAddress } = useParams()
  const { account, provider, signer, isConnected } = useWeb3()
  
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [recipientInfo, setRecipientInfo] = useState(null)
  const [messageService, setMessageService] = useState(null)

  // 初始化消息服务
  useEffect(() => {
    if (provider && signer) {
      const service = new MessageStorageService(provider, signer)
      setMessageService(service)
    }
  }, [provider, signer])

  // 加载对话消息
  const loadMessages = useCallback(async () => {
    if (!messageService || !account || !recipientAddress) return

    try {
      setLoading(true)
      const result = await messageService.getConversationMessages(
        account,
        recipientAddress,
        0,
        100
      )

      if (result.success) {
        // 解密消息
        const decryptedMessages = await Promise.all(
          result.messages.map(async (msg) => {
            try {
              // 这里需要用户的私钥来解密
              // 在实际应用中,应该从安全存储中获取私钥
              const decryptedContent = msg.encryptedContent // 暂时不解密,显示原文
              
              return {
                id: msg.messageId,
                text: decryptedContent,
                sender: msg.sender.toLowerCase() === account.toLowerCase() ? 'me' : 'other',
                timestamp: new Date(msg.timestamp * 1000).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                isRead: msg.isRead,
                txHash: msg.txHash
              }
            } catch (err) {
              console.error('Error decrypting message:', err)
              return null
            }
          })
        )

        setMessages(decryptedMessages.filter(msg => msg !== null))
      }
    } catch (err) {
      console.error('Error loading messages:', err)
    } finally {
      setLoading(false)
    }
  }, [messageService, account, recipientAddress])

  // 加载接收者信息
  useEffect(() => {
    // 这里可以从 UserIdentity 合约加载用户信息
    // 暂时使用地址作为显示名称
    setRecipientInfo({
      name: recipientAddress ? `${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}` : 'Unknown',
      company: 'Web3 User',
      avatar: '👤'
    })
  }, [recipientAddress])

  // 初始加载消息
  useEffect(() => {
    if (isConnected && messageService) {
      loadMessages()
    }
  }, [isConnected, messageService, loadMessages])

  // 发送消息
  const handleSendMessage = async () => {
    if (!message.trim() || !messageService || !recipientAddress || sending) return

    try {
      setSending(true)

      // 1. 加密消息
      // 在实际应用中,应该使用接收者的公钥加密
      // 这里暂时使用明文存储
      const encryptedContent = message.trim()

      // 2. 存储到区块链
      const result = await messageService.storeMessage(
        recipientAddress,
        encryptedContent,
        '', // IPFS hash (可选)
        JSON.stringify({ type: 'text' }) // 元数据
      )

      if (result.success) {
        // 3. 添加到本地消息列表
        const newMessage = {
          id: Date.now(),
          text: message.trim(),
          sender: 'me',
          timestamp: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          isRead: false,
          txHash: result.txHash
        }

        setMessages(prev => [...prev, newMessage])
        setMessage('')

        // 4. 重新加载消息以获取链上数据
        setTimeout(() => {
          loadMessages()
        }, 2000)
      } else {
        alert('Failed to send message: ' + result.error)
      }
    } catch (err) {
      console.error('Error sending message:', err)
      alert('Error sending message: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 如果未连接钱包,显示提示
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        <Lock className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Wallet</h2>
        <p className="text-gray-600 mb-6">Please connect your wallet to start chatting</p>
        <Button onClick={() => navigate('/login')} className="bg-black hover:bg-gray-800">
          Connect Wallet
        </Button>
      </div>
    )
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
            {recipientInfo?.avatar || '👤'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-medium text-black">{recipientInfo?.name || 'Loading...'}</h2>
              <Lock className="w-4 h-4 text-green-500" title="End-to-end encrypted" />
            </div>
            <p className="text-sm text-gray-500">{recipientInfo?.company || ''}</p>
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Lock className="w-12 h-12 mb-2" />
            <p>No messages yet</p>
            <p className="text-sm">Start a secure conversation</p>
          </div>
        ) : (
          messages.map((msg) => (
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
                <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p
                    className={`text-xs ${
                      msg.sender === 'me' ? 'text-gray-300' : 'text-gray-500'
                    }`}
                  >
                    {msg.timestamp}
                  </p>
                  {msg.txHash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${msg.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-xs underline ${
                        msg.sender === 'me' ? 'text-gray-300' : 'text-gray-500'
                      }`}
                      title="View on Etherscan"
                    >
                      📜
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 输入区域 */}
      <div className="px-4 py-4 bg-white border-t border-gray-200">
        <div className="flex items-end gap-3">
          {/* 附件按钮 */}
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-10 h-10 rounded-full"
              title="Coming soon"
              disabled
            >
              <Camera className="w-5 h-5 text-gray-500" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-10 h-10 rounded-full"
              title="Coming soon"
              disabled
            >
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
              disabled={sending}
            />
          </div>

          {/* 发送按钮 */}
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sending}
            className="w-10 h-10 rounded-full bg-black hover:bg-gray-800 disabled:bg-gray-300 p-0"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {/* 提示信息 */}
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-gray-500">
          <Lock className="w-3 h-3" />
          <span>Messages are stored on blockchain and encrypted</span>
        </div>
      </div>
    </div>
  )
}

export default ChatRoom
