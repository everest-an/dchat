/**
 * Subscription Controller
 * Handles HTTP requests for subscription management
 */

const { SubscriptionService, PLANS } = require('../../services/subscription/SubscriptionService');
const StripeService = require('../../services/subscription/StripeService');

const subscriptionService = new SubscriptionService();
const stripeService = new StripeService();

/**
 * Get current user's subscription
 */
exports.getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const subscription = await subscriptionService.getSubscription(userId);
    
    // Get usage stats
    const usage = await subscriptionService.getTodayUsage(userId);
    const limits = subscriptionService.getPlanLimits(subscription.plan);
    const features = subscriptionService.getPlanFeatures(subscription.plan);

    res.json({
      subscription,
      usage,
      limits,
      features
    });
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
};

/**
 * Get available plans
 */
exports.getPlans = async (req, res) => {
  try {
    res.json({ plans: Object.values(PLANS) });
  } catch (error) {
    console.error('Error getting plans:', error);
    res.status(500).json({ error: 'Failed to get plans' });
  }
};

/**
 * Create checkout session
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const walletAddress = req.user.walletAddress;
    const { planId } = req.body;

    // Validate plan
    const plan = Object.values(PLANS).find(p => p.id === planId);
    if (!plan || !plan.stripePriceId) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const successUrl = `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/subscription`;

    const session = await stripeService.createCheckoutSession(
      userId,
      walletAddress,
      plan.stripePriceId,
      successUrl,
      cancelUrl
    );

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

/**
 * Create customer portal session
 */
exports.createPortalSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const returnUrl = `${process.env.FRONTEND_URL}/subscription`;

    const session = await stripeService.createPortalSession(userId, returnUrl);

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
};

/**
 * Cancel subscription
 */
exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { immediate } = req.body;

    if (immediate) {
      await stripeService.cancelSubscriptionNow(userId);
    } else {
      await subscriptionService.cancelSubscription(userId, true);
    }

    const subscription = await subscriptionService.getSubscription(userId);
    res.json({ subscription });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

/**
 * Resume subscription
 */
exports.resumeSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const subscription = await subscriptionService.resumeSubscription(userId);
    
    res.json({ subscription });
  } catch (error) {
    console.error('Error resuming subscription:', error);
    res.status(500).json({ error: 'Failed to resume subscription' });
  }
};

/**
 * Get usage statistics
 */
exports.getUsage = async (req, res) => {
  try {
    const userId = req.user.id;
    const usage = await subscriptionService.getTodayUsage(userId);
    const subscription = await subscriptionService.getSubscription(userId);
    const limits = subscriptionService.getPlanLimits(subscription.plan);

    res.json({ usage, limits });
  } catch (error) {
    console.error('Error getting usage:', error);
    res.status(500).json({ error: 'Failed to get usage' });
  }
};

/**
 * Get payment history
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    
    const transactions = await subscriptionService.getPaymentHistory(userId, limit);
    
    res.json({ transactions });
  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
};

/**
 * Check feature access
 */
exports.checkFeature = async (req, res) => {
  try {
    const userId = req.user.id;
    const { feature } = req.params;
    
    const hasAccess = await subscriptionService.hasFeature(userId, feature);
    
    res.json({ hasAccess, feature });
  } catch (error) {
    console.error('Error checking feature:', error);
    res.status(500).json({ error: 'Failed to check feature' });
  }
};

/**
 * Stripe webhook handler
 */
exports.handleStripeWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const payload = req.body;

    // Verify webhook signature
    const event = stripeService.verifyWebhookSignature(payload, signature);

    // Handle the event
    await stripeService.handleWebhook(event);

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
};

/**
 * Increment usage (internal API)
 */
exports.incrementUsage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { field, amount } = req.body;

    const usage = await subscriptionService.incrementUsage(userId, field, amount || 1);
    
    res.json({ usage });
  } catch (error) {
    console.error('Error incrementing usage:', error);
    res.status(500).json({ error: 'Failed to increment usage' });
  }
};

/**
 * Check if user can send message
 */
exports.canSendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const canSend = await subscriptionService.canSendMessage(userId);
    
    if (!canSend) {
      const subscription = await subscriptionService.getSubscription(userId);
      const limits = subscriptionService.getPlanLimits(subscription.plan);
      return res.status(403).json({
        error: 'Daily message limit reached',
        limit: limits.dailyMessages,
        upgrade: subscription.plan === 'free' ? 'pro' : null
      });
    }

    res.json({ canSend: true });
  } catch (error) {
    console.error('Error checking message limit:', error);
    res.status(500).json({ error: 'Failed to check message limit' });
  }
};

/**
 * Check storage space
 */
exports.checkStorage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bytes } = req.body;

    const hasSpace = await subscriptionService.hasStorageSpace(userId, bytes);
    
    if (!hasSpace) {
      const subscription = await subscriptionService.getSubscription(userId);
      const limits = subscriptionService.getPlanLimits(subscription.plan);
      const usage = await subscriptionService.getTodayUsage(userId);
      
      return res.status(403).json({
        error: 'Storage limit exceeded',
        used: usage.storage_used,
        limit: limits.storage,
        upgrade: subscription.plan === 'free' ? 'pro' : 'enterprise'
      });
    }

    res.json({ hasSpace: true });
  } catch (error) {
    console.error('Error checking storage:', error);
    res.status(500).json({ error: 'Failed to check storage' });
  }
};
