/**
 * Payment Service
 * Handles payments via Stripe and cryptocurrency
 */

class PaymentService {
  constructor() {
    this.stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    this.apiEndpoint = import.meta.env.VITE_API_ENDPOINT || '/api';
    this.stripe = null;
  }

  /**
   * Initialize Stripe
   */
  async initializeStripe() {
    if (this.stripe) return this.stripe;

    if (!window.Stripe) {
      throw new Error('Stripe.js not loaded');
    }

    this.stripe = window.Stripe(this.stripePublicKey);
    return this.stripe;
  }

  /**
   * Create payment intent for Stripe
   */
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      const response = await fetch(`${this.apiEndpoint}/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          amount,
          currency,
          metadata
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create payment intent error:', error);
      throw error;
    }
  }

  /**
   * Process Stripe payment
   */
  async processStripePayment(paymentMethodId, amount, currency = 'usd', metadata = {}) {
    try {
      // Create payment intent
      const { clientSecret, paymentIntentId } = await this.createPaymentIntent(
        amount,
        currency,
        metadata
      );

      // Initialize Stripe
      await this.initializeStripe();

      // Confirm payment
      const result = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethodId
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return {
        success: true,
        paymentIntentId: result.paymentIntent.id,
        status: result.paymentIntent.status
      };
    } catch (error) {
      console.error('Stripe payment error:', error);
      throw error;
    }
  }

  /**
   * Create Stripe checkout session
   */
  async createCheckoutSession(items, successUrl, cancelUrl) {
    try {
      const response = await fetch(`${this.apiEndpoint}/payments/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          items,
          successUrl,
          cancelUrl
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      await this.initializeStripe();
      const result = await this.stripe.redirectToCheckout({ sessionId });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return { success: true };
    } catch (error) {
      console.error('Checkout session error:', error);
      throw error;
    }
  }

  /**
   * Process cryptocurrency payment
   */
  async processCryptoPayment(amount, currency, recipientAddress, metadata = {}) {
    try {
      // Check if Web3 wallet is connected
      if (!window.ethereum) {
        throw new Error('No Web3 wallet detected');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const fromAddress = accounts[0];

      // Convert amount to Wei (for Ethereum)
      const amountInWei = this.convertToWei(amount, currency);

      // Create transaction
      const transactionParameters = {
        from: fromAddress,
        to: recipientAddress,
        value: amountInWei.toString(16),
        gas: '0x5208', // 21000 gas
      };

      // Send transaction
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters]
      });

      // Record transaction
      await this.recordTransaction({
        txHash,
        from: fromAddress,
        to: recipientAddress,
        amount,
        currency,
        type: 'crypto',
        metadata
      });

      return {
        success: true,
        txHash,
        from: fromAddress,
        to: recipientAddress,
        amount
      };
    } catch (error) {
      console.error('Crypto payment error:', error);
      throw error;
    }
  }

  /**
   * Convert amount to Wei
   */
  convertToWei(amount, currency) {
    // Simple conversion (in production, use proper conversion rates)
    const ethAmount = currency === 'ETH' ? amount : amount / 2000; // Assume 1 ETH = $2000
    return Math.floor(ethAmount * 1e18); // Convert to Wei
  }

  /**
   * Create escrow payment
   */
  async createEscrow(amount, currency, recipientId, projectId, terms) {
    try {
      const response = await fetch(`${this.apiEndpoint}/payments/create-escrow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          amount,
          currency,
          recipientId,
          projectId,
          terms
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create escrow');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create escrow error:', error);
      throw error;
    }
  }

  /**
   * Release escrow payment
   */
  async releaseEscrow(escrowId) {
    try {
      const response = await fetch(`${this.apiEndpoint}/payments/release-escrow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ escrowId })
      });

      if (!response.ok) {
        throw new Error('Failed to release escrow');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Release escrow error:', error);
      throw error;
    }
  }

  /**
   * Record transaction in backend
   */
  async recordTransaction(transactionData) {
    try {
      const response = await fetch(`${this.apiEndpoint}/payments/record-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(transactionData)
      });

      if (!response.ok) {
        throw new Error('Failed to record transaction');
      }

      return await response.json();
    } catch (error) {
      console.error('Record transaction error:', error);
      throw error;
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(
        `${this.apiEndpoint}/payments/history?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }

      return await response.json();
    } catch (error) {
      console.error('Get payment history error:', error);
      throw error;
    }
  }

  /**
   * Mock payment for development
   */
  async mockPayment(amount, currency, paymentMethod = 'stripe') {
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Random success/failure for testing
    const success = Math.random() > 0.1; // 90% success rate

    if (!success) {
      throw new Error('Payment failed (mock error)');
    }

    return {
      success: true,
      transactionId: 'mock_' + Math.random().toString(36).substr(2, 9),
      amount,
      currency,
      paymentMethod,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format currency amount
   */
  formatAmount(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Validate payment amount
   */
  validateAmount(amount, minAmount = 1, maxAmount = 1000000) {
    const errors = [];

    if (isNaN(amount) || amount <= 0) {
      errors.push('Amount must be a positive number');
    }

    if (amount < minAmount) {
      errors.push(`Amount must be at least ${this.formatAmount(minAmount)}`);
    }

    if (amount > maxAmount) {
      errors.push(`Amount cannot exceed ${this.formatAmount(maxAmount)}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
const paymentService = new PaymentService();
export default paymentService;
