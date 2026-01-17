/**
 * Web3 Subscription Plans Component
 * 
 * Displays subscription plans with crypto payment integration.
 * Users can subscribe using ETH, USDT, or USDC.
 * 
 * @author Manus AI
 * @date 2025-11-05
 */

import React, { useState, useEffect } from 'react'
import { Check, Crown, Zap, Shield, Loader2, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { useWeb3 } from '../contexts/Web3Context'
import { useToast } from '../contexts/ToastContext'
import { web3SubscriptionService, SUBSCRIPTION_TIERS, SUBSCRIPTION_PERIODS } from '../services/Web3SubscriptionService'
import PaymentModal from './PaymentModal'

const Web3SubscriptionPlans = () => {
  const { account, isConnected } = useWeb3()
  const { success, error: showError, info } = useToast()
  
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentTier, setCurrentTier] = useState(SUBSCRIPTION_TIERS.FREE)
  const [isActive, setIsActive] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState('monthly') // 'monthly' or 'yearly'

  useEffect(() => {
    loadPlans()
  }, [])

  useEffect(() => {
    if (account && isConnected) {
      loadUserSubscription()
    }
  }, [account, isConnected])

  /**
   * Load subscription plans from backend
   */
  const loadPlans = async () => {
    try {
      setLoading(true)
      const plansData = await web3SubscriptionService.getSubscriptionPlans()
      setPlans(plansData)
    } catch (err) {
      console.error('Error loading plans:', err)
      showError('Failed to load subscription plans')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Load user's current subscription
   */
  const loadUserSubscription = async () => {
    try {
      const tier = await web3SubscriptionService.getUserTier(account)
      const active = await web3SubscriptionService.isSubscriptionActive(account)
      
      setCurrentTier(tier)
      setIsActive(active)
    } catch (err) {
      console.error('Error loading user subscription:', err)
    }
  }

  /**
   * Handle upgrade button click
   */
  const handleUpgrade = (plan) => {
    if (!isConnected) {
      info('Please connect your wallet first')
      return
    }

    setSelectedPlan(plan)
    setShowPaymentModal(true)
  }

  /**
   * Handle payment completion
   */
  const handlePaymentComplete = async (paymentData) => {
    try {
      success('Subscription activated!', 'Your subscription has been successfully activated')
      setShowPaymentModal(false)
      await loadUserSubscription()
    } catch (err) {
      console.error('Error handling payment:', err)
      showError('Failed to activate subscription')
    }
  }

  /**
   * Get plan icon component
   */
  const getPlanIcon = (tierName) => {
    switch (tierName) {
      case 'FREE':
        return Shield
      case 'PRO':
        return Zap
      case 'ENTERPRISE':
        return Crown
      default:
        return Shield
    }
  }

  /**
   * Get plan color
   */
  const getPlanColor = (tierName) => {
    switch (tierName) {
      case 'FREE':
        return 'gray'
      case 'PRO':
        return 'blue'
      case 'ENTERPRISE':
        return 'purple'
      default:
        return 'gray'
    }
  }

  /**
   * Check if plan is current
   */
  const isCurrentPlan = (tierName) => {
    const tierMap = { 'FREE': 0, 'PRO': 1, 'ENTERPRISE': 2 }
    return tierMap[tierName] === currentTier
  }

  /**
   * Check if plan is upgrade
   */
  const canUpgradeTo = (tierName) => {
    const tierMap = { 'FREE': 0, 'PRO': 1, 'ENTERPRISE': 2 }
    return tierMap[tierName] > currentTier
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          Pay with crypto (ETH, USDT, USDC) - No credit card required
        </p>
        
        {/* Billing Period Toggle */}
        <div className="flex justify-center items-center gap-4 mb-4">
          <Button
            variant={billingPeriod === 'monthly' ? 'default' : 'outline'}
            onClick={() => setBillingPeriod('monthly')}
          >
            Monthly
          </Button>
          <Button
            variant={billingPeriod === 'yearly' ? 'default' : 'outline'}
            onClick={() => setBillingPeriod('yearly')}
          >
            Yearly
            <Badge className="ml-2" variant="success">Save 17%</Badge>
          </Button>
        </div>

        {/* Current Plan Alert */}
        {isConnected && (
          <Alert className="max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Current Plan: <strong>{Object.keys(SUBSCRIPTION_TIERS)[currentTier]}</strong>
              {isActive && <span className="text-green-600 ml-2">● Active</span>}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const Icon = getPlanIcon(plan.tier)
          const color = getPlanColor(plan.tier)
          const isCurrent = isCurrentPlan(plan.tier)
          const canUpgrade = canUpgradeTo(plan.tier)
          const isPopular = plan.tier === 'PRO'

          // Get price based on billing period
          const price = billingPeriod === 'monthly' 
            ? plan.pricing.monthlyUsd 
            : plan.pricing.yearlyUsd
          const priceEth = billingPeriod === 'monthly'
            ? plan.pricing.monthlyEth
            : plan.pricing.yearlyEth

          return (
            <Card 
              key={plan.tier}
              className={`relative ${isPopular ? 'border-blue-500 border-2 shadow-lg' : ''}`}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge variant="default" className="bg-blue-500">
                    Most Popular
                  </Badge>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrent && (
                <div className="absolute -top-4 right-4">
                  <Badge variant="success">
                    Current Plan
                  </Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`w-8 h-8 text-${color}-500`} />
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent>
                {/* Price */}
                <div className="mb-6">
                  <div className="text-4xl font-bold mb-1">
                    {price}
                    {plan.tier !== 'FREE' && (
                      <span className="text-lg font-normal text-gray-600">
                        /{billingPeriod === 'monthly' ? 'month' : 'year'}
                      </span>
                    )}
                  </div>
                  {plan.tier !== 'FREE' && (
                    <div className="text-sm text-gray-500">
                      {priceEth} ETH
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : canUpgrade ? (
                  <Button 
                    className="w-full"
                    onClick={() => handleUpgrade(plan)}
                    disabled={!isConnected}
                  >
                    {isConnected ? 'Upgrade Now' : 'Connect Wallet'}
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Lower Tier
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          plan={selectedPlan}
          period={billingPeriod}
          onPaymentComplete={handlePaymentComplete}
        />
      )}

      {/* FAQ Section */}
      <div className="mt-16 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-2">What payment methods do you accept?</h3>
            <p className="text-gray-600 dark:text-gray-400">
              We accept ETH, USDT, and USDC on Ethereum network. No credit card required.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">Can I cancel anytime?</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">What is an NFT membership card?</h3>
            <p className="text-gray-600 dark:text-gray-400">
              NFT membership cards provide lifetime access to your subscription tier. They can be transferred or traded like any other NFT.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">Is there a refund policy?</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Yes, we offer a 7-day money-back guarantee for all subscriptions. Contact support to request a refund.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Web3SubscriptionPlans
