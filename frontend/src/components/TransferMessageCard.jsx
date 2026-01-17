import React, { useState } from 'react'
import { DollarSign, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../contexts/ToastContext'
import axios from 'axios'

/**
 * Transfer Message Card Component
 * 
 * Displays a money transfer in chat (similar to WeChat/Telegram transfer cards).
 * Shows different states: pending, claimed, cancelled, expired.
 * 
 * @param {Object} props
 * @param {Object} props.transfer - Transfer data
 * @param {boolean} props.isSender - Whether current user is the sender
 * @param {Function} props.onClaim - Callback when transfer is claimed
 */
const TransferMessageCard = ({ transfer, isSender, onClaim }) => {
  const { t } = useLanguage()
  const { success, error: showError } = useToast()
  
  const [claiming, setClaiming] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [status, setStatus] = useState(transfer.status)
  
  const handleClaim = async () => {
    try {
      setClaiming(true)
      
      const token = localStorage.getItem('auth_token')
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/chat-transfer/claim/${transfer.transfer_id}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (response.data.status === 'claimed') {
        setStatus('claimed')
        success(
          t('payment.success'),
          `${t('payment.transactionConfirmed')}: ${transfer.amount} ${transfer.token}`
        )
        
        if (onClaim) {
          onClaim(transfer.transfer_id)
        }
      }
    } catch (err) {
      console.error('Error claiming transfer:', err)
      const errorMsg = err.response?.data?.error || t('payment.failed')
      showError(t('common.error'), errorMsg)
    } finally {
      setClaiming(false)
    }
  }
  
  const handleCancel = async () => {
    try {
      setCancelling(true)
      
      const token = localStorage.getItem('auth_token')
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/chat-transfer/cancel/${transfer.transfer_id}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (response.data.status === 'cancelled') {
        setStatus('cancelled')
        success(
          t('common.success'),
          t('payment.transactionCancelled')
        )
      }
    } catch (err) {
      console.error('Error cancelling transfer:', err)
      const errorMsg = err.response?.data?.error || t('payment.failed')
      showError(t('common.error'), errorMsg)
    } finally {
      setCancelling(false)
    }
  }
  
  // Status icon and color
  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'claimed':
        return <CheckCircle className="w-4 h-4" />
      case 'cancelled':
      case 'expired':
        return <XCircle className="w-4 h-4" />
      default:
        return <DollarSign className="w-4 h-4" />
    }
  }
  
  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      case 'claimed':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      case 'cancelled':
      case 'expired':
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700'
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
    }
  }
  
  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return t('payment.statusPending')
      case 'claimed':
        return t('payment.statusConfirmed')
      case 'cancelled':
        return t('payment.cancelled')
      case 'expired':
        return t('payment.expired')
      default:
        return status
    }
  }
  
  return (
    <div className={`
      max-w-sm rounded-lg border-2 overflow-hidden
      ${status === 'pending' 
        ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10' 
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }
    `}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span className="font-medium">
              {isSender ? t('payment.typeTransfer') : t('payment.typeDeposit')}
            </span>
          </div>
          <div className={`
            flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium
            ${getStatusColor()}
          `}>
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </div>
        </div>
      </div>
      
      {/* Amount */}
      <div className="px-4 py-6 text-center">
        <div className="text-3xl font-bold text-gray-900 dark:text-white">
          {transfer.amount} {transfer.token}
        </div>
        {transfer.message && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            "{transfer.message}"
          </p>
        )}
      </div>
      
      {/* Action Buttons */}
      {status === 'pending' && (
        <div className="px-4 pb-4">
          {isSender ? (
            <Button
              onClick={handleCancel}
              variant="outline"
              className="w-full"
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('payment.processing')}
                </>
              ) : (
                t('payment.cancel')
              )}
            </Button>
          ) : (
            <Button
              onClick={handleClaim}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={claiming}
            >
              {claiming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('payment.processing')}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t('payment.claim')}
                </>
              )}
            </Button>
          )}
        </div>
      )}
      
      {/* Footer Info */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        {status === 'claimed' && transfer.claimed_at && (
          <div>{t('payment.claimedAt')}: {new Date(transfer.claimed_at).toLocaleString()}</div>
        )}
        {status === 'pending' && transfer.expires_at && (
          <div>{t('payment.expiresAt')}: {new Date(transfer.expires_at).toLocaleString()}</div>
        )}
        {status === 'cancelled' && (
          <div>{t('payment.cancelledByUser')}</div>
        )}
      </div>
    </div>
  )
}

export default TransferMessageCard
