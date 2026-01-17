import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Smartphone, X } from 'lucide-react'
import { Button } from './ui/button'
import { useToast } from '../contexts/ToastContext'
import { UserProfileService } from '../services/UserProfileService'
import { useNavigate } from 'react-router-dom'
import { useWeb3 } from '../contexts/Web3Context'

const NFCDialog = ({ isOpen, onClose }) => {
  const [isSupported, setIsSupported] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isWriting, setIsWriting] = useState(false)
  const { success, error, info } = useToast()
  const navigate = useNavigate()
  const { account } = useWeb3()

  useEffect(() => {
    if ('NDEFReader' in window) {
      setIsSupported(true)
    }
  }, [])

  const startScan = async () => {
    if (!isSupported) return

    try {
      const ndef = new NDEFReader()
      await ndef.scan()
      setIsScanning(true)
      info('Ready to Scan', 'Tap another device to add friend')

      ndef.onreading = event => {
        const decoder = new TextDecoder()
        for (const record of event.message.records) {
          if (record.recordType === "text") {
            const text = decoder.decode(record.data)
            try {
              const data = JSON.parse(text)
              if (data.type === 'dchat_contact' && data.address) {
                // Save contact
                UserProfileService.saveProfile(data.address, {
                  username: data.username,
                  avatar: data.avatar,
                  addedAt: Date.now()
                })

                success('NFC Contact Added', `Added ${data.username}`)
                window.dispatchEvent(new CustomEvent('contactAdded'))
                navigate(`/chat/${data.address}`)
                onClose()
                return
              }
            } catch (e) {
              console.error('NFC Parse Error', e)
            }
          }
        }
      }

      ndef.onreadingerror = () => {
        error('NFC Error', 'Failed to read NFC tag')
      }

    } catch (err) {
      console.error(err)
      error('NFC Error', 'Failed to start NFC scan. Make sure NFC is enabled.')
      setIsScanning(false)
    }
  }

  const shareProfile = async () => {
    if (!isSupported || !account) return

    try {
      setIsWriting(true)
      const ndef = new NDEFReader()

      const profile = UserProfileService.getProfile(account)
      const avatarData = UserProfileService.getDisplayAvatar(account)
      const data = JSON.stringify({
        type: 'dchat_contact',
        address: account,
        username: UserProfileService.getDisplayName(account),
        avatar: avatarData?.emoji || UserProfileService.getDefaultAvatar(account)
      })

      await ndef.write({
        records: [{ recordType: "text", data }]
      })

      success('Ready to Share', 'Tap another device to share your profile')

    } catch (err) {
      console.error(err)
      error('NFC Error', 'Failed to write NFC tag')
    } finally {
      setIsWriting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">NFC Friend Add</h2>
          <p className="text-gray-500 text-sm">
            Tap devices together to add friends instantly, even without internet.
          </p>
        </div>

        {isSupported ? (
          <div className="space-y-4">
            <Button
              onClick={startScan}
              className="w-full flex items-center justify-center gap-2"
              disabled={isScanning}
            >
              <Wifi className="w-4 h-4" />
              {isScanning ? 'Scanning...' : 'Scan Friend\'s Device'}
            </Button>

            <Button
              variant="outline"
              onClick={shareProfile}
              className="w-full"
              disabled={isWriting}
            >
              Share My Profile
            </Button>

            <p className="text-xs text-center text-gray-400 mt-4">
              Make sure NFC is enabled on your device.
            </p>
          </div>
        ) : (
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <WifiOff className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              NFC is not supported on this device or browser.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Try using Chrome on Android.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default NFCDialog
