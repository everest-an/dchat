import { useState, useEffect } from 'react'
import { Linkedin, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

const LinkedInMessages = ({ isLinkedInConnected }) => {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Mock LinkedIn messages for demo
  const mockMessages = [
    {
      id: '1',
      sender: {
        name: 'Sarah Johnson',
        headline: 'VP of Engineering at Acme Inc.',
        profileUrl: 'https://linkedin.com/in/sarahjohnson'
      },
      preview: 'Hi! I saw your profile and would love to discuss potential collaboration...',
      timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      unread: true
    },
    {
      id: '2',
      sender: {
        name: 'Mark Smith',
        headline: 'CTO at Global Insights',
        profileUrl: 'https://linkedin.com/in/marksmith'
      },
      preview: 'Thanks for connecting! Are you available for a quick call next week?',
      timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      unread: true
    },
    {
      id: '3',
      sender: {
        name: 'Lisa Wong',
        headline: 'Product Manager at Innovate Ltd.',
        profileUrl: 'https://linkedin.com/in/lisawong'
      },
      preview: 'Great presentation at the conference! Would love to learn more about your work.',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      unread: false
    }
  ]

  const loadMessages = async () => {
    if (!isLinkedInConnected) {
      setError('Please connect your LinkedIn account first')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In production, this would call the backend API
      // const response = await fetch('/api/linkedin/messages')
      // const data = await response.json()
      
      setMessages(mockMessages)
      setIsLoading(false)
    } catch (err) {
      setError('Failed to load LinkedIn messages')
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isLinkedInConnected) {
      loadMessages()
    }
  }, [isLinkedInConnected])

  const formatTimestamp = (date) => {
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes} min ago`
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  if (!isLinkedInConnected) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
        <Linkedin className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h3 className="font-medium text-blue-900 mb-2">LinkedIn Not Connected</h3>
        <p className="text-sm text-blue-700">
          Connect your LinkedIn account to view and manage your messages
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Linkedin className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">LinkedIn Messages</h3>
        </div>
        <Button
          onClick={loadMessages}
          disabled={isLoading}
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:text-gray-900"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Demo Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-yellow-800">
              <strong>Demo Mode:</strong> Showing sample messages. Full LinkedIn messaging requires LinkedIn Partner API approval.
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Messages List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer ${
                message.unread ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => window.open(message.sender.profileUrl, '_blank')}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {message.sender.name}
                    </h4>
                    {message.unread && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{message.sender.headline}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                {message.preview}
              </p>
              <p className="text-xs text-gray-500">{formatTimestamp(message.timestamp)}</p>
            </div>
          ))}
        </div>
      )}

      {/* View on LinkedIn Button */}
      <Button
        onClick={() => window.open('https://www.linkedin.com/messaging/', '_blank')}
        variant="outline"
        className="w-full"
      >
        <Linkedin className="w-4 h-4 mr-2" />
        Open LinkedIn Messages
      </Button>
    </div>
  )
}

export default LinkedInMessages

