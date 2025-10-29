import { useState, useEffect } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { LivingPortfolioService } from '../services/LivingPortfolioService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Alert, AlertDescription } from './ui/alert'
import { 
  Bell, 
  BellOff, 
  Users, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  UserPlus
} from 'lucide-react'
import { formatAddress } from '../config/web3'

/**
 * 订阅管理组件
 * 管理用户的订阅和订阅者
 */
export default function SubscriptionManager() {
  const { account, provider, signer, isConnected } = useWeb3()
  const [subscriptions, setSubscriptions] = useState([])
  const [subscribers, setSubscribers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('subscriptions')

  const portfolioService = new LivingPortfolioService(provider, signer)

  // 加载订阅数据
  const loadData = async () => {
    if (!account) return

    try {
      setLoading(true)
      setError(null)

      // 加载订阅列表
      const subsResult = await portfolioService.getSubscriptions(account)
      if (subsResult.success) {
        setSubscriptions(subsResult.data || [])
      }

      // 加载订阅者列表
      const subscribersResult = await portfolioService.getSubscribers(account)
      if (subscribersResult.success) {
        setSubscribers(subscribersResult.data || [])
      }

    } catch (err) {
      console.error('Error loading subscription data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected && account) {
      loadData()
    }
  }, [isConnected, account])

  // 取消订阅
  const handleUnsubscribe = async (targetAddress) => {
    try {
      const result = await portfolioService.unsubscribe(targetAddress)
      if (result.success) {
        await loadData()
      } else {
        alert(`取消订阅失败: ${result.error}`)
      }
    } catch (err) {
      console.error('Error unsubscribing:', err)
      alert(`取消订阅失败: ${err.message}`)
    }
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>请先连接钱包</CardTitle>
            <CardDescription>
              您需要连接 Web3 钱包才能管理订阅
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载订阅数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4 space-y-6">
      {/* 头部统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              我的订阅
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold">{subscriptions.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              正在关注的用户
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              我的订阅者
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold">{subscribers.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              关注我的用户
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 标签切换 */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'subscriptions' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('subscriptions')}
        >
          <Bell className="w-4 h-4 mr-2" />
          我的订阅 ({subscriptions.length})
        </Button>
        <Button
          variant={activeTab === 'subscribers' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('subscribers')}
        >
          <Users className="w-4 h-4 mr-2" />
          订阅者 ({subscribers.length})
        </Button>
      </div>

      {/* 订阅列表 */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">我的订阅</h2>
          </div>

          {subscriptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 mb-2">您还没有订阅任何用户</p>
                <p className="text-sm text-gray-400">
                  订阅用户后,您将收到他们的更新通知
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {subscriptions.map((address, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {address.slice(2, 4).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium font-mono text-sm">
                            {formatAddress(address, 8)}
                          </p>
                          <Badge variant="secondary" className="mt-1">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            已订阅
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnsubscribe(address)}
                      >
                        <BellOff className="w-4 h-4 mr-2" />
                        取消订阅
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 订阅者列表 */}
      {activeTab === 'subscribers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">我的订阅者</h2>
          </div>

          {subscribers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 mb-2">还没有用户订阅您</p>
                <p className="text-sm text-gray-400">
                  创建优质的作品集和项目,吸引更多订阅者
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {subscribers.map((address, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {address.slice(2, 4).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium font-mono text-sm">
                          {formatAddress(address, 8)}
                        </p>
                        <Badge variant="secondary" className="mt-1">
                          <UserPlus className="w-3 h-3 mr-1" />
                          订阅者
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
