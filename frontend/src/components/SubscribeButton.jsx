import { useState, useEffect } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { LivingPortfolioService } from '../services/LivingPortfolioService'
import { Button } from './ui/button'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Alert, AlertDescription } from './ui/alert'
import { Bell, BellOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

/**
 * 订阅按钮组件
 * 用于订阅/取消订阅用户
 */
export default function SubscribeButton({ targetAddress, variant = 'default', size = 'default' }) {
  const { account, provider, signer, isConnected } = useWeb3()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [preferences, setPreferences] = useState({
    notifyAvailability: true,
    notifyNewProjects: true,
    notifySkills: false
  })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const portfolioService = new LivingPortfolioService(provider, signer)

  // 检查订阅状态
  const checkSubscription = async () => {
    if (!account || !targetAddress || account === targetAddress) {
      setChecking(false)
      return
    }

    try {
      const result = await portfolioService.isSubscribed(account, targetAddress)
      if (result.success) {
        setIsSubscribed(result.data)
      }
    } catch (err) {
      console.error('Error checking subscription:', err)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (isConnected && account) {
      checkSubscription()
    }
  }, [isConnected, account, targetAddress])

  // 订阅
  const handleSubscribe = async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await portfolioService.subscribe(
        targetAddress,
        preferences.notifyAvailability,
        preferences.notifyNewProjects,
        preferences.notifySkills
      )

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          setIsSubscribed(true)
          setShowDialog(false)
          setSuccess(false)
        }, 2000)
      } else {
        setError(result.error || '订阅失败')
      }
    } catch (err) {
      console.error('Error subscribing:', err)
      setError(err.message || '订阅失败')
    } finally {
      setLoading(false)
    }
  }

  // 取消订阅
  const handleUnsubscribe = async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await portfolioService.unsubscribe(targetAddress)

      if (result.success) {
        setIsSubscribed(false)
      } else {
        setError(result.error || '取消订阅失败')
        alert(`取消订阅失败: ${result.error}`)
      }
    } catch (err) {
      console.error('Error unsubscribing:', err)
      setError(err.message || '取消订阅失败')
      alert(`取消订阅失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 不显示按钮的情况
  if (!isConnected || !targetAddress || account === targetAddress || checking) {
    return null
  }

  if (isSubscribed) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleUnsubscribe}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            处理中...
          </>
        ) : (
          <>
            <BellOff className="w-4 h-4 mr-2" />
            取消订阅
          </>
        )}
      </Button>
    )
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowDialog(true)}
        disabled={loading}
      >
        <Bell className="w-4 h-4 mr-2" />
        订阅更新
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>订阅用户更新</DialogTitle>
            <DialogDescription>
              选择您想要接收的通知类型
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="py-8">
              <Alert className="border-green-500">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700">
                  订阅成功!您将收到该用户的更新通知
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifyAvailability">可用性变化</Label>
                    <p className="text-sm text-gray-500">
                      当用户更新可用性状态时通知我
                    </p>
                  </div>
                  <Switch
                    id="notifyAvailability"
                    checked={preferences.notifyAvailability}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, notifyAvailability: checked })
                    }
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifyNewProjects">新项目</Label>
                    <p className="text-sm text-gray-500">
                      当用户添加新项目时通知我
                    </p>
                  </div>
                  <Switch
                    id="notifyNewProjects"
                    checked={preferences.notifyNewProjects}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, notifyNewProjects: checked })
                    }
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifySkills">技能更新</Label>
                    <p className="text-sm text-gray-500">
                      当用户更新技能时通知我
                    </p>
                  </div>
                  <Switch
                    id="notifySkills"
                    checked={preferences.notifySkills}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, notifySkills: checked })
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  disabled={loading}
                >
                  取消
                </Button>
                <Button onClick={handleSubscribe} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      订阅中...
                    </>
                  ) : (
                    '确认订阅'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
