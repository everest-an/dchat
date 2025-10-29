import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { NETWORKS, DEFAULT_NETWORK, RPC_URLS } from '../config/web3'

const Web3Context = createContext()

export const useWeb3 = () => {
  const context = useContext(Web3Context)
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider')
  }
  return context
}

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [balance, setBalance] = useState('0')

  // 检查是否安装了 MetaMask
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'
  }

  // 获取余额
  const getBalance = useCallback(async (address) => {
    if (!provider || !address) return '0'
    try {
      const balance = await provider.getBalance(address)
      return ethers.formatEther(balance)
    } catch (err) {
      console.error('Error getting balance:', err)
      return '0'
    }
  }, [provider])

  // 连接钱包
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      setError('请安装 MetaMask 钱包')
      return false
    }

    setIsConnecting(true)
    setError(null)

    try {
      // 请求账户访问
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length === 0) {
        throw new Error('未找到账户')
      }

      // 创建 provider 和 signer
      const web3Provider = new ethers.BrowserProvider(window.ethereum)
      const web3Signer = await web3Provider.getSigner()
      const network = await web3Provider.getNetwork()

      setAccount(accounts[0])
      setProvider(web3Provider)
      setSigner(web3Signer)
      setChainId(network.chainId.toString())

      // 获取余额
      const userBalance = await getBalance(accounts[0])
      setBalance(userBalance)

      // 保存到 localStorage
      localStorage.setItem('walletConnected', 'true')
      localStorage.setItem('walletAddress', accounts[0])

      return true
    } catch (err) {
      console.error('连接钱包失败:', err)
      setError(err.message || '连接钱包失败')
      return false
    } finally {
      setIsConnecting(false)
    }
  }

  // 断开钱包
  const disconnectWallet = () => {
    setAccount(null)
    setProvider(null)
    setSigner(null)
    setChainId(null)
    setBalance('0')
    localStorage.removeItem('walletConnected')
    localStorage.removeItem('walletAddress')
  }

  // 切换网络
  const switchNetwork = async (networkName = DEFAULT_NETWORK) => {
    if (!isMetaMaskInstalled()) {
      setError('请安装 MetaMask 钱包')
      return false
    }

    const network = NETWORKS[networkName]
    if (!network) {
      setError('不支持的网络')
      return false
    }

    try {
      // 尝试切换网络
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainId }]
      })
      return true
    } catch (switchError) {
      // 如果网络不存在,尝试添加
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [network]
          })
          return true
        } catch (addError) {
          console.error('添加网络失败:', addError)
          setError('添加网络失败')
          return false
        }
      }
      console.error('切换网络失败:', switchError)
      setError('切换网络失败')
      return false
    }
  }

  // 监听账户变化
  useEffect(() => {
    if (!isMetaMaskInstalled()) return

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet()
      } else if (accounts[0] !== account) {
        setAccount(accounts[0])
        localStorage.setItem('walletAddress', accounts[0])
        // 更新余额
        getBalance(accounts[0]).then(setBalance)
      }
    }

    const handleChainChanged = (newChainId) => {
      // 链变化时重新加载页面
      window.location.reload()
    }

    const handleDisconnect = () => {
      disconnectWallet()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)
    window.ethereum.on('disconnect', handleDisconnect)

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
        window.ethereum.removeListener('disconnect', handleDisconnect)
      }
    }
  }, [account, getBalance])

  // 自动重连
  useEffect(() => {
    const autoConnect = async () => {
      const wasConnected = localStorage.getItem('walletConnected')
      if (wasConnected === 'true' && isMetaMaskInstalled()) {
        await connectWallet()
      }
    }

    autoConnect()
  }, [])

  // 创建只读 provider (用于未连接钱包时读取数据)
  useEffect(() => {
    if (!provider) {
      const readOnlyProvider = new ethers.JsonRpcProvider(RPC_URLS[DEFAULT_NETWORK])
      setProvider(readOnlyProvider)
    }
  }, [provider])

  const value = {
    account,
    chainId,
    provider,
    signer,
    balance,
    isConnecting,
    error,
    isConnected: !!account,
    isMetaMaskInstalled: isMetaMaskInstalled(),
    connectWallet,
    disconnectWallet,
    switchNetwork,
    getBalance
  }

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>
}
