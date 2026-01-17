import React, { useState } from 'react';
import { X, CreditCard, Wallet, DollarSign, Lock, Loader2, CheckCircle, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import paymentService from '../services/PaymentService';

/**
 * Payment Dialog Component V2
 * 
 * Enterprise-grade payment dialog with:
 * - Full internationalization support (English/Chinese)
 * - Custodial vs Non-Custodial wallet options
 * - Multiple payment methods (Stripe, Crypto)
 * - Backend API integration
 * 
 * @param {boolean} isOpen - Dialog open state
 * @param {function} onClose - Close callback
 * @param {function} onSuccess - Success callback
 * @param {object} paymentDetails - Payment details (amount, description, recipient)
 */
const PaymentDialogV2 = ({ isOpen, onClose, onSuccess, paymentDetails }) => {
  const { t } = useLanguage();
  
  // State management
  const [walletType, setWalletType] = useState('non-custodial'); // 'custodial' or 'non-custodial'
  const [paymentMethod, setPaymentMethod] = useState('crypto');
  const [amount, setAmount] = useState(paymentDetails?.amount || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // null, 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Wallet type options
   * Custodial: Platform-managed, lower fees, for streaming payments
   * Non-Custodial: Self-custody, direct payments, for small transactions
   */
  const walletTypes = [
    {
      id: 'non-custodial',
      name: t('payment.nonCustodial'),
      icon: <Wallet className="w-5 h-5" />,
      description: t('payment.nonCustodialDescription'),
      recommended: true
    },
    {
      id: 'custodial',
      name: t('payment.custodial'),
      icon: <Shield className="w-5 h-5" />,
      description: t('payment.custodialDescription'),
      recommended: false
    }
  ];

  /**
   * Payment method options
   */
  const paymentMethods = [
    {
      id: 'crypto',
      name: t('payment.cryptocurrency'),
      icon: <Wallet className="w-5 h-5" />,
      description: t('payment.cryptocurrencyDescription'),
      enabled: true
    },
    {
      id: 'stripe',
      name: t('payment.creditCard'),
      icon: <CreditCard className="w-5 h-5" />,
      description: t('payment.creditCardDescription'),
      enabled: true
    }
  ];

  /**
   * Handle payment submission
   * Integrates with backend API
   */
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

      // Prepare payment data
      const paymentData = {
        amount: parseFloat(amount),
        walletType,
        paymentMethod,
        currency: paymentMethod === 'stripe' ? 'USD' : 'ETH',
        recipient: paymentDetails?.recipient,
        description: paymentDetails?.description
      };

      // Call backend API based on wallet type
      if (walletType === 'custodial') {
        // Custodial wallet: Platform-managed payment
        // Lower fees, suitable for streaming payments
        result = await paymentService.processCustodialPayment(paymentData);
      } else {
        // Non-custodial wallet: Direct payment
        // User controls private keys, suitable for small transactions
        if (paymentMethod === 'stripe') {
          result = await paymentService.mockPayment(
            parseFloat(amount),
            'USD',
            'stripe'
          );
        } else if (paymentMethod === 'crypto') {
          result = await paymentService.mockPayment(
            parseFloat(amount),
            'ETH',
            'crypto'
          );
        }
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
      setErrorMessage(error.message || t('payment.failed'));
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    if (!isProcessing) {
      setWalletType('non-custodial');
      setPaymentMethod('crypto');
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
          <h2 className="text-2xl font-bold text-black">{t('payment.title')}</h2>
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
              <h3 className="text-xl font-bold text-black mb-2">{t('payment.success')}</h3>
              <p className="text-gray-600">
                {t('payment.successMessage')} {paymentService.formatAmount(parseFloat(amount))}
              </p>
            </div>
          ) : (
            /* Payment Form */
            <>
              {/* Payment Details */}
              {paymentDetails && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-black mb-2">{t('payment.paymentDetails')}</h3>
                  {paymentDetails.description && (
                    <p className="text-sm text-gray-600 mb-2">{paymentDetails.description}</p>
                  )}
                  {paymentDetails.recipient && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">{t('payment.recipient')}:</span> {paymentDetails.recipient}
                    </p>
                  )}
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  {t('payment.amount')}
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

              {/* Wallet Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('payment.walletType')}
                </label>
                <div className="space-y-3">
                  {walletTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setWalletType(type.id)}
                      disabled={isProcessing}
                      className={`w-full flex items-center space-x-3 p-4 rounded-lg border-2 transition-all relative ${
                        walletType === type.id
                          ? 'border-black bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {type.recommended && (
                        <div className="absolute top-2 right-2">
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                            Recommended
                          </span>
                        </div>
                      )}
                      <div className={walletType === type.id ? 'text-black' : 'text-gray-600'}>
                        {type.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className={`font-medium ${
                          walletType === type.id ? 'text-black' : 'text-gray-700'
                        }`}>
                          {type.name}
                        </div>
                        <div className="text-sm text-gray-500">{type.description}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        walletType === type.id
                          ? 'border-black'
                          : 'border-gray-300'
                      }`}>
                        {walletType === type.id && (
                          <div className="w-3 h-3 bg-black rounded-full" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('payment.paymentMethod')}
                </label>
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      disabled={isProcessing || !method.enabled}
                      className={`w-full flex items-center space-x-3 p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === method.id
                          ? 'border-black bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${!method.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                <p>{t('payment.securityNotice')}</p>
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
              {t('payment.cancel')}
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isProcessing || !amount || parseFloat(amount) <= 0}
              className="px-8 bg-black text-white hover:bg-gray-800"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('payment.processing')}
                </>
              ) : (
                <>
                  {t('payment.pay')} {amount ? paymentService.formatAmount(parseFloat(amount)) : '$0.00'}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentDialogV2;
