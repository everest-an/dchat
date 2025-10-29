import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Wallet, MessageCircle, Lock, Shield, AlertCircle, Mail, Phone, ArrowLeft, Loader2 } from 'lucide-react'
import { useWeb3 } from '../contexts/Web3Context'

const LoginScreen = ({ onLogin }) => {
  const [loginMethod, setLoginMethod] = useState('select')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  const { 
    account, 
    isConnecting, 
    error: walletError, 
    isMetaMaskInstalled, 
    connectWallet 
  } = useWeb3()

  // Web3 钱包登录
  const handleConnectWallet = async () => {
    try {
      setError('')
      setIsSubmitting(true)
      
      // 连接钱包
      const success = await connectWallet()
      
      if (success && account) {
        // 生成认证令牌
        const authToken = `web3_${account}_${Date.now()}`
        localStorage.setItem('authToken', authToken)
        
        // 创建用户数据
        const userData = {
          walletAddress: account,
          username: `User_${account.slice(2, 8)}`,
          email: `${account.slice(2, 8)}@dchat.web3`,
          loginMethod: 'web3',
          web3Enabled: true,
          createdAt: new Date().toISOString()
        }
        
        // 登录成功
        onLogin(userData)
      }
    } catch (error) {
      console.error('Wallet login error:', error)
      setError(error.message || 'Failed to connect wallet')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 邮箱登录(简化版 - 无需后端)
  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    
    try {
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address')
      }

      // 生成认证令牌
      const authToken = `email_${email}_${Date.now()}`
      localStorage.setItem('authToken', authToken)
      
      // 创建用户数据
      const userData = {
        email,
        username: email.split('@')[0],
        loginMethod: 'email',
        web3Enabled: false,
        createdAt: new Date().toISOString()
      }
      
      // 登录成功
      onLogin(userData)
    } catch (error) {
      console.error('Email login error:', error)
      setError(error.message || 'Failed to login with email')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 手机登录(简化版 - 无需后端)
  const handlePhoneLogin = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    
    try {
      if (!phone || phone.length < 10) {
        throw new Error('Please enter a valid phone number')
      }

      // 生成认证令牌
      const authToken = `phone_${phone}_${Date.now()}`
      localStorage.setItem('authToken', authToken)
      
      // 创建用户数据
      const userData = {
        phone,
        username: `User_${phone.slice(-4)}`,
        loginMethod: 'phone',
        web3Enabled: false,
        createdAt: new Date().toISOString()
      }
      
      // 登录成功
      onLogin(userData)
    } catch (error) {
      console.error('Phone login error:', error)
      setError(error.message || 'Failed to login with phone')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Alipay 登录(简化版 - 无需后端)
  const handleAlipayLogin = async () => {
    setIsSubmitting(true)
    setError('')
    
    try {
      // 生成模拟 Alipay ID
      const alipayId = 'alipay_' + Math.random().toString(36).substr(2, 9)
      
      // 生成认证令牌
      const authToken = `alipay_${alipayId}_${Date.now()}`
      localStorage.setItem('authToken', authToken)
      
      // 创建用户数据
      const userData = {
        alipayId,
        username: `Alipay_${alipayId.slice(-4)}`,
        loginMethod: 'alipay',
        web3Enabled: false,
        createdAt: new Date().toISOString()
      }
      
      // 登录成功
      onLogin(userData)
    } catch (error) {
      console.error('Alipay login error:', error)
      setError(error.message || 'Failed to login with Alipay')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetLoginFlow = () => {
    setLoginMethod('select')
    setEmail('')
    setPhone('')
    setError('')
  }

  // 登录方式选择界面
  if (loginMethod === 'select') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-12">
          <div className="flex items-center justify-center w-16 h-16 mb-4">
            <div className="relative">
              <MessageCircle className="w-12 h-12 text-black" strokeWidth={1.5} />
              <Lock className="w-6 h-6 text-black absolute -bottom-1 -right-1 bg-white rounded-full p-1" strokeWidth={2} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-black mb-2">Dchat</h1>
          <p className="text-gray-500 text-center max-w-sm">
            Secure Business Communication Platform
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full max-w-sm mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Login Options */}
        <div className="w-full max-w-sm space-y-4">
          {/* Web3 Wallet Login */}
          <Button
            onClick={() => setLoginMethod('wallet')}
            className="w-full h-14 bg-black hover:bg-gray-800 text-white rounded-xl text-base font-medium flex items-center justify-center gap-3 transition-all duration-200"
          >
            <Wallet className="w-5 h-5" />
            Web3 Wallet
          </Button>

          {/* Divider */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          {/* Email Login */}
          <Button
            onClick={() => setLoginMethod('email')}
            variant="outline"
            className="w-full h-14 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-black rounded-xl text-base font-medium flex items-center justify-center gap-3 transition-all duration-200"
          >
            <Mail className="w-5 h-5" />
            Email
          </Button>

          {/* Phone Login */}
          <Button
            onClick={() => setLoginMethod('phone')}
            variant="outline"
            className="w-full h-14 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-black rounded-xl text-base font-medium flex items-center justify-center gap-3 transition-all duration-200"
          >
            <Phone className="w-5 h-5" />
            Phone
          </Button>

          {/* Alipay Login */}
          <Button
            onClick={() => setLoginMethod('alipay')}
            variant="outline"
            className="w-full h-14 border-2 border-blue-500 hover:border-blue-600 hover:bg-blue-50 text-blue-600 rounded-xl text-base font-medium flex items-center justify-center gap-3 transition-all duration-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.5 4C5.67 4 5 4.67 5 5.5v13c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5v-13c0-.83-.67-1.5-1.5-1.5h-11zm8.5 8.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
            Alipay
          </Button>

          {/* Info Text */}
          <p className="text-gray-400 text-xs text-center leading-relaxed pt-4">
            Email, phone, and Alipay login will automatically create a secure wallet for you
          </p>
        </div>

        {/* Features List */}
        <div className="w-full max-w-sm space-y-4 pt-8">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Shield className="w-4 h-4 text-gray-400" />
            <span>End-to-end encryption protection</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Lock className="w-4 h-4 text-gray-400" />
            <span>Quantum-resistant encryption</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <MessageCircle className="w-4 h-4 text-gray-400" />
            <span>Blockchain message storage</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pb-8 text-xs text-gray-400 text-center">
          <p>By connecting your wallet, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    )
  }

  // Web3 钱包登录界面
  if (loginMethod === 'wallet') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <Button
            onClick={resetLoginFlow}
            variant="ghost"
            className="mb-8 -ml-2"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>

          <div className="flex flex-col items-center mb-12">
            <div className="flex items-center justify-center w-16 h-16 mb-4">
              <Wallet className="w-12 h-12 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-black mb-2">
              Connect Wallet
            </h1>
            <p className="text-gray-500 text-center max-w-sm">
              Connect your Web3 wallet to continue
            </p>
          </div>

          {(walletError || error) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{walletError || error}</p>
                {!isMetaMaskInstalled() && (
                  <a 
                    href="https://metamask.io/download/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-red-600 underline mt-2 inline-block"
                  >
                    Install MetaMask
                  </a>
                )}
              </div>
            </div>
          )}

          <Button
            onClick={handleConnectWallet}
            disabled={isConnecting || isSubmitting}
            className="w-full h-14 bg-black hover:bg-gray-800 text-white rounded-xl text-base font-medium flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(isConnecting || isSubmitting) ? (
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

          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <h4 className="font-medium text-blue-900 mb-2">What is MetaMask?</h4>
            <p className="text-sm text-blue-800">
              MetaMask is a crypto wallet that allows you to interact with blockchain applications.
              It's free and secure.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 邮箱登录界面
  if (loginMethod === 'email') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <Button
            onClick={resetLoginFlow}
            variant="ghost"
            className="mb-8 -ml-2"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>

          <div className="flex flex-col items-center mb-12">
            <div className="flex items-center justify-center w-16 h-16 mb-4">
              <Mail className="w-12 h-12 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-black mb-2">
              Email Login
            </h1>
            <p className="text-gray-500 text-center max-w-sm">
              Enter your email to continue
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-black hover:bg-gray-800 text-white rounded-xl text-base font-medium flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-800">
              A secure wallet will be automatically created for you.
              No verification code needed for demo.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 手机登录界面
  if (loginMethod === 'phone') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <Button
            onClick={resetLoginFlow}
            variant="ghost"
            className="mb-8 -ml-2"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>

          <div className="flex flex-col items-center mb-12">
            <div className="flex items-center justify-center w-16 h-16 mb-4">
              <Phone className="w-12 h-12 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-black mb-2">
              Phone Login
            </h1>
            <p className="text-gray-500 text-center max-w-sm">
              Enter your phone number to continue
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handlePhoneLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-black hover:bg-gray-800 text-white rounded-xl text-base font-medium flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-800">
              A secure wallet will be automatically created for you.
              No verification code needed for demo.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Alipay 登录界面
  if (loginMethod === 'alipay') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <Button
            onClick={resetLoginFlow}
            variant="ghost"
            className="mb-8 -ml-2"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>

          <div className="flex flex-col items-center mb-12">
            <div className="flex items-center justify-center w-16 h-16 mb-4">
              <svg className="w-12 h-12 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.5 4C5.67 4 5 4.67 5 5.5v13c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5v-13c0-.83-.67-1.5-1.5-1.5h-11zm8.5 8.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-black mb-2">
              Alipay Login
            </h1>
            <p className="text-gray-500 text-center max-w-sm">
              Connect with Alipay to continue
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Button
            onClick={handleAlipayLogin}
            disabled={isSubmitting}
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base font-medium flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.5 4C5.67 4 5 4.67 5 5.5v13c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5v-13c0-.83-.67-1.5-1.5-1.5h-11zm8.5 8.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
                Connect with Alipay
              </>
            )}
          </Button>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-800">
              This is a demo version. In production, you'll be redirected to Alipay for authentication.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default LoginScreen
