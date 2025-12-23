import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

export const useMetaMask = () => {
  const [account, setAccount] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [provider, setProvider] = useState(null)

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'
  }

  // Connect to MetaMask
  const connect = async () => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed. Please install MetaMask to continue.')
      return null
    }

    setIsConnecting(true)
    setError(null)

    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })

      if (accounts.length > 0) {
        const userAccount = accounts[0]
        setAccount(userAccount)

        // Create provider
        const web3Provider = new ethers.BrowserProvider(window.ethereum)
        setProvider(web3Provider)

        setIsConnecting(false)
        return userAccount
      }
    } catch (err) {
      console.error('Error connecting to MetaMask:', err)
      setError(err.message || 'Failed to connect to MetaMask')
      setIsConnecting(false)
      return null
    }
  }

  // Disconnect
  const disconnect = () => {
    setAccount(null)
    setProvider(null)
    setError(null)
  }

  // Sign a message for authentication
  const signMessage = async (message) => {
    if (!provider || !account) {
      throw new Error('Not connected to MetaMask')
    }

    try {
      const signer = await provider.getSigner()
      const signature = await signer.signMessage(message)
      return signature
    } catch (err) {
      console.error('Error signing message:', err)
      throw err
    }
  }

  // Listen for account changes
  useEffect(() => {
    if (!isMetaMaskInstalled()) return

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        // User disconnected their wallet
        disconnect()
      } else if (accounts[0] !== account) {
        // User switched accounts
        setAccount(accounts[0])
      }
    }

    const handleChainChanged = () => {
      // Reload the page when chain changes
      window.location.reload()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    // Check if already connected
    window.ethereum.request({ method: 'eth_accounts' })
      .then(accounts => {
        if (accounts.length > 0) {
          setAccount(accounts[0])
          const web3Provider = new ethers.BrowserProvider(window.ethereum)
          setProvider(web3Provider)
        }
      })
      .catch(err => console.error('Error checking accounts:', err))

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [])

  return {
    account,
    isConnecting,
    error,
    provider,
    isMetaMaskInstalled: isMetaMaskInstalled(),
    connect,
    disconnect,
    signMessage
  }
}

