/**
 * Web3 Payment Modal Component
 * 
 * Modal for handling crypto payments for subscriptions.
 * Supports ETH, USDT, and USDC payments.
 * 
 * @author Manus AI
 * @date 2025-11-05
 */

import React, { useState, useEffect } from 'react'
import { X, Loader2, CheckCircle, AlertCircle, Wallet, ArrowRight } from 'lucide-react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Progress } from './ui/progress'
import { Alert, AlertDescription } from './ui/alert'
import { useWeb3 } from '../contexts/Web3Context'
import { useToast } from '../contexts/ToastContext'
import { web3SubscriptionService, SUBSCRIPTION_TIERS, SUBSCRIPTION_PERIODS } from '../services/Web3SubscriptionService'

const PAYMENT_TOKENS = [
  { value: 'ETH', label: 'Ethereum (ETH)', icon: '⟠' },
  { value: 'USDT', label: 'Tether (USDT)', icon: '₮' },
  { value: 'USDC', label: 'USD Coin (USDC)', icon: '$' }
]

const PAYMENT_STEPS = [
  { id: 1, name: 'Getting pricing' },
  { id: 2, name: 'Preparing payment' },
  { id: 3, name: 'Approving token' },
  { id: 4, name: 'Subscribing' },
  { id: 5, name: 'Confirming transaction' },
  { id: 6, name: 'Syncing with backend' },
  { id: 7, name: 'Complete' }
]

const Web3PaymentModal = ({ isOpen, onClose, plan, period, onPaymentComplete }) => {
  const { account } = useWeb3()
  const { success, error: showError } = useToast()
  
  const [paymentToken, setPaymentToken] = useState('ETH')
  const [autoRenew, setAutoRenew] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepMessage, setStepMessage] = useState('')
  const [error, setError] = useState(null)
  const [txHash, setTxHash] = useState(null)
  const [pricing, setPricing] = useState(null)
  const [estimatedGas, setEstimatedGas] = useState(null)

  useEffect(() => {
    if (isOpen && plan) {
      loadPricing()
    }
  }, [isOpen, plan, period])

  /**
   * Load pricing information
   */
  const loadPricing = async () => {
    try {
      const tierMap = { 'FREE': 0, 'PRO': 1, 'ENTERPRISE': 2 }
      const tier = tierMap[plan.tier]
      const pricingData = await web3SubscriptionService.getPricing(tier)
      setPricing(pricingData)
      
      // Estimate gas (placeholder - should be calculated from contract)
      setEstimatedGas('0.002')
    } catch (err) {
      console.error('Error loading pricing:', err)
      setError('Failed to load pricing')
    }
  }

  /**
   * Handle payment
   */
  const handlePayment = async () => {
    try {
      setProcessing(true)
      setError(null)
      setCurrentStep(0)

      // Get tier and period values
      const tierMap = { 'FREE': 0, 'PRO': 1, 'ENTERPRISE': 2 }
      const tier = tierMap[plan.tier]
      const periodValue = period === 'monthly' ? SUBSCRIPTION_PERIODS.MONTHLY : SUBSCRIPTION_PERIODS.YEARLY

      // Subscribe with progress callback
      const result = await web3SubscriptionService.subscribe(
        tier,
        periodValue,
        paymentToken,
        autoRenew,
        (progress) => {
          setCurrentStep(progress.step)
          setStepMessage(progress.message)
        }
      )

      // Payment successful
      setTxHash(result.transactionHash)
      success('Payment successful!', 'Your subscription has been activated')
      
      // Wait a moment before closing
      setTimeout(() => {
        onPaymentComplete?.(result)
      }, 2000)

    } catch (err) {
      console.error('Payment error:', err)
      setError(err.message || 'Payment failed. Please try again.')
      showError('Payment failed', err.message)
    } finally {
      setProcessing(false)
    }
  }

  /**
   * Get price based on period
   */
  const getPrice = () => {
    if (!pricing) return '...'
    
    if (period === 'monthly') {
      return paymentToken === 'ETH' ? `${pricing.monthlyPriceEth} ETH` : `${pricing.monthlyPrice} ${paymentToken}`
    } else {
      return paymentToken === 'ETH' ? `${pricing.yearlyPriceEth} ETH` : `${pricing.yearlyPrice} ${paymentToken}`
    }
  }

  /**
   * Get total cost including gas
   */
  const getTotalCost = () => {
    if (!pricing || !estimatedGas) return '...'
    
    if (paymentToken === 'ETH') {
      const price = period === 'monthly' ? parseFloat(pricing.monthlyPriceEth) : parseFloat(pricing.yearlyPriceEth)
      const total = price + parseFloat(estimatedGas)
      return `${total.toFixed(4)} ETH`
    } else {
      const price = period === 'monthly' ? pricing.monthlyPrice : pricing.yearlyPrice
      return `${price} ${paymentToken} + ${estimatedGas} ETH (gas)`
    }
  }

  /**
   * Calculate progress percentage
   */
  const getProgress = () => {
    return (currentStep / PAYMENT_STEPS.length) * 100
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Complete Payment</span>
            {!processing && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            Subscribe to {plan?.name} - {period === 'monthly' ? 'Monthly' : 'Yearly'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Summary */}
          {!processing && !txHash && (
            <>
              {/* Payment Token Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Payment Method
                </label>
                <Select value={paymentToken} onValueChange={setPaymentToken}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TOKENS.map((token) => (
                      <SelectItem key={token.value} value={token.value}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{token.icon}</span>
                          <span>{token.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Breakdown */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subscription Price</span>
                  <span className="font-medium">{getPrice()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Estimated Gas Fee</span>
                  <span className="font-medium">{estimatedGas} ETH</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-semibold">
                  <span>Total Cost</span>
                  <span>{getTotalCost()}</span>
                </div>
              </div>

              {/* Auto-Renew Option */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoRenew"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="autoRenew" className="text-sm">
                  Enable auto-renewal (can be disabled anytime)
                </label>
              </div>

              {/* Wallet Info */}
              <Alert>
                <Wallet className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Payment will be made from: <br />
                  <code className="text-xs">{account}</code>
                </AlertDescription>
              </Alert>

              {/* Error Message */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Payment Button */}
              <Button 
                className="w-full" 
                size="lg"
                onClick={handlePayment}
                disabled={!pricing}
              >
                <span>Confirm Payment</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <p className="text-xs text-gray-500 text-center">
                By confirming, you agree to our Terms of Service and Privacy Policy
              </p>
            </>
          )}

          {/* Processing State */}
          {processing && (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Processing Payment...</span>
                  <span>{currentStep}/{PAYMENT_STEPS.length}</span>
                </div>
                <Progress value={getProgress()} className="h-2" />
              </div>

              {/* Current Step */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <div>
                  <div className="font-medium text-sm">
                    {PAYMENT_STEPS[currentStep - 1]?.name || 'Processing...'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {stepMessage}
                  </div>
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-2">
                {PAYMENT_STEPS.map((step) => (
                  <div 
                    key={step.id}
                    className={`flex items-center gap-2 text-sm ${
                      step.id < currentStep 
                        ? 'text-green-600' 
                        : step.id === currentStep 
                        ? 'text-blue-600 font-medium' 
                        : 'text-gray-400'
                    }`}
                  >
                    {step.id < currentStep ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : step.id === currentStep ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-current" />
                    )}
                    <span>{step.name}</span>
                  </div>
                ))}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Please do not close this window or refresh the page
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Success State */}
          {txHash && !processing && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">Payment Successful!</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your subscription has been activated
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Transaction Hash</div>
                <code className="text-xs break-all">{txHash}</code>
              </div>

              <Button className="w-full" onClick={onClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default Web3PaymentModal
