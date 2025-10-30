import React, { useState, useEffect } from 'react'
import { Shield, Key, Download, Upload, Lock, Unlock, AlertTriangle, Check } from 'lucide-react'
import { useWeb3 } from '../contexts/Web3Context'
import { useToast } from '../contexts/ToastContext'
import { advancedEncryptionService } from '../services/AdvancedEncryptionService'
import { subscriptionService } from '../services/SubscriptionService'
import UpgradeDialog from './dialogs/UpgradeDialog'
import { useLanguage } from '../contexts/LanguageContext'


const EncryptionSettings = () => {
  const { t } = useLanguage()

  const { account } = useWeb3()
  const { success, error: showError, info } = useToast()
  
  const [encryptionEnabled, setEncryptionEnabled] = useState(false)
  const [publicKey, setPublicKey] = useState(null)
  const [showBackupDialog, setShowBackupDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [backupPassword, setBackupPassword] = useState('')
  const [restoreData, setRestoreData] = useState('')
  const [restorePassword, setRestorePassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  // TODO: Translate {t('check_subscription_status')}
  const userPlan = subscriptionService.getUserPlan(account)
  const hasAdvancedEncryption = userPlan === 'pro' || userPlan === 'enterprise'

  useEffect(() => {
    if (account) {
      checkEncryptionStatus()
    }
  }, [account])

  const checkEncryptionStatus = () => {
    const enabled = advancedEncryptionService.isEncryptionEnabled(account)
    setEncryptionEnabled(enabled)
    
    if (enabled) {
      const pubKey = advancedEncryptionService.getUserPublicKey(account)
      setPublicKey(pubKey)
    }
  }

  const handleEnableEncryption = async () => {
    // TODO: Translate {t('check_subscription')}
    if (!hasAdvancedEncryption) {
      setShowUpgradeDialog(true)
      return
    }

    setLoading(true)
    try {
      info('Generating Keys', 'Generating encryption keys...')
      
      const keys = await advancedEncryptionService.initializeUserEncryption(account)
      
      setEncryptionEnabled(true)
      setPublicKey(keys.publicKey)
      
      success('Encryption Enabled!', 'Your messages will now be encrypted end-to-end')
    } catch (err) {
      console.error('Error enabling encryption:', err)
      showError('Error', 'Failed to enable encryption')
    } finally {
      setLoading(false)
    }
  }

  const handleExportKeys = async () => {
    if (!backupPassword) {
      showError('Password Required', 'Please enter a password to encrypt your backup')
      return
    }

    if (backupPassword.length < 8) {
      showError('Weak Password', 'Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const backup = await advancedEncryptionService.exportKeys(account, backupPassword)
      
      // TODO: Translate {t('download_backup_file')}
      const blob = new Blob([backup], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dchat-keys-backup-${account.slice(0, 8)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      success('Backup Created!', 'Your encryption keys have been backed up')
      setShowBackupDialog(false)
      setBackupPassword('')
    } catch (err) {
      console.error('Error exporting keys:', err)
      showError('Error', 'Failed to create backup')
    } finally {
      setLoading(false)
    }
  }

  const handleImportKeys = async () => {
    if (!restoreData || !restorePassword) {
      showError('Missing Data', 'Please provide backup data and password')
      return
    }

    setLoading(true)
    try {
      await advancedEncryptionService.importKeys(restoreData, restorePassword)
      
      checkEncryptionStatus()
      success('Keys Restored!', 'Your encryption keys have been restored')
      setShowRestoreDialog(false)
      setRestoreData('')
      setRestorePassword('')
    } catch (err) {
      console.error('Error importing keys:', err)
      showError('Error', 'Failed to restore keys. Check your password and backup data.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setRestoreData(event.target.result)
    }
    reader.readAsText(file)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">Advanced Encryption</h2>
            <p className="text-sm text-gray-600">End-to-end encryption for your messages</p>
          </div>
        </div>

        {/* Pro Feature Badge */}
        {!hasAdvancedEncryption && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">Pro Feature</span>
            </div>
            <p className="text-sm text-blue-800 mb-3">
              Advanced encryption is available for Pro and Enterprise users
            </p>
            <button
              onClick={() => setShowUpgradeDialog(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
            >
              Upgrade to Pro
            </button>
          </div>
        )}

        {/* Encryption Status */}
        <div className="border rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {encryptionEnabled ? (
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Lock className="w-6 h-6 text-green-600" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Unlock className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div>
                <h3 className="font-semibold">
                  {encryptionEnabled ? 'Encryption Enabled' : 'Encryption Disabled'}
                </h3>
                <p className="text-sm text-gray-600">
                  {encryptionEnabled 
                    ? 'Your messages are encrypted end-to-end'
                    : 'Enable encryption to protect your messages'}
                </p>
              </div>
            </div>
            
            {!encryptionEnabled && hasAdvancedEncryption && (
              <button
                onClick={handleEnableEncryption}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Enabling...' : 'Enable'}
              </button>
            )}
          </div>

          {encryptionEnabled && (
            <div className="bg-gray-50 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Your Public Key</span>
              </div>
              <div className="text-xs font-mono bg-white p-2 rounded border break-all">
                {publicKey?.slice(0, 64)}...
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        {encryptionEnabled && (
          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-lg">Encryption Features</h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-sm">End-to-End Encryption</p>
                  <p className="text-xs text-gray-600">Messages encrypted with RSA-2048</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-sm">Perfect Forward Secrecy</p>
                  <p className="text-xs text-gray-600">Each message uses unique encryption</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-sm">Zero-Knowledge Architecture</p>
                  <p className="text-xs text-gray-600">Only you can decrypt your messages</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Management */}
        {encryptionEnabled && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Key Management</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowBackupDialog(true)}
                className="flex items-center justify-center gap-2 p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Download className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Backup Keys</span>
              </button>
              
              <button
                onClick={() => setShowRestoreDialog(true)}
                className="flex items-center justify-center gap-2 p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-colors"
              >
                <Upload className="w-5 h-5 text-green-600" />
                <span className="font-medium">Restore Keys</span>
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900 text-sm">Important</p>
                  <p className="text-xs text-yellow-800 mt-1">
                    Backup your encryption keys regularly. If you lose your keys, you won't be able to decrypt your messages.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Backup Dialog */}
      {showBackupDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Backup Encryption Keys</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Backup Password</label>
              <input
                type="password"
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                placeholder="Enter a strong password"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-600 mt-1">
                This password will be used to encrypt your backup. Don't forget it!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBackupDialog(false)
                  setBackupPassword('')
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExportKeys}
                disabled={loading || !backupPassword}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Backup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Dialog */}
      {showRestoreDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Restore Encryption Keys</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Backup File</label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Backup Password</label>
              <input
                type="password"
                value={restorePassword}
                onChange={(e) => setRestorePassword(e.target.value)}
                placeholder="Enter backup password"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRestoreDialog(false)
                  setRestoreData('')
                  setRestorePassword('')
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImportKeys}
                disabled={loading || !restoreData || !restorePassword}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Restoring...' : 'Restore Keys'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Dialog */}
      <UpgradeDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        title="Upgrade to Pro for Advanced Encryption"
        description="Protect your messages with military-grade end-to-end encryption. Available on Pro and Enterprise plans."
      />
    </div>
  )
}

export default EncryptionSettings
