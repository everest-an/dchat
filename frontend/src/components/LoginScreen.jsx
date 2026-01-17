import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Wallet, Mail, Phone, ArrowLeft, Loader2 } from 'lucide-react'
import { useWeb3 } from '../contexts/Web3Context'
import { useLanguage } from '../contexts/LanguageContext'
import DchatLogo from './DchatLogo'
import EmailPasswordLogin from './EmailPasswordLogin'


const LoginScreen = ({ onLogin }) => {
  const { t } = useLanguage()

  const [loginMethod, setLoginMethod] = useState('select')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [timer, setTimer] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const {
    account,
    isConnecting,
    error: walletError,
    isMetaMaskInstalled,
    connectWallet
  } = useWeb3()

  // Web3 Wallet Login
  const handleConnectWallet = async () => {
    try {
      setError('')
      setIsSubmitting(true)

      const walletAddress = await connectWallet()

      if (walletAddress) {
        const authToken = `web3_${walletAddress}_${Date.now()}`
        localStorage.setItem('authToken', authToken)

        const userData = {
          walletAddress: walletAddress,
          username: `User_${walletAddress.slice(2, 8)}`,
          email: `${walletAddress.slice(2, 8)}@dchat.web3`,
          loginMethod: 'web3',
          web3Enabled: true,
          createdAt: new Date().toISOString()
        }

        onLogin(userData)
      } else {
        throw new Error('Failed to connect wallet. Please try again.')
      }
    } catch (error) {
      console.error('Wallet login error:', error)
      setError(error.message || 'Failed to connect wallet')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Email Login (Simplified version - no backend required)
  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address')
      }

      const hash = email.split('').reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0)
      }, 0)
      const mockAddress = '0x' + Math.abs(hash).toString(16).padStart(40, '0').slice(0, 40)

      const userData = {
        email,
        username: email.split('@')[0],
        walletAddress: mockAddress,
        loginMethod: 'email',
        web3Enabled: false,
        createdAt: new Date().toISOString()
      }

      onLogin(userData)
    } catch (error) {
      console.error('Email login error:', error)
      setError(error.message || 'Failed to login with email')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Phone Login (Simplified version - no backend required)
  const handleSendCode = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number')
      return
    }
    setError('')
    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setIsCodeSent(true)
      setTimer(60)

      console.log('Verification Code: 123456')
      alert('Test Code: 123456')

      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, 1500)
  }

  const handlePhoneLogin = async (e) => {
    e && e.preventDefault()

    if (!isCodeSent) {
      handleSendCode()
      return
    }

    if (!verificationCode) {
      setError('Please enter verification code')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // Very simple mock verification
      if (verificationCode !== '123456') {
        throw new Error('Invalid verification code')
      }

      // Generate a deterministic wallet address from phone number
      const hash = phone.split('').reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0)
      }, 0)
      const mockAddress = '0x' + Math.abs(hash).toString(16).padStart(40, '0').slice(0, 40)

      const userData = {
        phone,
        username: `User_${phone.slice(-4)}`,
        walletAddress: mockAddress,
        loginMethod: 'phone',
        web3Enabled: false,
        createdAt: new Date().toISOString()
      }

      onLogin(userData)
    } catch (error) {
      console.error('Phone login error:', error)
      setError(error.message || 'Failed to login with phone')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetLoginFlow = () => {
    setLoginMethod('select')
    setEmail('')
    setPhone('')
    setVerificationCode('')
    setIsCodeSent(false)
    setTimer(0)
    setError('')
  }

  // Login method selection screen
  if (loginMethod === 'select') {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        {/* Left: Brand Display */}
        <div className="hidden lg:flex lg:w-1/2 bg-black items-center justify-center p-12">
          <div className="max-w-md">
            <DchatLogo size={120} className="text-white mb-8" />
            <h1 className="text-5xl font-bold text-white mb-4">Dchat</h1>
            <p className="text-xl text-gray-300">
              Decentralized Chat
            </p>
          </div>
        </div>

        {/* Right: Login Form */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-12">
            <DchatLogo size={60} className="text-black mb-4" />
            <h1 className="text-3xl font-bold text-black mb-2">Dchat</h1>
            <p className="text-gray-500 text-center">
              Secure Business Communication Platform
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="w-full max-w-sm mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Login Options */}
          <div className="w-full max-w-sm space-y-4">
            {/* MetaMask Login */}
            <Button
              onClick={() => setLoginMethod('wallet')}
              className="w-full h-14 bg-black hover:bg-gray-800 text-white rounded-full text-base font-medium flex items-center justify-center gap-3 transition-all duration-200"
            >
              <img src="/metamask-fox.svg" alt="MetaMask" className="w-6 h-6" onError={(e) => e.target.style.display = 'none'} />
              MetaMask
            </Button>

            {/* Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-50 text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Email Login */}
            <Button
              onClick={() => setLoginMethod('email')}
              variant="outline"
              className="w-full h-14 border-2 border-gray-200 hover:border-gray-300 hover:bg-white text-black rounded-full text-base font-medium flex items-center justify-center gap-3 transition-all duration-200 bg-white"
            >
              <Mail className="w-5 h-5" />
              Email
            </Button>

            {/* Phone Login */}
            <Button
              onClick={() => setLoginMethod('phone')}
              variant="outline"
              className="w-full h-14 border-2 border-gray-200 hover:border-gray-300 hover:bg-white text-black rounded-full text-base font-medium flex items-center justify-center gap-3 transition-all duration-200 bg-white"
            >
              <Phone className="w-5 h-5" />
              Phone
            </Button>
          </div>

          {/* Security Features */}
          <div className="w-full max-w-sm mt-8 space-y-3 text-sm text-gray-500">
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
              End-to-end encryption protection
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
              Quantum-resistant encryption
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
              Blockchain message storage
            </p>
          </div>

          {/* Terms */}
          <p className="w-full max-w-sm mt-8 text-xs text-center text-gray-400">
            By connecting your wallet, you agree to our{' '}
            <a href="/terms" className="text-black hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-black hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    )
  }

  // Wallet Login Screen
  if (loginMethod === 'wallet') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <button
            onClick={resetLoginFlow}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="flex flex-col items-center mb-8">
              <DchatLogo size={60} className="text-black mb-4" />
              <h2 className="text-2xl font-bold text-black mb-2">Connect Wallet</h2>
              <p className="text-gray-500 text-center">
                Connect your Web3 wallet to get started
              </p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Button
              onClick={handleConnectWallet}
              disabled={isSubmitting || isConnecting}
              className="w-full h-14 bg-black hover:bg-gray-800 text-white rounded-full text-base font-medium flex items-center justify-center gap-3 transition-all duration-200"
            >
              {(isSubmitting || isConnecting) ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5" />
                  Connect MetaMask
                </>
              )}
            </Button>

            {!isMetaMaskInstalled && (
              <p className="mt-4 text-sm text-center text-gray-500">
                Don't have MetaMask?{' '}
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black hover:underline font-medium"
                >
                  Install it here
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Email Login Screen
  if (loginMethod === 'email') {
    return (
      <EmailPasswordLogin
        onLogin={onLogin}
        onBack={resetLoginFlow}
      />
    )
  }

  // Phone Login Screen
  if (loginMethod === 'phone') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <button
            onClick={resetLoginFlow}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="flex flex-col items-center mb-8">
              <DchatLogo size={60} className="text-black mb-4" />
              <h2 className="text-2xl font-bold text-black mb-2">Phone Login</h2>
              <p className="text-gray-500 text-center">
                Enter your phone number to continue
              </p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handlePhoneLogin} className="space-y-4">
              <div className="space-y-4">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone Number (e.g. 13800138000)"
                  className="w-full h-14 px-4 border-2 border-gray-200 rounded-full focus:border-black focus:outline-none transition-colors text-base"
                  disabled={isSubmitting || isCodeSent}
                  required
                />

                {isCodeSent && (
                  <div className="relative">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Verification Code (Try: 123456)"
                      className="w-full h-14 px-4 border-2 border-gray-200 rounded-full focus:border-black focus:outline-none transition-colors text-base"
                      disabled={isSubmitting}
                      required
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                      {timer > 0 ? `${timer}s` : ''}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {isCodeSent && timer === 0 && (
                  <Button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isSubmitting}
                    variant="outline"
                    className="flex-1 h-14 rounded-full"
                  >
                    Resend
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-14 bg-black hover:bg-gray-800 text-white rounded-full text-base font-medium flex items-center justify-center gap-3 transition-all duration-200"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isCodeSent ? 'Verifying...' : 'Sending...'}
                    </>
                  ) : (
                    <>
                      <Phone className="w-5 h-5" />
                      {isCodeSent ? 'Login' : 'Get Code'}
                    </>
                  )}
                </Button>
              </div>
            </form>

            <p className="mt-6 text-xs text-center text-gray-400">
              Email, phone, and Alipay login will automatically create a secure wallet for you.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default LoginScreen
