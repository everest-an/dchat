/**
 * MessageList Component
 *
 * Renders the scrollable message area with loading state,
 * empty state, and auto-scroll to bottom.
 */
import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { UserAvatar } from '../ui/UserAvatar'
import MessageBubble from './MessageBubble'

/**
 * @param {{
 *   messages: Array,
 *   loading: boolean,
 *   recipientAddress: string,
 *   recipientProfile: object|null,
 *   account: string
 * }} props
 */
const MessageList = ({ messages, loading, recipientAddress, recipientProfile, account }) => {
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <UserAvatar address={recipientAddress} size="2xl" className="mb-4" />
          <h3 className="font-semibold text-lg mb-2">{recipientProfile?.username}</h3>
          <p className="text-gray-500 text-sm">
            Start your conversation with {recipientProfile?.username}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          msg={msg}
          isMe={msg.sender === 'me'}
          recipientAddress={recipientAddress}
          account={account}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}

export default MessageList
