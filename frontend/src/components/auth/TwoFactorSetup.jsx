/**
 * TwoFactorSetup Component
 *
 * Guides the user through enabling TOTP-based 2FA:
 * 1. Request a secret from the backend
 * 2. Display QR code for scanning with authenticator app
 * 3. Verify a code to confirm setup
 * 4. Show backup codes (one-time display)
 */
import { useState, useCallback } from 'react'
import { Shield, ShieldCheck, Copy, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Alert, AlertDescription } from '../ui/alert'
import api from '../../services/apiClient'

const TwoFactorSetup = ({ enabled, onStatusChange }) => {
  const [step, setStep] = useState('idle') // idle | setup | verify | backup | disabling
  const [secret, setSecret] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [code, setCode] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [disableCode, setDisableCode] = useState('')

  const startSetup = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/auth/2fa/setup')
      const data = res.data || res
      setSecret(data.secret)
      setQrUrl(data.qr_code_url)
      setStep('setup')
    } catch (err) {
      setError(err.message || 'Failed to start 2FA setup')
    } finally {
      setLoading(false)
    }
  }, [])

  const verifyCode = useCallback(async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/auth/2fa/verify', { code })
      const data = res.data || res
      setBackupCodes(data.backup_codes || [])
      setStep('backup')
      onStatusChange?.(true)
    } catch (err) {
      setError(err.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }, [code, onStatusChange])

  const disable2FA = useCallback(async () => {
    if (disableCode.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.post('/api/auth/2fa/disable', { code: disableCode })
      setStep('idle')
      setDisableCode('')
      onStatusChange?.(false)
    } catch (err) {
      setError(err.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }, [disableCode, onStatusChange])

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
  }

  // Enabled state — show option to disable
  if (enabled && step !== 'disabling') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
          <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Two-Factor Authentication is enabled</p>
            <p className="text-xs text-green-600">Your account is protected with TOTP verification</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setStep('disabling'); setError(null) }}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          Disable 2FA
        </Button>
      </div>
    )
  }

  // Disable flow
  if (step === 'disabling') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-700">Enter your current authenticator code to disable 2FA:</p>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={disableCode}
          onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setStep('idle'); setError(null) }} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={disable2FA} disabled={loading || disableCode.length !== 6}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Disable 2FA
          </Button>
        </div>
      </div>
    )
  }

  // Idle — show enable button
  if (step === 'idle') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
          <Shield className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">Two-Factor Authentication</p>
            <p className="text-xs text-gray-500">Add an extra layer of security using an authenticator app</p>
          </div>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button onClick={startSetup} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
          Enable 2FA
        </Button>
      </div>
    )
  }

  // Setup — show QR code and secret
  if (step === 'setup') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
        </p>

        {/* QR Code — rendered using a data URL via an img pointing to a QR API */}
        <div className="flex justify-center p-4 bg-white rounded-lg border">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
            alt="2FA QR Code"
            className="w-48 h-48"
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-gray-500">Or enter this secret manually:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono break-all">
              {secret}
            </code>
            <Button variant="ghost" size="icon" onClick={copySecret} title="Copy secret">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Enter verification code:</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep('idle')}>Cancel</Button>
          <Button onClick={verifyCode} disabled={loading || code.length !== 6}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Verify & Enable
          </Button>
        </div>
      </div>
    )
  }

  // Backup codes — shown once after successful setup
  if (step === 'backup') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="w-5 h-5" />
          <p className="text-sm font-medium">2FA enabled successfully!</p>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-800 mb-2">Save your backup codes</p>
          <p className="text-xs text-amber-700 mb-3">
            These codes can be used to access your account if you lose your authenticator.
            Each code can only be used once. Store them somewhere safe.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {backupCodes.map((bc, i) => (
              <code key={i} className="px-3 py-1.5 bg-white rounded text-sm font-mono text-center border">
                {bc}
              </code>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={copyBackupCodes} className="w-full">
            <Copy className="w-4 h-4 mr-2" /> Copy All Codes
          </Button>
        </div>

        <Button onClick={() => setStep('idle')}>Done</Button>
      </div>
    )
  }

  return null
}

export default TwoFactorSetup
