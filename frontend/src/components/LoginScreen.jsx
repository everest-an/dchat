import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Wallet, MessageCircle, Lock, Shield, AlertCircle } from 'lucide-react'
import { useMetaMask } from '@/hooks/useMetaMask'

const LoginScreen = ({ onLogin }) => {
  const { 
    account, 
    isConnecting, 
    error, 
    isMetaMaskInstalled, 
    connect 
  } = useMetaMask()

  const handleConnectWallet = async () => {
    const walletAddress = await connect()
    
    if (walletAddress) {
      // Create user object with wallet address
      const mockUser = {
        walletAddress: walletAddress,
        name: 'User',
        company: 'Web3 Company',
        position: 'Blockchain Enthusiast'
      }
      onLogin(mockUser)
    }
  }

  // Auto-login if already connected
  useEffect(() => {
    if (account && !isConnecting) {
      const mockUser = {
        walletAddress: account,
        name: 'User',
        company: 'Web3 Company',
        position: 'Blockchain Enthusiast'
      }
      onLogin(mockUser)
    }
  }, [account, isConnecting])

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
        <h1 className="text-3xl font-bold text-black mb-2">Dchat</h1>
        <p className="text-gray-500 text-center max-w-sm">
          Secure Business Communication Platform
        </p>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-sm space-y-8">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
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

        {/* Connect Wallet Button */}
        <Button
          onClick={handleConnectWallet}
          disabled={isConnecting || !isMetaMaskInstalled}
          className="w-full h-14 bg-black hover:bg-gray-800 text-white rounded-xl text-base font-medium flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Connecting...
            </>
          ) : !isMetaMaskInstalled ? (
            <>
              <Wallet className="w-5 h-5" />
              Install MetaMask
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </>
          )}
        </Button>

        {/* Description Text */}
        <p className="text-gray-400 text-sm text-center leading-relaxed">
          Blockchain-based end-to-end encrypted business communication
        </p>

        {/* Features List */}
        <div className="space-y-4 pt-8">
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
      </div>

      {/* Footer Information */}
      <div className="mt-auto pb-8 text-xs text-gray-400 text-center">
        <p>By connecting your wallet, you agree to our Terms of Service and Privacy Policy</p>
      </div>
    </div>
  )
}

export default LoginScreen

