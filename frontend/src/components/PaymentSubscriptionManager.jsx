/**
 * Payment Subscription Manager Component
 * Manages paid subscriptions (different from Web3 SubscriptionManager)
 * Handles Stripe subscriptions with upgrade, downgrade, and cancel options
 */

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Check, X, Zap, Crown, Star, 
  Calendar, DollarSign, AlertCircle, Loader 
} from 'lucide-react';

const PaymentSubscriptionManager = () => {
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      interval: 'forever',
      icon: Star,
      features: [
        'Basic messaging',
        'Up to 100 contacts',
        '1 GB storage',
        'Community support'
      ],
      limitations: [
        'No file sharing',
        'No voice/video calls',
        'No priority support'
      ]
    },
    {
      id: 'pro',
      name: 'Professional',
      price: 9.99,
      interval: 'month',
      icon: Zap,
      popular: true,
      features: [
        'Everything in Free',
        'Unlimited contacts',
        '10 GB storage',
        'File sharing (up to 100MB)',
        'Voice & video calls',
        'Priority support',
        'Advanced analytics'
      ],
      limitations: []
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 29.99,
      interval: 'month',
      icon: Crown,
      features: [
        'Everything in Professional',
        'Unlimited storage',
        'File sharing (up to 1GB)',
        'Custom branding',
        'Dedicated support',
        'Advanced security',
        'API access',
        'Team collaboration tools'
      ],
      limitations: []
    }
  ];

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual API call
      // const response = await fetch('/api/payments/subscription/current');
      // const data = await response.json();

      // Mock current subscription
      setCurrentSubscription({
        id: 'sub_123',
        planId: 'free',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      console.error('Failed to load subscription:', error);
      setError('Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    try {
      setProcessing(true);
      setError(null);

      // Create subscription
      const response = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          priceId: `price_${planId}`, // In production, use actual Stripe price IDs
          metadata: {
            planId
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to payment or show success
        alert('Subscription created successfully!');
        loadSubscription();
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      setError(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const response = await fetch('/api/payments/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          subscriptionId: currentSubscription.id
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Subscription cancelled successfully');
        loadSubscription();
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Cancel error:', error);
      setError(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getCurrentPlan = () => {
    if (!currentSubscription) return plans[0];
    return plans.find(p => p.id === currentSubscription.planId) || plans[0];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading subscription...</span>
      </div>
    );
  }

  const currentPlan = getCurrentPlan();

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Current Subscription */}
      {currentSubscription && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Current Subscription</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                {React.createElement(currentPlan.icon, { className: "w-8 h-8 text-blue-600" })}
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{currentPlan.name}</h4>
                <p className="text-gray-600">
                  {currentPlan.price === 0 ? (
                    'Free forever'
                  ) : (
                    `$${currentPlan.price}/${currentPlan.interval}`
                  )}
                </p>
                {currentSubscription.status === 'active' && currentSubscription.currentPeriodEnd && (
                  <p className="text-sm text-gray-500 mt-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Renews on {formatDate(currentSubscription.currentPeriodEnd)}
                  </p>
                )}
              </div>
            </div>
            {currentPlan.id !== 'free' && (
              <button
                onClick={handleCancel}
                disabled={processing}
                className="text-red-600 hover:text-red-700 px-4 py-2 rounded-lg border border-red-300 hover:border-red-400 transition-colors disabled:opacity-50"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Available Plans</h3>
        <p className="text-gray-600 mb-6">Choose the plan that's right for you</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentPlan.id === plan.id;
            const Icon = plan.icon;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                  plan.popular ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                    POPULAR
                  </div>
                )}

                {/* Plan Header */}
                <div className="p-6 text-center border-b border-gray-200">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h4>
                  <div className="text-4xl font-bold text-gray-900 mb-1">
                    ${plan.price}
                    {plan.price > 0 && (
                      <span className="text-lg text-gray-600 font-normal">/{plan.interval}</span>
                    )}
                  </div>
                  {plan.price === 0 && (
                    <p className="text-gray-600 text-sm">Forever free</p>
                  )}
                </div>

                {/* Features */}
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                    {plan.limitations.map((limitation, index) => (
                      <li key={index} className="flex items-start">
                        <X className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-500 text-sm">{limitation}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Action Button */}
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full bg-gray-100 text-gray-600 px-6 py-3 rounded-lg font-medium cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={processing}
                      className={`w-full px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                        plan.popular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      {processing ? 'Processing...' : plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Can I change my plan anytime?</h4>
            <p className="text-gray-600 text-sm">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately for upgrades, or at the end of your billing period for downgrades.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">What happens if I cancel?</h4>
            <p className="text-gray-600 text-sm">
              You'll retain access to your paid features until the end of your current billing period. After that, your account will revert to the Free plan.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Do you offer refunds?</h4>
            <p className="text-gray-600 text-sm">
              Yes, we offer a 30-day money-back guarantee for all paid plans. Contact support to request a refund.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSubscriptionManager;
