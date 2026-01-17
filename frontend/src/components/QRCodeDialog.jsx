import { useState, useEffect, useRef } from 'react'
import { X, Download, Share2, Copy, Check } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { Button } from './ui/button'
import { UserProfileService } from '../services/UserProfileService'
import { useToast } from '../contexts/ToastContext'

const QRCodeDialog = ({ isOpen, onClose, address }) => {
  const { success } = useToast()
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef(null)

  const profile = UserProfileService.getProfile(address)
  const displayName = UserProfileService.getDisplayName(address)
  const avatarData = UserProfileService.getDisplayAvatar(address)
  const avatarEmoji = avatarData?.emoji || UserProfileService.getDefaultAvatar(address)

  const qrData = JSON.stringify({
    type: 'dchat_contact',
    address: address,
    username: profile?.username || displayName,
    avatar: avatarEmoji
  })

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      success('Copied!', 'Address copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = () => {
    const canvas = canvasRef.current?.querySelector('canvas') || canvasRef.current
    if (!canvas) return

    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `dchat-qr-${address.slice(0, 8)}.png`
    link.href = url
    link.click()
    success('Downloaded!', 'QR code saved to downloads')
  }

  const handleShare = async () => {
    const canvas = canvasRef.current?.querySelector('canvas') || canvasRef.current
    if (!canvas) return

    if (navigator.share) {
      try {
        const url = canvas.toDataURL('image/png')
        const response = await fetch(url)
        const blob = await response.blob()
        const file = new File([blob], 'dchat-qr.png', { type: 'image/png' })

        await navigator.share({
          title: 'Add me on DChat',
          text: `Connect with ${displayName} on DChat`,
          files: [file]
        })
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err)
        }
      }
    } else {
      handleCopyAddress()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">My QR Code</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl">
              {avatarEmoji}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900">{displayName}</h3>
              {profile?.bio && (
                <p className="text-sm text-gray-600 line-clamp-2">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-4 bg-white border-4 border-gray-200 rounded-2xl shadow-inner">
              <QRCodeCanvas
                ref={canvasRef}
                value={qrData}
                size={256}
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: "/logo.png",
                  x: undefined,
                  y: undefined,
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wallet Address
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-gray-50 rounded-lg font-mono text-sm text-gray-600 overflow-x-auto">
                {address}
              </div>
              <button
                onClick={handleCopyAddress}
                className="p-3 hover:bg-gray-100 rounded-lg transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>How to use:</strong> Share this QR code with others to let them add you as a contact.
              They can scan it with their DChat app to start chatting!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t">
          <Button
            onClick={handleDownload}
            variant="outline"
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button
            onClick={handleShare}
            className="flex-1 bg-black hover:bg-gray-800 text-white"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </div>
  )
}

export default QRCodeDialog
