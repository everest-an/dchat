import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Linkedin, CheckCircle2, AlertCircle, Download, User } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'https://backend-op1c06n9l-everest-ans-projects.vercel.app';

const LinkedInConnect = ({ onConnect, isConnected, onProfileImport }) => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState(null)
  const [showImportOptions, setShowImportOptions] = useState(false)
  const [importFields, setImportFields] = useState({
    name: true,
    headline: true,
    company: true,
    position: true
  })

  // LinkedIn OAuth configuration
  const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID
  const REDIRECT_URI = import.meta.env.VITE_LINKEDIN_REDIRECT_URI || window.location.origin + '/linkedin/callback'
  const LINKEDIN_SCOPE = 'openid profile email'

  const handleLinkedInConnect = () => {
    setIsConnecting(true)
    setError(null)

    if (!LINKEDIN_CLIENT_ID) {
      // Demo mode - simulate connection
      setTimeout(() => {
        const demoProfile = {
          id: 'demo_linkedin_123',
          name: 'Demo User',
          headline: 'Software Engineer at Tech Company',
          company: 'Tech Company',
          position: 'Software Engineer',
          email: 'demo@example.com',
          picture: null
        }
        onConnect(demoProfile)
        setIsConnecting(false)
      }, 1500)
      return
    }

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

  const handleDisconnect = () => {
    onConnect(null)
    setShowImportOptions(false)
  }

  const handleImportToProfile = async () => {
    if (!isConnected) return
    
    setIsImporting(true)
    setError(null)

    try {
      const selectedFields = Object.entries(importFields)
        .filter(([_, selected]) => selected)
        .map(([field]) => field)

      const token = localStorage.getItem('authToken')
      
      const response = await fetch(`${API_BASE}/api/linkedin/sync-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          import_fields: selectedFields,
          linkedin_data: isConnected
        })
      })

      if (!response.ok) {
        throw new Error('Failed to sync profile')
      }

      const result = await response.json()
      
      // Notify parent component
      if (onProfileImport) {
        onProfileImport(result.data)
      }

      setShowImportOptions(false)
      alert('Profile imported successfully!')
    } catch (err) {
      console.error('Import error:', err)
      // Demo mode fallback
      if (onProfileImport) {
        onProfileImport({
          company_name: isConnected.company || '',
          job_title: isConnected.position || isConnected.headline || ''
        })
      }
      setShowImportOptions(false)
      alert('Profile imported (demo mode)')
    } finally {
      setIsImporting(false)
    }
  }

  const toggleField = (field) => {
    setImportFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  if (isConnected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">LinkedIn Connected</p>
              <p className="text-xs text-blue-700">{isConnected.headline || isConnected.name || 'Professional Account'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowImportOptions(!showImportOptions)}
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
            >
              <Download className="w-4 h-4 mr-1" />
              Import
            </Button>
            <Button
              onClick={handleDisconnect}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              Disconnect
            </Button>
          </div>
        </div>

        {/* Import Options Panel */}
        {showImportOptions && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
            <p className="text-sm font-medium text-gray-700">Select fields to import:</p>
            
            <div className="space-y-2">
              {[
                { key: 'name', label: 'Name', value: isConnected.name },
                { key: 'headline', label: 'Headline', value: isConnected.headline },
                { key: 'company', label: 'Company', value: isConnected.company },
                { key: 'position', label: 'Position', value: isConnected.position }
              ].map(({ key, label, value }) => (
                <label key={key} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={importFields[key]}
                    onChange={() => toggleField(key)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    {value && (
                      <p className="text-xs text-gray-500 truncate">{value}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <Button
              onClick={handleImportToProfile}
              disabled={isImporting || !Object.values(importFields).some(v => v)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <User className="w-4 h-4 mr-2" />
                  Import to Business Profile
                </>
              )}
            </Button>
          </div>
        )}
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

