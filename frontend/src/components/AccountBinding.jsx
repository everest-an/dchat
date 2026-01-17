import { useState } from 'react'
import { Button } from './ui/button'
import { useWeb3 } from '../contexts/Web3Context'
import { useToast } from '../contexts/ToastContext'
import { Mail, Phone, Check, Loader2 } from 'lucide-react'

const AccountBinding = () => {
  const { account } = useWeb3()
  const { success, error: showError } = useToast()
  
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  
  const [step, setStep] = useState({ email: 'input', phone: 'input' }) // input, verify, bound
  const [loading, setLoading] = useState({ email: false, phone: false })

  const handleSendCode = async (type) => {
    const identifier = type === 'email' ? email : phone
    if (!identifier) return
    
    setLoading(prev => ({ ...prev, [type]: true }))
    
    try {
      const endpoint = type === 'email' ? '/api/account/send-email-code' : '/api/account/send-sms-code'
      const payload = type === 'email' ? { email } : { phone }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (response.ok) {
        setStep(prev => ({ ...prev, [type]: 'verify' }))
        success('Code Sent', `Verification code sent to ${identifier}`)
      } else {
        throw new Error('Failed to send code')
      }
    } catch (err) {
      showError('Error', err.message)
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }))
    }
  }

  const handleVerify = async (type) => {
    const identifier = type === 'email' ? email : phone
    const code = type === 'email' ? emailCode : phoneCode
    
    if (!code) return
    
    setLoading(prev => ({ ...prev, [type]: true }))
    
    try {
      const response = await fetch('/api/account/bind-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: account,
          identifier,
          code,
          type
        })
      })
      
      if (response.ok) {
        setStep(prev => ({ ...prev, [type]: 'bound' }))
        success('Success', `${type === 'email' ? 'Email' : 'Phone'} bound successfully`)
      } else {
        throw new Error('Invalid code')
      }
    } catch (err) {
      showError('Error', err.message)
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }))
    }
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border">
      <h2 className="text-xl font-bold mb-6">Account Binding</h2>
      
      {/* Email Binding */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold">Email Address</h3>
          {step.email === 'bound' && <span className="text-green-500 text-sm flex items-center"><Check className="w-4 h-4 mr-1"/> Verified</span>}
        </div>
        
        {step.email === 'input' && (
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <Button 
              onClick={() => handleSendCode('email')}
              disabled={loading.email || !email}
            >
              {loading.email ? <Loader2 className="animate-spin" /> : 'Send Code'}
            </Button>
          </div>
        )}
        
        {step.email === 'verify' && (
          <div className="flex gap-2">
            <input
              type="text"
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <Button 
              onClick={() => handleVerify('email')}
              disabled={loading.email || !emailCode}
            >
              {loading.email ? <Loader2 className="animate-spin" /> : 'Verify'}
            </Button>
          </div>
        )}
        
        {step.email === 'bound' && (
          <div className="p-3 bg-gray-50 rounded-lg text-gray-600">
            {email}
          </div>
        )}
      </div>

      {/* Phone Binding */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold">Phone Number</h3>
          {step.phone === 'bound' && <span className="text-green-500 text-sm flex items-center"><Check className="w-4 h-4 mr-1"/> Verified</span>}
        </div>
        
        {step.phone === 'input' && (
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <Button 
              onClick={() => handleSendCode('phone')}
              disabled={loading.phone || !phone}
            >
              {loading.phone ? <Loader2 className="animate-spin" /> : 'Send Code'}
            </Button>
          </div>
        )}
        
        {step.phone === 'verify' && (
          <div className="flex gap-2">
            <input
              type="text"
              value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <Button 
              onClick={() => handleVerify('phone')}
              disabled={loading.phone || !phoneCode}
            >
              {loading.phone ? <Loader2 className="animate-spin" /> : 'Verify'}
            </Button>
          </div>
        )}
        
        {step.phone === 'bound' && (
          <div className="p-3 bg-gray-50 rounded-lg text-gray-600">
            {phone}
          </div>
        )}
      </div>
    </div>
  )
}

export default AccountBinding
