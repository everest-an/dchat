import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Linkedin, CheckCircle2, AlertCircle } from 'lucide-react'

const LinkedInConnect = ({ onConnect, isConnected }) => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)

  // LinkedIn OAuth configuration
  const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID || 'demo_client_id'
  const REDIRECT_URI = import.meta.env.VITE_LINKEDIN_REDIRECT_URI || window.location.origin + '/linkedin/callback'
  const LINKEDIN_SCOPE = 'openid profile email'

  const handleLinkedInConnect = () => {
    setIsConnecting(true)
    setError(null)

    // For demo purposes, simulate LinkedIn connection
    // In production, this would redirect to LinkedIn OAuth
    if (LINKEDIN_CLIENT_ID === 'demo_client_id') {
      // Demo mode - simulate connection
      setTimeout(() => {
        const mockLinkedInData = {
          id: 'linkedin_demo_user',
          name: 'Alex Chen',
          email: 'alex.chen@example.com',
          headline: 'Senior Product Manager at Tech Innovations Inc.',
          profileUrl: 'https://linkedin.com/in/alexchen',
          pictureUrl: null
        }
        onConnect(mockLinkedInData)
        setIsConnecting(false)
      }, 1500)
    } else {
      // Real LinkedIn OAuth flow
      const state = Math.random().toString(36).substring(7)
      localStorage.setItem('linkedin_oauth_state', state)

      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code&` +
        `client_id=${LINKEDIN_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `state=${state}&` +
        `scope=${encodeURIComponent(LINKEDIN_SCOPE)}`

      window.location.href = authUrl
    }
  }

  const handleDisconnect = () => {
    onConnect(null)
  }

  if (isConnected) {
    return (
      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-900">LinkedIn Connected</p>
            <p className="text-xs text-blue-700">{isConnected.headline || 'Professional Account'}</p>
          </div>
        </div>
        <Button
          onClick={handleDisconnect}
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
        >
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      <Button
        onClick={handleLinkedInConnect}
        disabled={isConnecting}
        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200"
      >
        {isConnecting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Connecting to LinkedIn...
          </>
        ) : (
          <>
            <Linkedin className="w-4 h-4" />
            Connect LinkedIn Account
          </>
        )}
      </Button>
      
      <p className="text-xs text-gray-500 text-center">
        Connect your LinkedIn account to sync your professional profile
      </p>
    </div>
  )
}

export default LinkedInConnect

