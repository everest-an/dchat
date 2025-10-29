import { useState, useRef } from 'react'
import { X, Camera, Upload } from 'lucide-react'
import { Button } from './ui/button'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { UserProfileService } from '../services/UserProfileService'
import QRCode from 'qrcode'

const ScanQRDialog = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const { success, error } = useToast()
  const [scanning, setScanning] = useState(false)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // Read file as data URL
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          // Create image element
          const img = new Image()
          img.onload = async () => {
            // Create canvas to process image
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0)

            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            
            // Use jsQR to decode (we'll use a simpler approach)
            // For now, let's use a placeholder
            error('Coming Soon', 'QR code scanning from image will be available soon')
          }
          img.src = event.target.result
        } catch (err) {
          error('Error', 'Failed to process image')
          console.error(err)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      error('Error', 'Failed to read file')
      console.error(err)
    }
  }

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setScanning(true)
    } catch (err) {
      error('Camera Error', 'Failed to access camera')
      console.error(err)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setScanning(false)
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  const handleManualInput = () => {
    const address = prompt('Enter wallet address:')
    if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
      // Save as contact
      const username = UserProfileService.getDefaultUsername(address)
      const avatar = UserProfileService.getDefaultAvatar(address)
      
      UserProfileService.saveProfile(address, {
        username,
        avatar,
        addedAt: Date.now()
      })
      
      success('Contact Added', `Added ${username}`)
      navigate(`/chat/${address}`)
      handleClose()
    } else if (address) {
      error('Invalid Address', 'Please enter a valid Ethereum address')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Scan QR Code</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Camera View */}
          {scanning ? (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 bg-black rounded-lg object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-4 border-white rounded-lg"></div>
              </div>
              <Button
                onClick={stopCamera}
                className="mt-4 w-full"
                variant="outline"
              >
                Stop Camera
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Start Camera */}
              <Button
                onClick={startCamera}
                className="w-full bg-black hover:bg-gray-800 text-white"
              >
                <Camera className="w-4 h-4 mr-2" />
                Start Camera
              </Button>

              {/* Upload Image */}
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload QR Code Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Manual Input */}
              <Button
                onClick={handleManualInput}
                variant="outline"
                className="w-full"
              >
                Enter Address Manually
              </Button>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>Tip:</strong> Point your camera at a DChat QR code to add a new contact instantly. 
              Or upload a QR code image from your gallery.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScanQRDialog
