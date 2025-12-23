/**
 * Payment Animation Component
 * Provides smooth animations for payment flow states
 */

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Check, X, Loader, Lock, 
  Shield, Zap, DollarSign, ArrowRight 
} from 'lucide-react';

const PaymentAnimation = ({ status, amount, currency = 'USD', onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const steps = [
    { id: 'validating', label: 'Validating payment', icon: Shield },
    { id: 'processing', label: 'Processing transaction', icon: CreditCard },
    { id: 'securing', label: 'Securing payment', icon: Lock },
    { id: 'completing', label: 'Completing...', icon: Zap }
  ];

  useEffect(() => {
    if (status === 'processing') {
      // Simulate step progression
      const interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < steps.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 800);

      return () => clearInterval(interval);
    } else if (status === 'success') {
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
        onComplete && onComplete();
      }, 3000);
    }
  }, [status]);

  const formatAmount = (amt) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amt);
  };

  // Processing state
  if (status === 'processing') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-scaleIn">
          {/* Amount Display */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-4 animate-pulse">
              <DollarSign className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {formatAmount(amount)}
            </h2>
            <p className="text-gray-600">Processing your payment...</p>
          </div>

          {/* Progress Steps */}
          <div className="space-y-4 mb-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div
                  key={step.id}
                  className={`flex items-center space-x-3 transition-all duration-500 ${
                    isActive ? 'scale-105' : 'scale-100'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isCompleted
                        ? 'bg-green-500'
                        : isActive
                        ? 'bg-blue-500 animate-pulse'
                        : 'bg-gray-200'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <Icon
                        className={`w-5 h-5 ${
                          isActive ? 'text-white' : 'text-gray-400'
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium transition-colors duration-300 ${
                        isActive || isCompleted
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                  {isActive && (
                    <Loader className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
              style={{
                width: `${((currentStep + 1) / steps.length) * 100}%`
              }}
            >
              <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>

          {/* Security Badge */}
          <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Secured by Stripe</span>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
        {/* Confetti */}
        {showConfetti && <Confetti />}

        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-scaleIn">
          {/* Success Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-400 to-green-500 rounded-full mb-4 animate-bounceIn">
              <Check className="w-12 h-12 text-white animate-checkmark" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h2>
            <p className="text-gray-600 mb-4">
              Your payment of {formatAmount(amount)} has been processed
            </p>
          </div>

          {/* Success Details */}
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 mb-1">
                  Transaction completed
                </p>
                <p className="text-xs text-green-700">
                  A confirmation email has been sent to your inbox
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => onComplete && onComplete()}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
          >
            <span>Continue</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-shakeX">
          {/* Error Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-red-400 to-red-500 rounded-full mb-4">
              <X className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Failed
            </h2>
            <p className="text-gray-600 mb-4">
              We couldn't process your payment
            </p>
          </div>

          {/* Error Details */}
          <div className="bg-red-50 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 mb-1">
                  Transaction declined
                </p>
                <p className="text-xs text-red-700">
                  Please check your payment details and try again
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => onComplete && onComplete('retry')}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300"
            >
              Try Again
            </button>
            <button
              onClick={() => onComplete && onComplete('cancel')}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium transition-all duration-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Confetti Component
const Confetti = () => {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: colors[Math.floor(Math.random() * colors.length)]
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-2 h-2 animate-confetti"
          style={{
            left: `${piece.left}%`,
            top: '-10px',
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`
          }}
        />
      ))}
    </div>
  );
};

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scaleIn {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  @keyframes bounceIn {
    0% { transform: scale(0); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
  @keyframes checkmark {
    0% { stroke-dashoffset: 100; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes shakeX {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
    20%, 40%, 60%, 80% { transform: translateX(10px); }
  }
  @keyframes confetti {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
  .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
  .animate-bounceIn { animation: bounceIn 0.6s ease-out; }
  .animate-checkmark { animation: checkmark 0.5s ease-out 0.2s both; }
  .animate-shakeX { animation: shakeX 0.5s ease-out; }
  .animate-confetti { animation: confetti 3s ease-out forwards; }
  .animate-shimmer { animation: shimmer 2s infinite; }
`;
document.head.appendChild(style);

export default PaymentAnimation;
