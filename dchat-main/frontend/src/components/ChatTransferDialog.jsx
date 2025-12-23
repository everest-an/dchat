import React, { useState, useEffect } from 'react'
import { X, DollarSign, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../contexts/ToastContext'
import axios from 'axios'

/**
 * Chat Transfer Dialog Component
 * 
 * Allows users to send money transfers in chat (similar to WeChat/Telegram transfers).
 * 
 * Flow:
 * 1. User enters amount and optional message
 * 2. Money is deducted from sender's custodial wallet
 * 3. Transfer message appears in chat
 * 4. Recipient can claim the transfer
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether dialog is open
 * @param {Function} props.onClose - Close dialog callback
 * @param {string} props.recipientAddress - Recipient's wallet address
 * @param {string} props.recipientName - Recipient's display name
 * @param {Function} props.onSuccess - Success callback with transfer data
 */
const ChatTransferDialog = ({ 
  isOpen, 
  onClose, 
  recipientAddress, 
  recipientName,
  onSuccess 
}) => {
  const { t } = useLanguage()
  const { success, error: showError } = useToast()
  
  const [token, setToken] = useState('USDT')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [balances, setBalances] = useState({})
  const [loadingBalances, setLoadingBalances] = useState(true)
  
  // Load wallet balances
  useEffect(() => {
    if (isOpen) {
      loadBalances()
    }
  }, [isOpen])
  
  const loadBalances = async () => {
    try {
      setLoadingBalances(true)
      
      const token = localStorage.getItem('auth_token')
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/custodial-wallet/balance`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (response.data.balances) {
        setBalances(response.data.balances)
      }
    } catch (err) {
      console.error('Error loading balances:', err)
      showError(t('common.error'), t('payment.balanceLoadFailed'))
    } finally {
      setLoadingBalances(false)
    }
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate amount
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      showError(t('common.error'), t('payment.invalidInput'))
      return
    }
    
    // Check balance
    const currentBalance = balances[token] || 0
    if (amountNum > currentBalance) {
      showError(t('common.error'), t('payment.insufficientBalance'))
      return
    }
    
    try {
      setLoading(true)
      
      const authToken = localStorage.getItem('auth_token')
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/chat-transfer/create`,
        {
          recipient_address: recipientAddress,
          token: token,
          amount: amountNum,
          message: message
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (response.data.transfer_id) {
        success(
          t('payment.success'),
          `${t('payment.transactionConfirmed')}: ${amountNum} ${token}`
        )
        
        // Call success callback with transfer data
        if (onSuccess) {
          onSuccess({
            transfer_id: response.data.transfer_id,
            token: token,
            amount: amountNum,
            message: message,
            recipient: recipientAddress,
            status: 'pending'
          })
        }
        
        // Reset form
        setAmount('')
        setMessage('')
        onClose()
      }
    } catch (err) {
      console.error('Error creating transfer:', err)
      const errorMsg = err.response?.data?.error || t('payment.failed')
      showError(t('common.error'), errorMsg)
    } finally {
      setLoading(false)
    }
  }
  
  const handleMaxClick = () => {
    const balance = balances[token] || 0
    setAmount(balance.toString())
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('payment.title')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('payment.recipient')}: {recipientName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Token Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('payment.selectToken')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['ETH', 'USDT', 'USDC'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setToken(t)}
                  className={`
                    px-4 py-2 rounded-lg border-2 font-medium transition-colors
                    ${token === t
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                    }
                  `}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          
          {/* Balance Display */}
          {loadingBalances ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('payment.available')}:
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {(balances[token] || 0).toFixed(6)} {token}
                </span>
              </div>
            </div>
          )}
          
          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('payment.amount')}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.000001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full px-4 py-3 pr-16 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleMaxClick}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              >
                {t('payment.maxBalance')}
              </button>
            </div>
          </div>
          
          {/* Message Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('chat.messagePlaceholder')} ({t('common.optional')})
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('chat.messagePlaceholder')}
              rows={3}
              maxLength={200}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
              {message.length}/200
            </div>
          </div>
          
          {/* Info Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800 dark:text-blue-300">
                {t('payment.custodialDescription')}
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              {t('payment.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              disabled={loading || !amount || loadingBalances}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('payment.processing')}
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  {t('payment.pay')}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChatTransferDialog
