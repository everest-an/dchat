import { useState, useEffect } from 'react'
import { Check, Crown, Zap, Shield, X } from 'lucide-react'
import { Button } from './ui/button'
import { useWeb3 } from '../contexts/Web3Context'
import { useToast } from '../contexts/ToastContext'
import { subscriptionService, SUBSCRIPTION_PLANS } from '../services/SubscriptionService'

const SubscriptionPage = () => {
  const { account } = useWeb3()
  const { success, info } = useToast()
  const [currentPlan, setCurrentPlan] = useState(SUBSCRIPTION_PLANS.FREE)
  const [subscriptionInfo, setSubscriptionInfo] = useState(null)

  useEffect(() => {
    if (account) {
      loadSubscriptionInfo()
    }
  }, [account])

  const loadSubscriptionInfo = () => {
    const info = subscriptionService.getSubscriptionInfo(account)
    setCurrentPlan(info.plan)
    setSubscriptionInfo(info)
  }

  const handleUpgrade = (plan) => {
    // 模拟升级流程
    subscriptionService.setUserPlan(account, plan)
    loadSubscriptionInfo()
    success('Success!', `Upgraded to ${plan} plan`)
  }

  const plans = [
    {
      id: SUBSCRIPTION_PLANS.FREE,
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for personal use',
      features: [
        'Basic chat',
        'Up to 10 members per group',
        'Up to 10MB file size',
        '100MB storage',
        '1000 messages',
        '5 groups',
        '100 contacts',
        '500 messages/day'
      ],
      icon: Shield,
      color: 'gray'
    },
    {
      id: SUBSCRIPTION_PLANS.PRO,
      name: 'Pro',
      price: '$9.99',
      period: '/month',
      description: 'For professionals and teams',
      features: [
        'Everything in Free',
        'Unlimited group members',
        'Up to 100MB file size',
        '10GB storage',
        'Unlimited messages',
        'Unlimited groups',
        'Unlimited contacts',
        'Advanced encryption',
        'Message search',
        'Priority support',
        'Data export',
        'Voice calls',
        'Video calls'
      ],
      icon: Zap,
      color: 'blue',
      popular: true
    },
    {
      id: SUBSCRIPTION_PLANS.ENTERPRISE,
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large organizations',
      features: [
        'Everything in Pro',
        'Unlimited file size',
        'Unlimited storage',
        'Private deployment',
        'Custom development',
        'Dedicated support',
        'SLA guarantee',
        'Training service',
        'Audit logs',
        'Compliance support',
        'Enterprise integration',
        'Unlimited users'
      ],
      icon: Crown,
      color: 'purple'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            Upgrade to unlock premium features
          </p>
        </div>

        {/* Current Plan Info */}
        {subscriptionInfo && (
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Current Plan: {currentPlan.toUpperCase()}</h3>
                <div className="flex gap-6 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Storage:</span>{' '}
                    {subscriptionService.formatSize(subscriptionInfo.used.storage)} / {subscriptionService.formatSize(subscriptionInfo.limits.storage)}
                  </div>
                  <div>
                    <span className="font-medium">Today's Messages:</span>{' '}
                    {subscriptionInfo.used.todayMessages} / {subscriptionInfo.limits.dailyMessages === Infinity ? '∞' : subscriptionInfo.limits.dailyMessages}
                  </div>
                </div>
              </div>
              {currentPlan === SUBSCRIPTION_PLANS.FREE && (
                <Button
                  onClick={() => handleUpgrade(SUBSCRIPTION_PLANS.PRO)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Upgrade Now
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon
            const isCurrentPlan = currentPlan === plan.id
            const isPro = plan.id === SUBSCRIPTION_PLANS.PRO
            
            return (
              <div
                key={plan.id}
                className={`
                  relative bg-white rounded-2xl p-8 shadow-sm
                  ${isPro ? 'ring-2 ring-blue-500 scale-105' : ''}
                  ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}
                  transition-all duration-200
                `}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-4 right-4">
                    <span className="bg-green-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Current
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center mb-4
                  ${plan.color === 'blue' ? 'bg-blue-100' : ''}
                  ${plan.color === 'purple' ? 'bg-purple-100' : ''}
                  ${plan.color === 'gray' ? 'bg-gray-100' : ''}
                `}>
                  <Icon className={`
                    w-6 h-6
                    ${plan.color === 'blue' ? 'text-blue-600' : ''}
                    ${plan.color === 'purple' ? 'text-purple-600' : ''}
                    ${plan.color === 'gray' ? 'text-gray-600' : ''}
                  `} />
                </div>

                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-600 ml-1">
                    {plan.period}
                  </span>
                </div>

                {/* Description */}
                <p className="text-gray-600 mb-6">
                  {plan.description}
                </p>

                {/* CTA Button */}
                {!isCurrentPlan && (
                  <Button
                    onClick={() => {
                      if (plan.id === SUBSCRIPTION_PLANS.ENTERPRISE) {
                        info('Contact Sales', 'Please contact our sales team for enterprise pricing')
                      } else {
                        handleUpgrade(plan.id)
                      }
                    }}
                    className={`
                      w-full mb-6
                      ${isPro ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-900 hover:bg-gray-800 text-white'}
                    `}
                  >
                    {plan.id === SUBSCRIPTION_PLANS.ENTERPRISE ? 'Contact Sales' : 'Upgrade Now'}
                  </Button>
                )}

                {isCurrentPlan && (
                  <div className="w-full mb-6 py-2 text-center text-green-600 font-medium">
                    Current Plan
                  </div>
                )}

                {/* Features List */}
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6">
              <h3 className="font-semibold mb-2">Can I change my plan anytime?</h3>
              <p className="text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6">
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600">
                We accept cryptocurrency payments (ETH, USDT, USDC) and traditional payment methods (credit card, PayPal).
              </p>
            </div>
            <div className="bg-white rounded-xl p-6">
              <h3 className="font-semibold mb-2">Is there a free trial for Pro?</h3>
              <p className="text-gray-600">
                Yes! New users get a 14-day free trial of the Pro plan. No credit card required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubscriptionPage
