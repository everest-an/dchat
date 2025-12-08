import { useState } from 'react'
import { Upload, Users, UserPlus, Check, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'
import { useToast } from '../contexts/ToastContext'
import { useWeb3 } from '../contexts/Web3Context'
import { useNavigate } from 'react-router-dom'

const ContactImport = () => {
  const [isUploading, setIsUploading] = useState(false)
  const [matchedContacts, setMatchedContacts] = useState([])
  const [showResults, setShowResults] = useState(false)
  const { toast } = useToast()
  const { account } = useWeb3()
  const navigate = useNavigate()

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setIsUploading(true)
    try {
      // 解析 VCF 或 CSV 文件
      const text = await file.text()
      const contacts = parseContacts(text, file.name)
      
      if (contacts.length === 0) {
        toast({
          title: "No contacts found",
          description: "Could not parse any contacts from the file.",
          variant: "destructive"
        })
        setIsUploading(false)
        return
      }

      // 发送给后端进行匹配
      const response = await fetch('/api/contacts/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ contacts })
      })

      const data = await response.json()
      if (data.success) {
        setMatchedContacts(data.matches)
        setShowResults(true)
        toast({
          title: "Contacts Processed",
          description: `Found ${data.matches.length} registered users from your contacts.`
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Import error:', error)
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const parseContacts = (text, filename) => {
    const contacts = []
    
    if (filename.endsWith('.vcf')) {
      // 简单的 VCF 解析
      const lines = text.split('\n')
      let currentContact = {}
      
      lines.forEach(line => {
        if (line.startsWith('BEGIN:VCARD')) currentContact = {}
        else if (line.startsWith('END:VCARD')) {
          if (currentContact.phone || currentContact.email) {
            contacts.push(currentContact)
          }
        }
        else if (line.startsWith('TEL')) {
          const phone = line.split(':')[1]?.trim()
          if (phone) currentContact.phone = phone.replace(/[^0-9+]/g, '')
        }
        else if (line.startsWith('EMAIL')) {
          const email = line.split(':')[1]?.trim()
          if (email) currentContact.email = email
        }
      })
    } else if (filename.endsWith('.csv')) {
      // 简单的 CSV 解析
      const lines = text.split('\n')
      const headers = lines[0].toLowerCase().split(',')
      const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile'))
      const emailIdx = headers.findIndex(h => h.includes('email'))
      
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',')
        if (cols.length < 2) continue
        
        const contact = {}
        if (phoneIdx >= 0 && cols[phoneIdx]) contact.phone = cols[phoneIdx].replace(/[^0-9+]/g, '')
        if (emailIdx >= 0 && cols[emailIdx]) contact.email = cols[emailIdx].trim()
        
        if (contact.phone || contact.email) contacts.push(contact)
      }
    }
    
    return contacts
  }

  const handleAddFriend = (user) => {
    navigate(`/chat/${user.wallet_address}`)
  }

  const handleInvite = () => {
    // 跳转到邀请页面
    // 这里假设有一个邀请路由或弹窗
    toast({
      title: "Invite Friends",
      description: "Redirecting to invite page..."
    })
    // navigate('/invite') 
  }

  if (showResults) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Found Contacts ({matchedContacts.length})
          </h2>
          <Button variant="outline" onClick={() => setShowResults(false)}>
            Import Again
          </Button>
        </div>

        {matchedContacts.length > 0 ? (
          <div className="space-y-4">
            {matchedContacts.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">
                    {user.avatar?.emoji || '👤'}
                  </div>
                  <div>
                    <h3 className="font-medium">{user.name || 'Unknown User'}</h3>
                    <p className="text-xs text-gray-500">
                      {user.phone ? 'Matched by Phone' : 'Matched by Email'}
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => handleAddFriend(user)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Chat
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No registered users found in your contacts.</p>
            <Button className="mt-4" onClick={handleInvite}>
              Invite Friends to Join
            </Button>
          </div>
        )}
        
        {matchedContacts.length > 0 && (
           <div className="mt-6 pt-4 border-t text-center">
             <p className="text-sm text-gray-500 mb-3">Don't see who you're looking for?</p>
             <Button variant="outline" onClick={handleInvite}>
               Invite More Friends
             </Button>
           </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" />
        Find Friends
      </h2>
      
      <div className="text-center py-8 border-2 border-dashed rounded-lg bg-gray-50">
        <div className="mb-4">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="font-medium text-gray-900">Upload Contacts</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
            Upload a .vcf or .csv file to find friends who are already on Dchat.
          </p>
        </div>
        
        <div className="flex justify-center">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".vcf,.csv"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <Button disabled={isUploading} as="span">
              {isUploading ? 'Processing...' : 'Select Contact File'}
            </Button>
          </label>
        </div>
        
        <p className="text-xs text-gray-400 mt-4">
          Your contacts are only used for matching and are not stored permanently.
        </p>
      </div>
    </div>
  )
}

export default ContactImport
