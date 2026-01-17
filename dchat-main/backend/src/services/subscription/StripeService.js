/**
 * Stripe Payment Service
 * Handles Stripe checkout, webhooks, and subscription management
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { SubscriptionService } = require('./SubscriptionService');

class StripeService {
  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  /**
   * Create Stripe checkout session for subscription
   */
  async createCheckoutSession(userId, walletAddress, priceId, successUrl, cancelUrl) {
    try {
      // Get or create Stripe customer
      const customer = await this.getOrCreateCustomer(userId, walletAddress);

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: userId,
          wallet_address: walletAddress
        },
        subscription_data: {
          metadata: {
            user_id: userId,
            wallet_address: walletAddress
          },
          trial_period_days: 14 // 14-day free trial
        }
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Get or create Stripe customer
   */
  async getOrCreateCustomer(userId, walletAddress, email = null) {
    try {
      // Check if customer already exists in our database
      const subscription = await this.subscriptionService.getSubscription(userId);
      
      if (subscription.stripe_customer_id) {
        // Retrieve existing customer
        const customer = await stripe.customers.retrieve(subscription.stripe_customer_id);
        return customer;
      }

      // Create new customer
      const customer = await stripe.customers.create({
        metadata: {
          user_id: userId,
          wallet_address: walletAddress
        },
        email: email
      });

      // Save customer ID to database
      await this.subscriptionService.updateSubscription(userId, {
        stripe_customer_id: customer.id
      });

      return customer;
    } catch (error) {
      console.error('Error getting/creating customer:', error);
      throw error;
    }
  }

  /**
   * Create customer portal session
   */
  async createPortalSession(userId, returnUrl) {
    try {
      const subscription = await this.subscriptionService.getSubscription(userId);
      
      if (!subscription.stripe_customer_id) {
        throw new Error('No Stripe customer found');
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: returnUrl,
      });

      return session;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;

        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  /**
   * Handle checkout session completed
   */
  async handleCheckoutCompleted(session) {
    const userId = session.metadata.user_id;
    const walletAddress = session.metadata.wallet_address;
    
    console.log(`Checkout completed for user ${userId}`);

    // Record transaction
    await this.subscriptionService.recordTransaction({
      user_id: userId,
      wallet_address: walletAddress,
      amount: session.amount_total / 100, // Convert from cents
      currency: session.currency.toUpperCase(),
      status: 'completed',
      payment_method: 'stripe',
      stripe_payment_intent_id: session.payment_intent,
      metadata: { session_id: session.id }
    });
  }

  /**
   * Handle subscription created
   */
  async handleSubscriptionCreated(subscription) {
    const userId = subscription.metadata.user_id;
    const walletAddress = subscription.metadata.wallet_address;

    // Determine plan from price ID
    const plan = this.getPlanFromPriceId(subscription.items.data[0].price.id);

    await this.subscriptionService.updateSubscription(userId, {
      plan: plan,
      status: subscription.status,
      stripe_subscription_id: subscription.id,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
    });

    console.log(`Subscription created for user ${userId}: ${plan}`);
  }

  /**
   * Handle subscription updated
   */
  async handleSubscriptionUpdated(subscription) {
    const userId = subscription.metadata.user_id;

    await this.subscriptionService.updateSubscription(userId, {
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end
    });

    console.log(`Subscription updated for user ${userId}: ${subscription.status}`);
  }

  /**
   * Handle subscription deleted
   */
  async handleSubscriptionDeleted(subscription) {
    const userId = subscription.metadata.user_id;

    // Downgrade to free plan
    await this.subscriptionService.updateSubscription(userId, {
      plan: 'free',
      status: 'cancelled',
      stripe_subscription_id: null
    });

    console.log(`Subscription cancelled for user ${userId}`);
  }

  /**
   * Handle payment succeeded
   */
  async handlePaymentSucceeded(invoice) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata.user_id;
    const walletAddress = subscription.metadata.wallet_address;

    // Record successful payment
    await this.subscriptionService.recordTransaction({
      user_id: userId,
      wallet_address: walletAddress,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      status: 'completed',
      payment_method: 'stripe',
      stripe_payment_intent_id: invoice.payment_intent,
      stripe_invoice_id: invoice.id,
      metadata: { invoice_number: invoice.number }
    });

    console.log(`Payment succeeded for user ${userId}: $${invoice.amount_paid / 100}`);
  }

  /**
   * Handle payment failed
   */
  async handlePaymentFailed(invoice) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata.user_id;
    const walletAddress = subscription.metadata.wallet_address;

    // Update subscription status
    await this.subscriptionService.updateSubscription(userId, {
      status: 'past_due'
    });

    // Record failed payment
    await this.subscriptionService.recordTransaction({
      user_id: userId,
      wallet_address: walletAddress,
      amount: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      status: 'failed',
      payment_method: 'stripe',
      stripe_invoice_id: invoice.id,
      metadata: { error: 'Payment failed' }
    });

    console.log(`Payment failed for user ${userId}`);
  }

  /**
   * Get plan from Stripe price ID
   */
  getPlanFromPriceId(priceId) {
    if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
      return 'pro';
    }
    if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
      return 'enterprise';
    }
    return 'free';
  }

  /**
   * Cancel subscription immediately
   */
  async cancelSubscriptionNow(userId) {
    try {
      const subscription = await this.subscriptionService.getSubscription(userId);
      
      if (!subscription.stripe_subscription_id) {
        throw new Error('No active Stripe subscription');
      }

      await stripe.subscriptions.cancel(subscription.stripe_subscription_id);

      await this.subscriptionService.updateSubscription(userId, {
        plan: 'free',
        status: 'cancelled',
        stripe_subscription_id: null
      });

      return { success: true };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      return event;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw error;
    }
  }
}

module.exports = StripeService;
