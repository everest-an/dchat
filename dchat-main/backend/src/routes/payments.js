/**
 * Payment Routes
 * Express routes for payment processing via Stripe and cryptocurrency
 */

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');

// Payment configuration
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// In-memory storage for payment records (use database in production)
const paymentRecords = new Map();
const subscriptions = new Map();

/**
 * POST /api/payments/create-intent
 * Create a payment intent for Stripe
 */
router.post('/create-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', metadata = {} } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        ...metadata,
        userId: req.user?.id || 'guest',
        timestamp: new Date().toISOString()
      },
      automatic_payment_methods: {
        enabled: true
      }
    });

    // Store payment record
    paymentRecords.set(paymentIntent.id, {
      id: paymentIntent.id,
      amount,
      currency,
      status: 'pending',
      metadata,
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create payment intent'
    });
  }
});

/**
 * POST /api/payments/create-checkout
 * Create a Stripe checkout session
 */
router.post('/create-checkout', async (req, res) => {
  try {
    const { items, successUrl, cancelUrl, mode = 'payment' } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No items provided'
      });
    }

    // Convert items to Stripe line items
    const lineItems = items.map(item => ({
      price_data: {
        currency: item.currency || 'usd',
        product_data: {
          name: item.name,
          description: item.description,
          images: item.images || []
        },
        unit_amount: Math.round(item.price * 100) // Convert to cents
      },
      quantity: item.quantity || 1
    }));

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: mode,
      success_url: successUrl || `${FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${FRONTEND_URL}/payment/cancel`,
      metadata: {
        userId: req.user?.id || 'guest',
        timestamp: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create checkout session'
    });
  }
});

/**
 * POST /api/payments/create-subscription
 * Create a subscription
 */
router.post('/create-subscription', async (req, res) => {
  try {
    const { priceId, customerId, metadata = {} } = req.body;

    if (!priceId) {
      return res.status(400).json({
        success: false,
        error: 'Price ID is required'
      });
    }

    // Create or retrieve customer
    let customer;
    if (customerId) {
      customer = await stripe.customers.retrieve(customerId);
    } else {
      customer = await stripe.customers.create({
        metadata: {
          userId: req.user?.id || 'guest'
        }
      });
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata
    });

    // Store subscription record
    subscriptions.set(subscription.id, {
      id: subscription.id,
      customerId: customer.id,
      priceId,
      status: subscription.status,
      metadata,
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      customerId: customer.id
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create subscription'
    });
  }
});

/**
 * POST /api/payments/cancel-subscription
 * Cancel a subscription
 */
router.post('/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Subscription ID is required'
      });
    }

    // Cancel subscription
    const subscription = await stripe.subscriptions.cancel(subscriptionId);

    // Update subscription record
    if (subscriptions.has(subscriptionId)) {
      const record = subscriptions.get(subscriptionId);
      record.status = 'canceled';
      record.canceledAt = new Date().toISOString();
    }

    res.json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel subscription'
    });
  }
});

/**
 * POST /api/payments/refund
 * Create a refund
 */
router.post('/refund', async (req, res) => {
  try {
    const { paymentIntentId, amount, reason } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID is required'
      });
    }

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Partial or full refund
      reason: reason || 'requested_by_customer'
    });

    // Update payment record
    if (paymentRecords.has(paymentIntentId)) {
      const record = paymentRecords.get(paymentIntentId);
      record.refunded = true;
      record.refundId = refund.id;
      record.refundedAt = new Date().toISOString();
    }

    res.json({
      success: true,
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount / 100
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process refund'
    });
  }
});

/**
 * GET /api/payments/history
 * Get payment history
 */
router.get('/history', async (req, res) => {
  try {
    const { limit = 10, startingAfter } = req.query;

    // Get payment intents from Stripe
    const paymentIntents = await stripe.paymentIntents.list({
      limit: parseInt(limit),
      starting_after: startingAfter
    });

    const history = paymentIntents.data.map(pi => ({
      id: pi.id,
      amount: pi.amount / 100,
      currency: pi.currency,
      status: pi.status,
      created: new Date(pi.created * 1000).toISOString(),
      metadata: pi.metadata
    }));

    res.json({
      success: true,
      payments: history,
      hasMore: paymentIntents.has_more
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get payment history'
    });
  }
});

/**
 * GET /api/payments/subscription/:id
 * Get subscription details
 */
router.get('/subscription/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await stripe.subscriptions.retrieve(id);

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        metadata: subscription.metadata
      }
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get subscription'
    });
  }
});

/**
 * POST /api/payments/webhook
 * Handle Stripe webhooks
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );

    // Handle event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);
        
        // Update payment record
        if (paymentRecords.has(paymentIntent.id)) {
          const record = paymentRecords.get(paymentIntent.id);
          record.status = 'succeeded';
          record.completedAt = new Date().toISOString();
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log('Payment failed:', failedPayment.id);
        
        // Update payment record
        if (paymentRecords.has(failedPayment.id)) {
          const record = paymentRecords.get(failedPayment.id);
          record.status = 'failed';
          record.failedAt = new Date().toISOString();
        }
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id);
        
        // Update subscription record
        if (subscriptions.has(subscription.id)) {
          const record = subscriptions.get(subscription.id);
          record.status = subscription.status;
          record.updatedAt = new Date().toISOString();
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        console.log('Subscription deleted:', deletedSubscription.id);
        
        // Update subscription record
        if (subscriptions.has(deletedSubscription.id)) {
          const record = subscriptions.get(deletedSubscription.id);
          record.status = 'deleted';
          record.deletedAt = new Date().toISOString();
        }
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

/**
 * POST /api/payments/crypto/create
 * Create cryptocurrency payment address
 */
router.post('/crypto/create', async (req, res) => {
  try {
    const { amount, currency, cryptocurrency = 'ETH' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    // Generate unique payment ID
    const paymentId = crypto.randomBytes(16).toString('hex');

    // Mock cryptocurrency address (in production, use actual wallet generation)
    const mockAddresses = {
      ETH: '0x' + crypto.randomBytes(20).toString('hex'),
      BTC: '1' + crypto.randomBytes(20).toString('hex'),
      USDT: '0x' + crypto.randomBytes(20).toString('hex')
    };

    const address = mockAddresses[cryptocurrency] || mockAddresses.ETH;

    // Store payment record
    paymentRecords.set(paymentId, {
      id: paymentId,
      type: 'crypto',
      amount,
      currency,
      cryptocurrency,
      address,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    });

    res.json({
      success: true,
      paymentId,
      address,
      amount,
      cryptocurrency,
      expiresAt: paymentRecords.get(paymentId).expiresAt
    });
  } catch (error) {
    console.error('Create crypto payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create crypto payment'
    });
  }
});

/**
 * GET /api/payments/crypto/status/:id
 * Check cryptocurrency payment status
 */
router.get('/crypto/status/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const payment = paymentRecords.get(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // In production, check blockchain for actual transaction
    // For now, return mock status
    res.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        cryptocurrency: payment.cryptocurrency,
        address: payment.address,
        createdAt: payment.createdAt,
        expiresAt: payment.expiresAt
      }
    });
  } catch (error) {
    console.error('Get crypto payment status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get payment status'
    });
  }
});

module.exports = router;
