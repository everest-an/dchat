import { useState, useEffect } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { useLanguage } from '../contexts/LanguageContext'
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
 * Subscription Manager Component
 * Manage user subscriptions and subscribers
 */
export default function SubscriptionManager() {
  const { account, provider, signer, isConnected } = useWeb3()
  const { t } = useLanguage()
  const [subscriptions, setSubscriptions] = useState([])
  const [subscribers, setSubscribers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('subscriptions')

  // Use account or get from localStorage
  const userAddress = account || localStorage.getItem('authToken') || 'guest'

  // Load subscription data
  const loadData = async () => {
    if (!userAddress) return

    try {
      setLoading(true)
      setError(null)

      // Load subscriptions from localStorage (same as SubscriptionPage)
      const subsKey = `dchat_local_subscriptions_${userAddress}`
      const subscribersKey = `dchat_local_subscribers_${userAddress}`

      const storedSubs = localStorage.getItem(subsKey)
      const storedSubscribers = localStorage.getItem(subscribersKey)

      setSubscriptions(storedSubs ? JSON.parse(storedSubs) : [])
      setSubscribers(storedSubscribers ? JSON.parse(storedSubscribers) : [])

    } catch (err) {
      console.error('Error loading subscription data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userAddress) {
      loadData()
    }
  }, [userAddress])

  // Unsubscribe
  const handleUnsubscribe = async (targetAddress) => {
    try {
      const subsKey = `dchat_local_subscriptions_${userAddress}`
      const filtered = subscriptions.filter(addr => addr !== targetAddress)
      localStorage.setItem(subsKey, JSON.stringify(filtered))

      // Update target's subscribers
      const targetSubsKey = `dchat_local_subscribers_${targetAddress}`
      const targetSubs = JSON.parse(localStorage.getItem(targetSubsKey) || '[]')
      const filteredTarget = targetSubs.filter(addr => addr !== userAddress)
      localStorage.setItem(targetSubsKey, JSON.stringify(filteredTarget))

      await loadData()
    } catch (err) {
      console.error('Error unsubscribing:', err)
      alert(`${t('subscription.unsubscribeFailed')}: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{t('subscription.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4 space-y-6">
      {/* Statistics Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              {t('subscription.mySubscriptions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold">{subscriptions.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {t('subscription.followingUsers')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              {t('subscription.mySubscribers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold">{subscribers.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {t('subscription.followers')}
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

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'subscriptions' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('subscriptions')}
        >
          <Bell className="w-4 h-4 mr-2" />
          {t('subscription.mySubscriptions')} ({subscriptions.length})
        </Button>
        <Button
          variant={activeTab === 'subscribers' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('subscribers')}
        >
          <Users className="w-4 h-4 mr-2" />
          {t('subscription.subscribers')} ({subscribers.length})
        </Button>
      </div>

      {/* Subscription List */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t('subscription.mySubscriptions')}</h2>
          </div>

          {subscriptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 mb-2">{t('subscription.noSubscriptions')}</p>
                <p className="text-sm text-gray-400">
                  {t('subscription.subscriptionHint')}
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
                            {t('subscription.subscribed')}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnsubscribe(address)}
                      >
                        <BellOff className="w-4 h-4 mr-2" />
                        {t('subscription.unsubscribe')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subscribers List */}
      {activeTab === 'subscribers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t('subscription.mySubscribers')}</h2>
          </div>

          {subscribers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 mb-2">{t('subscription.noSubscribers')}</p>
                <p className="text-sm text-gray-400">
                  {t('subscription.subscribersHint')}
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
                          {t('subscription.subscriber')}
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
