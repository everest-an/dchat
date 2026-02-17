/**
 * ChatInput Component
 *
 * Bottom input area with text input, file attachment, payment button,
 * and upload progress indicator.
 */
import { useRef } from 'react'
import { Send, Paperclip, DollarSign, Loader2 } from 'lucide-react'

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
 *   isFileTransfer: boolean
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
}) => {
  const fileInputRef = useRef(null)

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
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
          <button
            onClick={onSend}
            disabled={!message.trim() || sending || uploading}
            className="p-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </>
  )
}

export default ChatInput
