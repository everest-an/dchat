import { useState, useEffect } from 'react'
import { X, Lock, Shield, Download, Upload, Key, AlertTriangle, CheckCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { useWeb3 } from '../../contexts/Web3Context'
import { useToast } from '../../contexts/ToastContext'
import { encryptionService } from '../../services/EncryptionService'

const KeyManagementDialog = ({ isOpen, onClose }) => {
  const { account } = useWeb3()
  const { success, error, info } = useToast()
  
  const [keyPair, setKeyPair] = useState(null)
  const [hasKeys, setHasKeys] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)

  useEffect(() => {
    if (account && isOpen) {
      checkKeys()
    }
  }, [account, isOpen])

  const checkKeys = () => {
    const keys = encryptionService.getKeyPair(account)
    if (keys) {
      setKeyPair(keys)
      setHasKeys(true)
    } else {
      setKeyPair(null)
      setHasKeys(false)
    }
  }

  const handleGenerateKeys = async () => {
    setLoading(true)
    try {
      info('Generating...', 'Generating encryption keys')
      
      const keys = await encryptionService.generateKeyPair()
      encryptionService.storeKeyPair(account, keys)
      
      // 尝试存储到区块链(可选)
      try {
        await encryptionService.storePublicKeyOnChain(keys.publicKey)
      } catch (err) {
        console.warn('Failed to store public key on chain:', err)
      }
      
      setKeyPair(keys)
      setHasKeys(true)
      
      success('Success!', 'Encryption keys generated successfully')
    } catch (err) {
      console.error('Error generating keys:', err)
      error('Error', 'Failed to generate encryption keys')
    } finally {
      setLoading(false)
    }
  }

  const handleExportKeys = () => {
    try {
      const data = encryptionService.exportKeyPair(account)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dchat-keys-${account.slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      success('Exported!', 'Keys exported successfully')
    } catch (err) {
      console.error('Error exporting keys:', err)
      error('Error', 'Failed to export keys')
    }
  }

  const handleImportKeys = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      try {
        const text = await file.text()
        encryptionService.importKeyPair(account, text)
        checkKeys()
        success('Imported!', 'Keys imported successfully')
      } catch (err) {
        console.error('Error importing keys:', err)
        error('Error', 'Failed to import keys. Invalid format.')
      }
    }
    input.click()
  }

  const handleDeleteKeys = () => {
    if (!confirm('Are you sure you want to delete your encryption keys? This action cannot be undone.')) {
      return
    }

    try {
      encryptionService.deleteKeyPair(account)
      setKeyPair(null)
      setHasKeys(false)
      success('Deleted!', 'Encryption keys deleted')
    } catch (err) {
      console.error('Error deleting keys:', err)
      error('Error', 'Failed to delete keys')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Key className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Encryption Keys</h2>
              <p className="text-sm text-gray-500">Manage your end-to-end encryption keys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!hasKeys ? (
            // No Keys State
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Encryption Keys</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Generate encryption keys to enable end-to-end encrypted messaging.
                Your messages will be encrypted and only readable by you and the recipient.
              </p>
              
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleGenerateKeys}
                  disabled={loading}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  <Key className="w-4 h-4 mr-2" />
                  {loading ? 'Generating...' : 'Generate Keys'}
                </Button>
                <Button
                  onClick={handleImportKeys}
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Keys
                </Button>
              </div>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg text-left">
                <h4 className="font-medium text-blue-900 mb-2">What are encryption keys?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Public key: Shared with others to receive encrypted messages</li>
                  <li>• Private key: Kept secret, used to decrypt messages</li>
                  <li>• Keys are stored locally and encrypted</li>
                  <li>• Backup your keys to avoid losing access to messages</li>
                </ul>
              </div>
            </div>
          ) : (
            // Has Keys State
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="font-medium text-green-900">Encryption Enabled</h4>
                  <p className="text-sm text-green-700">
                    Your messages are protected with end-to-end encryption
                  </p>
                </div>
              </div>

              {/* Public Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Public Key
                </label>
                <div className="relative">
                  <textarea
                    value={keyPair.publicKey}
                    readOnly
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg font-mono text-xs bg-gray-50 resize-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(keyPair.publicKey)
                      success('Copied!', 'Public key copied to clipboard')
                    }}
                    className="absolute top-2 right-2 px-3 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Share this with others to receive encrypted messages
                </p>
              </div>

              {/* Private Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Private Key
                </label>
                <div className="relative">
                  <textarea
                    value={showPrivateKey ? keyPair.privateKey : '••••••••••••••••••••••••••••••••••••'}
                    readOnly
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg font-mono text-xs bg-gray-50 resize-none"
                  />
                  <button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="absolute top-2 right-2 px-3 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50"
                  >
                    {showPrivateKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="flex items-start gap-2 mt-2 p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800">
                    <strong>Never share your private key!</strong> Anyone with your private key can read your encrypted messages.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleExportKeys}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Keys
                </Button>
                <Button
                  onClick={handleImportKeys}
                  variant="outline"
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Keys
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleGenerateKeys}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Regenerate Keys
                </Button>
                <Button
                  onClick={handleDeleteKeys}
                  variant="destructive"
                  className="flex-1"
                >
                  Delete Keys
                </Button>
              </div>

              {/* Info */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Security Tips
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Export and backup your keys regularly</li>
                  <li>• Store backups in a secure location</li>
                  <li>• Never share your private key</li>
                  <li>• Regenerating keys will make old messages unreadable</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default KeyManagementDialog
