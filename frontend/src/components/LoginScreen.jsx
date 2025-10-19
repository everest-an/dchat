import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Wallet, MessageCircle, Lock, Shield, AlertCircle, Mail, Phone, ArrowLeft } from 'lucide-react'
import { useMetaMask } from '@/hooks/useMetaMask'
import { useLanguage } from '../contexts/LanguageContext'

const LoginScreen = ({ onLogin }) => {
  const { t } = useLanguage()
  const [loginMethod, setLoginMethod] = useState('select') // 'select', 'wallet', 'email', 'phone', 'alipay'
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState(1) // For multi-step flows
  
  const { 
    account, 
    isConnecting, 
    error: walletError, 
    isMetaMaskInstalled, 
    connect 
  } = useMetaMask()

  const handleConnectWallet = async () => {
    const walletAddress = await connect()
    
    if (walletAddress) {
      const mockUser = {
        walletAddress: walletAddress,
        loginMethod: 'wallet',
        name: 'User',
        company: 'Web3 Company',
        position: 'Blockchain Enthusiast'
      }
      onLogin(mockUser)
    }
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // TODO: Call backend API to send verification code
      // For now, simulate the process
      if (step === 1) {
        // Send verification code
        await new Promise(resolve => setTimeout(resolve, 1000))
        setStep(2)
      } else {
        // Verify code and create/login user
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Generate a custodial wallet for the user
        const custodialWallet = '0x' + Math.random().toString(16).substr(2, 40)
        
        const mockUser = {
          email: email,
          walletAddress: custodialWallet,
          loginMethod: 'email',
          isCustodial: true,
          name: email.split('@')[0],
          company: 'New User',
          position: 'Professional'
        }
        onLogin(mockUser)
      }
    } catch (error) {
      console.error('Email login error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhoneLogin = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      if (step === 1) {
        // Send SMS verification code
        await new Promise(resolve => setTimeout(resolve, 1000))
        setStep(2)
      } else {
        // Verify code and create/login user
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const custodialWallet = '0x' + Math.random().toString(16).substr(2, 40)
        
        const mockUser = {
          phone: phone,
          walletAddress: custodialWallet,
          loginMethod: 'phone',
          isCustodial: true,
          name: 'User',
          company: 'New User',
          position: 'Professional'
        }
        onLogin(mockUser)
      }
    } catch (error) {
      console.error('Phone login error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAlipayLogin = async () => {
    setIsSubmitting(true)
    
    try {
      // TODO: Integrate Alipay OAuth
      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const custodialWallet = '0x' + Math.random().toString(16).substr(2, 40)
      
      const mockUser = {
        alipayId: 'alipay_' + Math.random().toString(36).substr(2, 9),
        walletAddress: custodialWallet,
        loginMethod: 'alipay',
        isCustodial: true,
        name: 'Alipay User',
        company: 'New User',
        position: 'Professional'
      }
      onLogin(mockUser)
    } catch (error) {
      console.error('Alipay login error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetLoginFlow = () => {
    setLoginMethod('select')
    setStep(1)
    setEmail('')
    setPhone('')
    setVerificationCode('')
  }

  // Auto-login if wallet already connected
  useEffect(() => {
    if (account && !isConnecting && loginMethod === 'select') {
      const mockUser = {
        walletAddress: account,
        loginMethod: 'wallet',
        name: 'User',
        company: 'Web3 Company',
        position: 'Blockchain Enthusiast'
      }
      onLogin(mockUser)
    }
  }, [account, isConnecting, loginMethod])

  // Login Method Selection Screen
  if (loginMethod === 'select') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        {/* Logo Area */}
        <div className="flex flex-col items-center mb-12">
          <div className="flex items-center justify-center w-16 h-16 mb-4">
            <div className="relative">
              <MessageCircle className="w-12 h-12 text-black" strokeWidth={1.5} />
              <Lock className="w-6 h-6 text-black absolute -bottom-1 -right-1 bg-white rounded-full p-1" strokeWidth={2} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-black mb-2">{t('login.title')}</h1>
          <p className="text-gray-500 text-center max-w-sm">
            {t('login.subtitle')}
          </p>
        </div>

        {/* Login Options */}
        <div className="w-full max-w-sm space-y-4">
          {/* Web3 Wallet Login */}
          <Button
            onClick={() => setLoginMethod('wallet')}
            className="w-full h-14 bg-black hover:bg-gray-800 text-white rounded-xl text-base font-medium flex items-center justify-center gap-3 transition-all duration-200"
          >
            <Wallet className="w-5 h-5" />
            {t('login.connectWallet')}
          </Button>

          {/* Divider */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">
                {t('login.orContinueWith') || 'Or continue with'}
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
            {t('login.emailLogin') || 'Email'}
          </Button>

          {/* Phone Login */}
          <Button
            onClick={() => setLoginMethod('phone')}
            variant="outline"
            className="w-full h-14 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-black rounded-xl text-base font-medium flex items-center justify-center gap-3 transition-all duration-200"
          >
            <Phone className="w-5 h-5" />
            {t('login.phoneLogin') || 'Phone'}
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
            {t('login.alipayLogin') || 'Alipay'}
          </Button>

          {/* Info Text */}
          <p className="text-gray-400 text-xs text-center leading-relaxed pt-4">
            {t('login.autoWalletInfo') || 'Email, phone, and Alipay login will automatically create a secure wallet for you'}
          </p>
        </div>

        {/* Features List */}
        <div className="w-full max-w-sm space-y-4 pt-8">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Shield className="w-4 h-4 text-gray-400" />
            <span>{t('login.features.encryption')}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Lock className="w-4 h-4 text-gray-400" />
            <span>{t('login.features.quantum')}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <MessageCircle className="w-4 h-4 text-gray-400" />
            <span>{t('login.features.blockchain')}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pb-8 text-xs text-gray-400 text-center">
          <p>{t('login.terms')}</p>
        </div>
      </div>
    )
  }

  // Web3 Wallet Login Screen
  if (loginMethod === 'wallet') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Back Button */}
          <Button
            onClick={resetLoginFlow}
            variant="ghost"
            className="mb-8 -ml-2"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('common.back') || 'Back'}
          </Button>

          {/* Logo */}
          <div className="flex flex-col items-center mb-12">
            <div className="flex items-center justify-center w-16 h-16 mb-4">
              <Wallet className="w-12 h-12 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-black mb-2">
              {t('login.connectWallet')}
            </h1>
            <p className="text-gray-500 text-center max-w-sm">
              {t('login.walletDescription') || 'Connect your Web3 wallet to continue'}
            </p>
          </div>

          {/* Error Message */}
          {walletError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{walletError}</p>
                {!isMetaMaskInstalled && (
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

          {/* Connect Button */}
          <Button
            onClick={handleConnectWallet}
            disabled={isConnecting}
            className="w-full h-14 bg-black hover:bg-gray-800 text-white rounded-xl text-base font-medium flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                {t('login.connectMetaMask') || 'Connect MetaMask'}
              </>
            )}
          </Button>

          <p className="text-gray-400 text-sm text-center mt-6">
            {t('login.description')}
          </p>
        </div>
      </div>
    )
  }

  // Email Login Screen
  if (loginMethod === 'email') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Back Button */}
          <Button
            onClick={resetLoginFlow}
            variant="ghost"
            className="mb-8 -ml-2"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('common.back') || 'Back'}
          </Button>

          {/* Logo */}
          <div className="flex flex-col items-center mb-12">
            <div className="flex items-center justify-center w-16 h-16 mb-4">
              <Mail className="w-12 h-12 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-black mb-2">
              {t('login.emailLogin') || 'Email Login'}
            </h1>
            <p className="text-gray-500 text-center max-w-sm">
              {step === 1 
                ? (t('login.emailDescription') || 'Enter your email to receive a verification code')
                : (t('login.enterCode') || 'Enter the verification code sent to your email')
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {step === 1 ? (
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('login.emailPlaceholder') || 'your@email.com'}
                  required
                  className="w-full h-14 px-4 border-2 border-gray-200 rounded-xl text-base focus:border-black focus:outline-none transition-colors"
                />
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder={t('login.codePlaceholder') || '6-digit code'}
                  required
                  maxLength={6}
                  className="w-full h-14 px-4 border-2 border-gray-200 rounded-xl text-base text-center text-2xl tracking-widest focus:border-black focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-500 underline mt-2"
                >
                  {t('login.changeEmail') || 'Change email'}
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || (step === 1 && !email) || (step === 2 && verificationCode.length !== 6)}
              className="w-full h-14 bg-black hover:bg-gray-800 text-white rounded-xl text-base font-medium flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                step === 1 ? (t('login.sendCode') || 'Send Code') : (t('login.verify') || 'Verify & Login')
              )}
            </Button>
          </form>

          <p className="text-gray-400 text-xs text-center mt-6">
            {t('login.autoWalletCreate') || 'A secure wallet will be automatically created for you'}
          </p>
        </div>
      </div>
    )
  }

  // Phone Login Screen
  if (loginMethod === 'phone') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Back Button */}
          <Button
            onClick={resetLoginFlow}
            variant="ghost"
            className="mb-8 -ml-2"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('common.back') || 'Back'}
          </Button>

          {/* Logo */}
          <div className="flex flex-col items-center mb-12">
            <div className="flex items-center justify-center w-16 h-16 mb-4">
              <Phone className="w-12 h-12 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-black mb-2">
              {t('login.phoneLogin') || 'Phone Login'}
            </h1>
            <p className="text-gray-500 text-center max-w-sm">
              {step === 1 
                ? (t('login.phoneDescription') || 'Enter your phone number to receive a verification code')
                : (t('login.enterCode') || 'Enter the verification code sent to your phone')
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handlePhoneLogin} className="space-y-4">
            {step === 1 ? (
              <div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('login.phonePlaceholder') || '+86 138 0000 0000'}
                  required
                  className="w-full h-14 px-4 border-2 border-gray-200 rounded-xl text-base focus:border-black focus:outline-none transition-colors"
                />
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder={t('login.codePlaceholder') || '6-digit code'}
                  required
                  maxLength={6}
                  className="w-full h-14 px-4 border-2 border-gray-200 rounded-xl text-base text-center text-2xl tracking-widest focus:border-black focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-500 underline mt-2"
                >
                  {t('login.changePhone') || 'Change phone number'}
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || (step === 1 && !phone) || (step === 2 && verificationCode.length !== 6)}
              className="w-full h-14 bg-black hover:bg-gray-800 text-white rounded-xl text-base font-medium flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                step === 1 ? (t('login.sendCode') || 'Send Code') : (t('login.verify') || 'Verify & Login')
              )}
            </Button>
          </form>

          <p className="text-gray-400 text-xs text-center mt-6">
            {t('login.autoWalletCreate') || 'A secure wallet will be automatically created for you'}
          </p>
        </div>
      </div>
    )
  }

  // Alipay Login Screen
  if (loginMethod === 'alipay') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Back Button */}
          <Button
            onClick={resetLoginFlow}
            variant="ghost"
            className="mb-8 -ml-2"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('common.back') || 'Back'}
          </Button>

          {/* Logo */}
          <div className="flex flex-col items-center mb-12">
            <div className="flex items-center justify-center w-16 h-16 mb-4">
              <svg className="w-12 h-12 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.5 4C5.67 4 5 4.67 5 5.5v13c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5v-13c0-.83-.67-1.5-1.5-1.5h-11zm8.5 8.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-black mb-2">
              {t('login.alipayLogin') || 'Alipay Login'}
            </h1>
            <p className="text-gray-500 text-center max-w-sm">
              {t('login.alipayDescription') || 'Continue with your Alipay account'}
            </p>
          </div>

          {/* Connect Button */}
          <Button
            onClick={handleAlipayLogin}
            disabled={isSubmitting}
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base font-medium flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.5 4C5.67 4 5 4.67 5 5.5v13c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5v-13c0-.83-.67-1.5-1.5-1.5h-11zm8.5 8.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
                {t('login.continueWithAlipay') || 'Continue with Alipay'}
              </>
            )}
          </Button>

          <p className="text-gray-400 text-xs text-center mt-6">
            {t('login.autoWalletCreate') || 'A secure wallet will be automatically created for you'}
          </p>
        </div>
      </div>
    )
  }

  return null
}

export default LoginScreen

