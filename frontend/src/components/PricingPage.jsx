import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Zap, Crown, Rocket } from 'lucide-react';
import DchatLogo from './DchatLogo';

/**
 * Pricing Page
 * Display subscription plans and pricing information
 */
const PricingPage = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'annual'

  const plans = [
    {
      name: 'Free',
      icon: <Zap className="w-12 h-12" />,
      price: { monthly: 0, annual: 0 },
      description: 'Perfect for individuals getting started',
      features: [
        { name: 'Up to 10 contacts', included: true },
        { name: 'Basic messaging', included: true },
        { name: 'End-to-end encryption', included: true },
        { name: 'File sharing (up to 10MB)', included: true },
        { name: '100 messages/month on blockchain', included: true },
        { name: 'Basic portfolio', included: true },
        { name: 'Group chats (up to 5 members)', included: true },
        { name: 'Community support', included: true },
        { name: 'Advanced encryption', included: false },
        { name: 'Priority support', included: false },
        { name: 'Custom branding', included: false }
      ],
      cta: 'Get Started',
      popular: false,
      color: 'gray'
    },
    {
      name: 'Professional',
      icon: <Crown className="w-12 h-12" />,
      price: { monthly: 29, annual: 290 },
      description: 'For professionals and small teams',
      features: [
        { name: 'Unlimited contacts', included: true },
        { name: 'Unlimited messaging', included: true },
        { name: 'End-to-end encryption', included: true },
        { name: 'File sharing (up to 100MB)', included: true },
        { name: 'Unlimited blockchain messages', included: true },
        { name: 'Advanced portfolio with analytics', included: true },
        { name: 'Group chats (up to 50 members)', included: true },
        { name: 'Priority email support', included: true },
        { name: 'Quantum-resistant encryption', included: true },
        { name: 'LinkedIn integration', included: true },
        { name: 'Opportunity matching', included: true },
        { name: 'Payment escrow', included: true },
        { name: 'Project management', included: true },
        { name: 'Custom branding', included: false },
        { name: 'Dedicated account manager', included: false }
      ],
      cta: 'Start Free Trial',
      popular: true,
      color: 'black'
    },
    {
      name: 'Enterprise',
      icon: <Rocket className="w-12 h-12" />,
      price: { monthly: 'Custom', annual: 'Custom' },
      description: 'For large organizations with custom needs',
      features: [
        { name: 'Everything in Professional', included: true },
        { name: 'Unlimited team members', included: true },
        { name: 'Unlimited file storage', included: true },
        { name: 'Custom blockchain deployment', included: true },
        { name: 'Advanced analytics & reporting', included: true },
        { name: 'Custom integrations', included: true },
        { name: 'White-label solution', included: true },
        { name: 'Dedicated account manager', included: true },
        { name: '24/7 priority support', included: true },
        { name: 'SLA guarantee', included: true },
        { name: 'On-premise deployment option', included: true },
        { name: 'Custom smart contracts', included: true },
        { name: 'Compliance assistance', included: true },
        { name: 'Training & onboarding', included: true }
      ],
      cta: 'Contact Sales',
      popular: false,
      color: 'black'
    }
  ];

  const faqs = [
    {
      question: 'Can I switch plans at any time?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any charges.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, Mastercard, Amex) via Stripe, as well as cryptocurrency payments (ETH, USDC, USDT).'
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes! Professional plan comes with a 14-day free trial. No credit card required. You can cancel anytime during the trial period.'
    },
    {
      question: 'What happens to my data if I cancel?',
      answer: 'You can export all your data before canceling. Messages stored on blockchain remain accessible even after cancellation, as they are permanently stored.'
    },
    {
      question: 'Do you offer discounts for annual billing?',
      answer: 'Yes! Annual billing saves you approximately 17% compared to monthly billing. That\'s 2 months free!'
    },
    {
      question: 'Can I get a refund?',
      answer: 'We offer a 30-day money-back guarantee for all paid plans. If you\'re not satisfied, contact us for a full refund.'
    },
    {
      question: 'What\'s included in Enterprise support?',
      answer: 'Enterprise customers get 24/7 priority support, a dedicated account manager, custom SLA, and direct access to our engineering team.'
    },
    {
      question: 'Are there any hidden fees?',
      answer: 'No hidden fees. The price you see is what you pay. Blockchain transaction fees (gas fees) are separate and depend on network conditions.'
    }
  ];

  const getPrice = (plan) => {
    if (plan.price[billingCycle] === 'Custom') return 'Custom';
    if (plan.price[billingCycle] === 0) return 'Free';
    return `$${plan.price[billingCycle]}`;
  };

  const getSavings = () => {
    const professionalMonthly = plans[1].price.monthly * 12;
    const professionalAnnual = plans[1].price.annual;
    const savings = professionalMonthly - professionalAnnual;
    const percentage = Math.round((savings / professionalMonthly) * 100);
    return { amount: savings, percentage };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DchatLogo size={40} className="text-black" />
              <h1 className="text-2xl font-bold text-black">Dchat</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-black transition-colors font-medium"
              >
                Home
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all duration-300 font-medium"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-black text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Choose the plan that's right for you. All plans include end-to-end encryption and blockchain storage.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4">
            <span className={`text-lg ${billingCycle === 'monthly' ? 'text-white font-bold' : 'text-gray-400'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-16 h-8 bg-gray-700 rounded-full transition-colors hover:bg-gray-600"
            >
              <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${billingCycle === 'annual' ? 'transform translate-x-8' : ''}`} />
            </button>
            <span className={`text-lg ${billingCycle === 'annual' ? 'text-white font-bold' : 'text-gray-400'}`}>
              Annual
            </span>
            {billingCycle === 'annual' && (
              <span className="ml-2 px-3 py-1 bg-green-600 text-white text-sm font-bold rounded-full">
                Save {getSavings().percentage}%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`bg-white rounded-2xl shadow-lg overflow-hidden ${
                plan.popular ? 'ring-4 ring-black transform scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="bg-black text-white text-center py-2 font-bold text-sm">
                  MOST POPULAR
                </div>
              )}
              
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-black">{plan.icon}</div>
                  {plan.popular && <Crown className="w-6 h-6 text-yellow-500" />}
                </div>
                
                <h3 className="text-2xl font-bold text-black mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-bold text-black">{getPrice(plan)}</span>
                    {plan.price[billingCycle] !== 'Custom' && plan.price[billingCycle] !== 0 && (
                      <span className="text-gray-600 ml-2">
                        /{billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                    )}
                  </div>
                  {billingCycle === 'annual' && plan.price.annual !== 'Custom' && plan.price.annual !== 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      ${(plan.price.annual / 12).toFixed(2)}/month billed annually
                    </p>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    if (plan.name === 'Enterprise') {
                      navigate('/contact');
                    } else {
                      navigate('/login');
                    }
                  }}
                  className={`w-full py-3 rounded-full font-bold transition-all duration-300 ${
                    plan.popular
                      ? 'bg-black text-white hover:bg-gray-800'
                      : 'bg-gray-100 text-black hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </button>
                
                <div className="mt-8 space-y-4">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}>
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-black text-center mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            Got questions? We've got answers.
          </p>
          
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-black mb-2">{faq.question}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-black py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of professionals using Dchat for secure business communication
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-10 py-4 bg-white text-black rounded-full hover:bg-gray-100 transition-all duration-300 font-bold text-lg"
          >
            Start Free Trial
          </button>
          <p className="text-sm text-gray-400 mt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <DchatLogo size={32} className="text-white" />
                <span className="text-white font-bold text-lg">Dchat</span>
              </div>
              <p className="text-sm">Secure Business Communication</p>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Product</h5>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => navigate('/features')} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => navigate('/pricing')} className="hover:text-white transition-colors">Pricing</button></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Company</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="https://github.com/everest-an/dchat" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
                <li><button onClick={() => navigate('/contact')} className="hover:text-white transition-colors">Contact</button></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Legal</h5>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privacy</button></li>
                <li><button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Terms</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 Dchat. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;
