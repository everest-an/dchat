/**
 * ChatHeader Component
 *
 * Renders the chat room header with recipient info, back button,
 * and action buttons (call, video, menu).
 */
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, Video, MoreVertical } from 'lucide-react'
import { Button } from '../ui/button'
import { UserAvatar } from '../ui/UserAvatar'

/**
 * @param {{
 *   recipientAddress: string,
 *   recipientProfile: object|null,
 *   isFileTransfer: boolean,
 *   showMenu: boolean,
 *   onToggleMenu: () => void,
 *   onInfoToast: (title: string, msg: string) => void
 * }} props
 */
const ChatHeader = ({
  recipientAddress,
  recipientProfile,
  isFileTransfer,
  showMenu,
  onToggleMenu,
  onInfoToast,
}) => {
  const navigate = useNavigate()

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 border-b border-border/40 backdrop-blur-xl sticky top-0 z-10 ${
        isFileTransfer ? 'bg-blue-50/80 dark:bg-blue-950/20' : 'bg-background/80'
      }`}
    >
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="hover:bg-accent/50"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          {isFileTransfer ? (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm ring-2 ring-offset-2 ring-offset-background bg-blue-100 text-blue-600 ring-blue-100">
              📂
            </div>
          ) : (
            <UserAvatar
              address={recipientAddress}
              size="md"
              className="shadow-sm ring-2 ring-offset-2 ring-offset-background ring-transparent"
            />
          )}
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              {isFileTransfer
                ? 'File Transfer'
                : recipientProfile?.username || 'Loading...'}
              {isFileTransfer && (
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                  ME
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isFileTransfer
                ? 'Send files to yourself'
                : recipientProfile?.company || 'Online'}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isFileTransfer && (
          <>
            <button
              onClick={() =>
                onInfoToast('Coming Soon', 'Voice calls will be available in the next update')
              }
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button
              onClick={() =>
                onInfoToast('Coming Soon', 'Video calls will be available in the next update')
              }
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <Video className="w-5 h-5" />
            </button>
          </>
        )}
        <button
          onClick={onToggleMenu}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default ChatHeader
