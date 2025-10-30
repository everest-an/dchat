import { useState, useEffect } from 'react'
import { useWeb3 } from '../contexts/Web3Context'
import { LivingPortfolioService } from '../services/LivingPortfolioService'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { Bell, Check, User, Briefcase, TrendingUp, Award } from 'lucide-react'
import { formatAddress } from '../config/web3'
import { useLanguage } from '../contexts/LanguageContext'


/**
 * TODO: Translate {t('notification_center_component')}
 * TODO: Translate {t('show_subscriber_update_notifications')}
 */
export default function NotificationCenter() {
  const { t } = useLanguage()

  const { account, provider, signer, isConnected } = useWeb3()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  // TODO: Translate {t('init_service')}
  const portfolioService = new LivingPortfolioService(provider, signer)

  // TODO: Translate {t('load_notification')}
  const loadNotifications = () => {
    // from localStorage TODO: Translate {t('load_notification')}
    const stored = localStorage.getItem(`notifications_${account}`)
    if (stored) {
      const parsed = JSON.parse(stored)
      setNotifications(parsed)
      const unread = parsed.filter(n => !n.read).length
      setUnreadCount(unread)
    }
  }

  // TODO: Translate {t('add_notification')}
  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      ...notification,
      read: false,
      timestamp: Date.now()
    }

    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, 50) // TODO: Translate {t('keep_latest_only')}50TODO: Translate {t('item_count')}
      localStorage.setItem(`notifications_${account}`, JSON.stringify(updated))
      return updated
    })

    setUnreadCount(prev => prev + 1)
  }

  // TODO: Translate {t('mark_as_read')}
  const markAsRead = (id) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      )
      localStorage.setItem(`notifications_${account}`, JSON.stringify(updated))
      return updated
    })
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  // TODO: Translate {t('mark_all_read')}
  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }))
      localStorage.setItem(`notifications_${account}`, JSON.stringify(updated))
      return updated
    })
    setUnreadCount(0)
  }

  // TODO: Translate {t('listen_event')}
  useEffect(() => {
    if (!isConnected || !account) return

    loadNotifications()

    // TODO: Translate {t('listen_availability_update_event')}
    const handleAvailabilityUpdated = (data) => {
      addNotification({
        type: 'availability',
        title: {t('availability_update')},
        message: `${formatAddress(data.owner)} 更新了可用性状态`,
        address: data.owner,
        icon: TrendingUp
      })
    }

    // TODO: Translate {t('listen_new_project_event')}
    const handleProjectAdded = (data) => {
      addNotification({
        type: 'project',
        title: {t('new_project')},
        message: `${formatAddress(data.owner)} 添加了新项目: ${data.title}`,
        address: data.owner,
        icon: Briefcase
      })
    }

    // TODO: Translate {t('listen_subscription_event')}
    const handleSubscribed = (data) => {
      if (data.target === account) {
        addNotification({
          type: 'subscribe',
          title: {t('new_subscriber')},
          message: `${formatAddress(data.subscriber)} 订阅了您的更新`,
          address: data.subscriber,
          icon: User
        })
      }
    }

    // TODO: Translate {t('listen_credential_issuance_event')}
    const handleCredentialIssued = (data) => {
      if (data.recipient === account) {
        addNotification({
          type: 'credential',
          title: {t('new_credential')},
          message: `您获得了新凭证: ${data.title}`,
          address: data.issuer,
          icon: Award
        })
      }
    }

    portfolioService.onAvailabilityUpdated(handleAvailabilityUpdated)
    portfolioService.onProjectAdded(handleProjectAdded)
    portfolioService.onSubscribed(handleSubscribed)
    portfolioService.onCredentialIssued(handleCredentialIssued)

    return () => {
      // TODO: Translate {t('clear_event_listener')}
      portfolioService.off('AvailabilityUpdated', handleAvailabilityUpdated)
      portfolioService.off('ProjectAdded', handleProjectAdded)
      portfolioService.off('Subscribed', handleSubscribed)
      portfolioService.off('CredentialIssued', handleCredentialIssued)
    }
  }, [isConnected, account])

  if (!isConnected) {
    return null
  }

  const formatTime = (timestamp) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return {t('just_now')}
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return new Date(timestamp).toLocaleDateString('zh-CN')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{t("notification")}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
            >
              <Check className="w-4 h-4 mr-1" />
              全部已读
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Bell className="w-12 h-12 mb-2 opacity-50" />
              <p>{t("no_notification")}</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = notification.icon || Bell
                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-full ${
                        notification.type === 'availability' ? 'bg-green-100' :
                        notification.type === 'project' ? 'bg-blue-100' :
                        notification.type === 'subscribe' ? 'bg-purple-100' :
                        notification.type === 'credential' ? 'bg-yellow-100' :
                        'bg-gray-100'
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          notification.type === 'availability' ? 'text-green-600' :
                          notification.type === 'project' ? 'text-blue-600' :
                          notification.type === 'subscribe' ? 'text-purple-600' :
                          notification.type === 'credential' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{notification.title}</p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
