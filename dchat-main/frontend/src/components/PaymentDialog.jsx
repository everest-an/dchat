import React, { useState } from 'react';
import { X, CreditCard, Wallet, DollarSign, Lock, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import paymentService from '../services/PaymentService';

/**
 * Payment Dialog Component
 * Handles payment processing via Stripe and cryptocurrency
 */
const PaymentDialog = ({ isOpen, onClose, onSuccess, paymentDetails }) => {
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [amount, setAmount] = useState(paymentDetails?.amount || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // null, 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const paymentMethods = [
    {
      id: 'stripe',
      name: 'Credit/Debit Card',
      icon: <CreditCard className="w-5 h-5" />,
      description: 'Pay with Visa, Mastercard, or Amex'
    },
    {
      id: 'crypto',
      name: 'Cryptocurrency',
      icon: <Wallet className="w-5 h-5" />,
      description: 'Pay with ETH, USDC, or USDT'
    }
  ];

  const handlePayment = async () => {
    // Validate amount
    const validation = paymentService.validateAmount(parseFloat(amount));
    if (!validation.valid) {
      setErrorMessage(validation.errors.join(', '));
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      let result;

      if (paymentMethod === 'stripe') {
        // Mock Stripe payment for development
        result = await paymentService.mockPayment(
          parseFloat(amount),
          'USD',
          'stripe'
        );
      } else if (paymentMethod === 'crypto') {
        // Mock crypto payment for development
        result = await paymentService.mockPayment(
          parseFloat(amount),
          'ETH',
          'crypto'
        );
      }

      if (result.success) {
        setPaymentStatus('success');
        setTimeout(() => {
          onSuccess(result);
          handleClose();
        }, 2000);
      }
    } catch (error) {
      setPaymentStatus('error');
      setErrorMessage(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setPaymentMethod('stripe');
      setAmount(paymentDetails?.amount || '');
      setPaymentStatus(null);
      setErrorMessage('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-black">Payment</h2>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {paymentStatus === 'success' ? (
            /* Success State */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-black mb-2">Payment Successful!</h3>
              <p className="text-gray-600">
                Your payment of {paymentService.formatAmount(parseFloat(amount))} has been processed.
              </p>
            </div>
          ) : (
            /* Payment Form */
            <>
              {/* Payment Details */}
              {paymentDetails && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-black mb-2">Payment Details</h3>
                  {paymentDetails.description && (
                    <p className="text-sm text-gray-600 mb-2">{paymentDetails.description}</p>
                  )}
                  {paymentDetails.recipient && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Recipient:</span> {paymentDetails.recipient}
                    </p>
                  )}
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Amount
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isProcessing || paymentDetails?.amount}
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-lg font-semibold"
                />
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Method
                </label>
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      disabled={isProcessing}
                      className={`w-full flex items-center space-x-3 p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === method.id
                          ? 'border-black bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={paymentMethod === method.id ? 'text-black' : 'text-gray-600'}>
                        {method.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className={`font-medium ${
                          paymentMethod === method.id ? 'text-black' : 'text-gray-700'
                        }`}>
                          {method.name}
                        </div>
                        <div className="text-sm text-gray-500">{method.description}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === method.id
                          ? 'border-black'
                          : 'border-gray-300'
                      }`}>
                        {paymentMethod === method.id && (
                          <div className="w-3 h-3 bg-black rounded-full" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              )}

              {/* Security Notice */}
              <div className="flex items-start space-x-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  Your payment information is encrypted and secure. We never store your card details.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {paymentStatus !== 'success' && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <Button
              onClick={handleClose}
              disabled={isProcessing}
              variant="outline"
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isProcessing || !amount || parseFloat(amount) <= 0}
              className="px-8 bg-black text-white hover:bg-gray-800"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Pay {amount ? paymentService.formatAmount(parseFloat(amount)) : '$0.00'}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentDialog;
