/**
 * ChatInput Component
 *
 * Bottom input area with text input, file attachment, payment button,
 * and upload progress indicator.
 */
import { useRef } from 'react'
import { Send, Paperclip, DollarSign, Loader2, Check, X, Sparkles } from 'lucide-react'
import VoiceRecorder from './VoiceRecorder'

/**
 * @param {{
 *   message: string,
 *   onMessageChange: (value: string) => void,
 *   onSend: () => void,
 *   onFileUpload: (e: Event) => void,
 *   onOpenPayment: () => void,
 *   sending: boolean,
 *   uploading: boolean,
 *   uploadProgress: number,
 *   isFileTransfer: boolean,
 *   editingMessage: object|null,
 *   onCancelEdit: () => void,
 *   onSaveEdit: (content: string) => void,
 *   onVoiceSend?: (fileData: object) => void,
 * }} props
 */
const ChatInput = ({
  message,
  onMessageChange,
  onSend,
  onFileUpload,
  onOpenPayment,
  sending,
  uploading,
  uploadProgress,
  isFileTransfer,
  editingMessage,
  onCancelEdit,
  onSaveEdit,
  onVoiceSend,
  onToggleAI,
}) => {
  const fileInputRef = useRef(null)

  const isEditing = !!editingMessage

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isEditing) {
        onSaveEdit?.(message)
      } else {
        onSend()
      }
    }
    if (e.key === 'Escape' && isEditing) {
      onCancelEdit?.()
    }
  }

  return (
    <>
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

      {/* Editing Banner */}
      {isEditing && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
          <span className="text-sm text-blue-700 font-medium">Editing message</span>
          <button
            onClick={onCancelEdit}
            className="p-1 hover:bg-blue-100 rounded-full text-blue-600"
            title="Cancel edit"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Area */}
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
          {!isFileTransfer && (
            <button
              onClick={onOpenPayment}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Send payment"
            >
              <DollarSign className="w-5 h-5" />
            </button>
          )}
          {onToggleAI && (
            <button
              onClick={onToggleAI}
              className="p-2 hover:bg-gray-100 rounded-full text-purple-600"
              title="AI Assistant"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            onChange={onFileUpload}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.md"
          />
          <input
            type="text"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={sending || uploading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
          />
          {/* Show send button when there's text, voice recorder when empty */}
          {message.trim() || isEditing ? (
            <button
              onClick={isEditing ? () => onSaveEdit?.(message) : onSend}
              disabled={!message.trim() || sending || uploading}
              className={`p-2 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed ${
                isEditing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-black hover:bg-gray-800'
              }`}
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isEditing ? (
                <Check className="w-5 h-5" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          ) : onVoiceSend ? (
            <VoiceRecorder onVoiceSend={onVoiceSend} disabled={uploading || sending} />
          ) : (
            <button
              onClick={onSend}
              disabled
              className="p-2 text-white rounded-full bg-black opacity-50 cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </>
  )
}

export default ChatInput
