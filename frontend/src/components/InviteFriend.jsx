import { useState } from 'react'
import { Button } from './ui/button'
import { useWeb3 } from '../contexts/Web3Context'
import { useToast } from '../contexts/ToastContext'
import { Share2, Mail, MessageSquare, Loader2 } from 'lucide-react'

const InviteFriend = () => {
  const { account } = useWeb3()
  const { success, error: showError } = useToast()
  
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('email') // email or phone

  const handleInvite = async () => {
    if (!identifier) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/account/invite-friend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviter_address: account,
          invitee_identifier: identifier,
          type
        })
      })
      
      if (response.ok) {
        success('Invited!', `Invitation sent to ${identifier}`)
        setIdentifier('')
      } else {
        throw new Error('Failed to send invitation')
      }
    } catch (err) {
      showError('Error', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white rounded-full shadow-sm">
          <Share2 className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Invite Friends</h2>
          <p className="text-sm text-gray-500">Grow your network securely</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setType('email')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            type === 'email' 
              ? 'bg-white text-purple-600 shadow-sm' 
              : 'text-gray-500 hover:bg-white/50'
          }`}
        >
          <Mail className="w-4 h-4 inline mr-2" />
          Email
        </button>
        <button
          onClick={() => setType('phone')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            type === 'phone' 
              ? 'bg-white text-purple-600 shadow-sm' 
              : 'text-gray-500 hover:bg-white/50'
          }`}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          SMS
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type={type === 'email' ? 'email' : 'tel'}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={type === 'email' ? "friend@example.com" : "+1234567890"}
          className="flex-1 px-4 py-2 border border-purple-100 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-300 outline-none"
        />
        <Button 
          onClick={handleInvite}
          disabled={loading || !identifier}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Invite'}
        </Button>
      </div>
    </div>
  )
}

export default InviteFriend
