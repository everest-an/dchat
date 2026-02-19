/**
 * MessageBubble Component
 *
 * Renders a single chat message. Supports text, payment, file, image, and video types.
 * Includes right-click context menu for recall and edit actions.
 */
import { useState } from 'react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { DollarSign, Pencil, Undo2, Copy, Flag, Forward } from 'lucide-react'
import DOMPurify from 'dompurify'
import MessageReactions from '../MessageReactions'
import { UserAvatar } from '../ui/UserAvatar'
import ReportDialog from '../ReportDialog'
import VoicePlayer from './VoicePlayer'

const RECALL_WINDOW_MS = 2 * 60 * 1000 // 2 minutes
const EDIT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

/**
 * @param {{
 *   msg: object,
 *   isMe: boolean,
 *   recipientAddress: string,
 *   account: string,
 *   onRecall: (id: string) => void,
 *   onEdit: (msg: object) => void,
 *   onForward: (msg: object) => void,
 * }} props
 */
const MessageBubble = ({ msg, isMe, recipientAddress, account, onRecall, onEdit, onForward }) => {
  const [reportOpen, setReportOpen] = useState(false)

  const now = Date.now()
  const elapsed = msg.createdAtMs ? now - msg.createdAtMs : Infinity
  const canRecall = isMe && !msg.recalled && elapsed < RECALL_WINDOW_MS
  const canEdit = isMe && !msg.recalled && msg.type === 'text' && elapsed < EDIT_WINDOW_MS

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.text || '')
  }

  // Recalled message - minimal display for all types
  if (msg.recalled) {
    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className="max-w-[70%]">
          <div className="rounded-2xl px-4 py-2 bg-gray-50 border border-gray-200">
            <p className="text-sm text-gray-400 italic">This message has been recalled</p>
          </div>
          <div className="flex items-center gap-2 mt-1 px-2">
            <span className="text-xs text-gray-400">{msg.timestamp}</span>
          </div>
        </div>
      </div>
    )
  }

  // Context menu wrapper - available for all messages (own: edit/recall, others: report)
  const wrapWithContextMenu = (children) => {
    return (
      <>
        <ContextMenu.Root>
          <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Content className="min-w-[160px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {canEdit && (
                <ContextMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer outline-none"
                  onSelect={() => onEdit?.(msg)}
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </ContextMenu.Item>
              )}
              {canRecall && (
                <ContextMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                  onSelect={() => onRecall?.(msg.id)}
                >
                  <Undo2 className="w-4 h-4" />
                  Recall
                </ContextMenu.Item>
              )}
              <ContextMenu.Separator className="h-px bg-gray-200 my-1" />
              <ContextMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer outline-none"
                onSelect={handleCopy}
              >
                <Copy className="w-4 h-4" />
                Copy
              </ContextMenu.Item>
              <ContextMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer outline-none"
                onSelect={() => onForward?.(msg)}
              >
                <Forward className="w-4 h-4" />
                Forward
              </ContextMenu.Item>
              {!isMe && (
                <>
                  <ContextMenu.Separator className="h-px bg-gray-200 my-1" />
                  <ContextMenu.Item
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                    onSelect={() => setReportOpen(true)}
                  >
                    <Flag className="w-4 h-4" />
                    Report
                  </ContextMenu.Item>
                </>
              )}
            </ContextMenu.Content>
          </ContextMenu.Portal>
        </ContextMenu.Root>

        <ReportDialog
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          reportedUserId={msg.senderId}
          reportedMessageId={msg.id}
          reportedUserName={msg.senderName || 'this user'}
        />
      </>
    )
  }

  // Edited indicator helper
  const editedIndicator = msg.edited ? (
    <span className="text-xs text-gray-400 italic">(edited)</span>
  ) : null

  // Payment message
  if (msg.type === 'payment') {
    return wrapWithContextMenu(
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
        {!isMe && <UserAvatar address={recipientAddress} size="sm" className="mr-2" />}
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
            <div
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.text) }}
            />
            {msg.escrowId && (
              <p className="text-xs mt-1 opacity-70">Escrow ID: {msg.escrowId}</p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  msg.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : msg.status === 'released'
                    ? 'bg-green-100 text-green-800'
                    : msg.status === 'refunded'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.status || 'pending'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 px-2">
              <span className="text-xs text-gray-500">{msg.timestamp}</span>
              {editedIndicator}
              {isMe && msg.isRead && <span className="text-xs text-blue-500">✓✓</span>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Text message
  if (msg.type === 'text') {
    return wrapWithContextMenu(
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
        {!isMe && <UserAvatar address={recipientAddress} size="sm" className="mr-2" />}
        <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
          <div
            className={`rounded-2xl px-4 py-2 ${
              isMe
                ? 'bg-black text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
            }`}
          >
            <div
              className="text-sm whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.text) }}
            />
          </div>
          <div className="flex items-center gap-2 mt-1 px-2">
            <span className="text-xs text-gray-500">{msg.timestamp}</span>
            {editedIndicator}
            {isMe && msg.isRead && <span className="text-xs text-blue-500">✓✓</span>}
          </div>
          <MessageReactions
            messageId={msg.id}
            currentUserId={account}
            initialReactions={msg.reactions || []}
          />
        </div>
      </div>
    )
  }

  // Audio / voice message
  if (msg.type === 'audio') {
    return wrapWithContextMenu(
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
        {!isMe && <UserAvatar address={recipientAddress} size="sm" className="mr-2" />}
        <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
          <VoicePlayer fileUrl={msg.fileUrl} duration={msg.duration} isMe={isMe} />
          <div className="flex items-center gap-2 mt-1 px-2">
            <span className="text-xs text-gray-500">{msg.timestamp}</span>
            {editedIndicator}
            {isMe && msg.isRead && <span className="text-xs text-blue-500">✓✓</span>}
          </div>
          <MessageReactions
            messageId={msg.id}
            currentUserId={account}
            initialReactions={msg.reactions || []}
          />
        </div>
      </div>
    )
  }

  // File / image / video / document message
  return wrapWithContextMenu(
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4 group`}>
      {!isMe && (
        <UserAvatar address={recipientAddress} size="sm" className="mr-2 self-end mb-1" />
      )}
      <div className={`max-w-[75%] ${isMe ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-2xl overflow-hidden shadow-sm transition-all ${
            isMe
              ? 'bg-primary text-primary-foreground rounded-br-none'
              : 'bg-card text-card-foreground border border-border rounded-bl-none'
          }`}
        >
          {msg.type === 'image' && (
            <div className="relative group/image">
              <img
                src={msg.fileUrl}
                alt={msg.fileName}
                className="max-w-full h-auto cursor-pointer hover:scale-105 transition-transform duration-300"
                onClick={() => window.open(msg.fileUrl, '_blank')}
              />
              <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors pointer-events-none" />
            </div>
          )}
          {msg.type === 'video' && (
            <video controls className="max-w-full rounded-lg">
              <source src={msg.fileUrl} />
            </video>
          )}
          {(msg.type === 'document' || msg.type === 'file') && (
            <a
              href={msg.fileUrl || msg.fileInfo?.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                isMe ? 'hover:bg-white/10' : 'hover:bg-black/5'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-sm ${
                  isMe ? 'bg-white/20 text-white' : 'bg-white text-primary'
                }`}
              >
                {msg.type === 'pdf' ? '📄' : '📎'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">
                  {msg.fileName || msg.fileInfo?.name || 'Document'}
                </p>
                <p className="text-xs opacity-70">
                  {msg.fileSize || msg.fileInfo?.size || 'Unknown size'}
                </p>
              </div>
            </a>
          )}
        </div>
        <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] text-muted-foreground opacity-70">{msg.timestamp}</span>
          {editedIndicator}
          {isMe && (
            <span className={`text-[10px] ${msg.isRead ? 'text-primary' : 'text-muted-foreground'}`}>
              {msg.isRead ? '✓✓' : '✓'}
            </span>
          )}
          {msg.encrypted && (
            <span className="text-[10px] text-muted-foreground" title="End-to-end encrypted">
              🔒
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default MessageBubble
