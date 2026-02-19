/**
 * TwoFactorVerify Component
 *
 * Shown during login when the user has 2FA enabled.
 * Accepts a TOTP code or backup code, then re-submits login.
 */
import { useState } from 'react'
import { Shield, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { Alert, AlertDescription } from '../ui/alert'

/**
 * @param {{
 *   onSubmit: (code: string) => Promise<void>,
 *   onCancel: () => void,
 *   loading?: boolean,
 * }} props
 */
const TwoFactorVerify = ({ onSubmit, onCancel, loading: externalLoading }) => {
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const isLoading = externalLoading || loading

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (code.length < 6) {
      setError('Please enter a valid code')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await onSubmit(code)
    } catch (err) {
      setError(err.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
          <p className="text-sm text-gray-500 mt-1">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={8} // allow backup codes too
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
            placeholder="000000"
            autoFocus
            disabled={isLoading}
            className="w-full px-4 py-3 text-center text-2xl tracking-[0.3em] font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
          />

          <p className="text-xs text-gray-400 text-center">
            You can also use a backup code
          </p>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || code.length < 6} className="flex-1">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Verify
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TwoFactorVerify
