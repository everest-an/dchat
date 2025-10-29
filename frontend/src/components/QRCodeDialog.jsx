import { useState, useEffect, useRef } from 'react'
import { X, Download, Share2, Copy, Check } from 'lucide-react'
import QRCode from 'qrcode'
import { Button } from './ui/button'
import { UserProfileService } from '../services/UserProfileService'
import { useToast } from '../contexts/ToastContext'

const QRCodeDialog = ({ isOpen, onClose, address }) => {
  const { success } = useToast()
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef(null)
  
  const profile = UserProfileService.getProfile(address)
  const displayName = UserProfileService.getDisplayName(address)
  const avatar = UserProfileService.getDisplayAvatar(address)

  useEffect(() => {
    if (isOpen && address) {
      generateQRCode()
    }
  }, [isOpen, address])

  const generateQRCode = async () => {
    try {
      // 创建包含用户信息的数据
      const qrData = JSON.stringify({
        type: 'dchat_contact',
        address: address,
        username: profile?.username || displayName,
        avatar: avatar,
        timestamp: Date.now()
      })

      // 生成二维码
      const url = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      setQrCodeUrl(url)
    } catch (err) {
      console.error('Error generating QR code:', err)
    }
  }

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
    if (!qrCodeUrl) return

    const link = document.createElement('a')
    link.download = `dchat-qr-${address.slice(0, 8)}.png`
    link.href = qrCodeUrl
    link.click()
    success('Downloaded!', 'QR code saved to downloads')
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        // Convert data URL to blob
        const response = await fetch(qrCodeUrl)
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
      // Fallback: copy address
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
              {avatar}
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
            <div className="p-4 bg-white border-4 border-gray-200 rounded-2xl">
              {qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className="w-64 h-64"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
                </div>
              )}
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
