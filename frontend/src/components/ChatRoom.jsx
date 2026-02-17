/**
 * ChatRoom Component
 *
 * Composition root for the chat room view. All business logic is
 * encapsulated in useChatRoom hook; UI is delegated to sub-components.
 *
 * Refactored from 818-line "god component" into:
 *   - ChatHeader: top navigation bar
 *   - MessageList: scrollable message area
 *   - ChatInput: bottom input with file upload
 *   - useChatRoom: all business logic (messaging, encryption, sockets)
 */
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import UpgradeDialog from './dialogs/UpgradeDialog'
import PaymentDialog from './dialogs/PaymentDialog'
import { ChatHeader, MessageList, ChatInput } from './chat'
import { useChatRoom } from './chat/useChatRoom'

const ChatRoom = () => {
  const navigate = useNavigate()
  const {
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
    // Actions
    setMessage,
    setShowMenu,
    setShowUpgradeDialog,
    setShowPaymentDialog,
    handleSendMessage,
    handleFileUpload,
    handlePaymentSuccess,
    info,
  } = useChatRoom()

  // Not connected guard
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
    <div className="flex flex-col h-full bg-background">
      <ChatHeader
        recipientAddress={recipientAddress}
        recipientProfile={recipientProfile}
        isFileTransfer={isFileTransfer}
        showMenu={showMenu}
        onToggleMenu={() => setShowMenu(!showMenu)}
        onInfoToast={info}
      />

      <MessageList
        messages={messages}
        loading={loading}
        recipientAddress={recipientAddress}
        recipientProfile={recipientProfile}
        account={account}
      />

      <ChatInput
        message={message}
        onMessageChange={setMessage}
        onSend={handleSendMessage}
        onFileUpload={handleFileUpload}
        onOpenPayment={() => setShowPaymentDialog(true)}
        sending={sending}
        uploading={uploading}
        uploadProgress={uploadProgress}
        isFileTransfer={isFileTransfer}
      />

      <UpgradeDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        title={upgradeMessage.title}
        description={upgradeMessage.description}
      />

      <PaymentDialog
        open={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        onSuccess={handlePaymentSuccess}
        recipientAddress={recipientAddress}
        userAddress={account}
      />
    </div>
  )
}

export default ChatRoom
