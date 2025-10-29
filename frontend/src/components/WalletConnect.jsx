import { useState } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { Wallet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { formatAddress } from '../config/web3'

/**
 * 钱包连接组件
 * 显示钱包连接状态和操作按钮
 */
export default function WalletConnect({ onConnected }) {
  const {
    account,
    balance,
    chainId,
    isConnecting,
    error,
    isConnected,
    isMetaMaskInstalled,
    connectWallet,
    disconnectWallet,
    switchNetwork
  } = useWeb3()

  const [showDetails, setShowDetails] = useState(false)

  const handleConnect = async () => {
    const success = await connectWallet()
    if (success && onConnected) {
      onConnected(account)
    }
  }

  const handleSwitchNetwork = async () => {
    await switchNetwork('sepolia')
  }

  // 检查是否在正确的网络
  const isCorrectNetwork = chainId === '11155111' // Sepolia chainId

  if (!isMetaMaskInstalled) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            连接钱包
          </CardTitle>
          <CardDescription>请安装 MetaMask 钱包以继续</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              请先安装{' '}
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                MetaMask 钱包扩展
              </a>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!isConnected) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            连接钱包
          </CardTitle>
          <CardDescription>
            连接您的 MetaMask 钱包以使用 Dchat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
            size="lg"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                连接中...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                连接 MetaMask
              </>
            )}
          </Button>

          <div className="text-sm text-gray-500 text-center">
            <p>首次使用?</p>
            <p className="mt-1">
              连接钱包后将自动创建您的 Dchat 账户
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            钱包已连接
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? '隐藏' : '详情'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">地址</span>
            <Badge variant="secondary" className="font-mono">
              {formatAddress(account, 6)}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">余额</span>
            <span className="font-medium">
              {parseFloat(balance).toFixed(4)} ETH
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">网络</span>
            <Badge variant={isCorrectNetwork ? 'default' : 'destructive'}>
              {isCorrectNetwork ? 'Sepolia' : '错误网络'}
            </Badge>
          </div>
        </div>

        {!isCorrectNetwork && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              请切换到 Sepolia 测试网络
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwitchNetwork}
                className="ml-2"
              >
                切换网络
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {showDetails && (
          <div className="pt-4 border-t space-y-2">
            <div className="text-sm">
              <span className="text-gray-500">完整地址:</span>
              <p className="font-mono text-xs mt-1 break-all">{account}</p>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Chain ID:</span>
              <p className="font-mono text-xs mt-1">{chainId}</p>
            </div>
          </div>
        )}

        <Button
          variant="outline"
          onClick={disconnectWallet}
          className="w-full"
        >
          断开连接
        </Button>
      </CardContent>
    </Card>
  )
}
