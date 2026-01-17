/**
 * Subscription Service
 * Handles subscription management, plan changes, and usage tracking
 */

const { createClient } = require('@supabase/supabase-js');

// Subscription plans configuration
const PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    limits: {
      groupMembers: 10,
      fileSize: 10 * 1024 * 1024, // 10MB
      storage: 100 * 1024 * 1024, // 100MB
      messages: 1000,
      groups: 5,
      contacts: 100,
      dailyMessages: 500
    },
    features: []
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    limits: {
      groupMembers: Infinity,
      fileSize: 100 * 1024 * 1024, // 100MB
      storage: 10 * 1024 * 1024 * 1024, // 10GB
      messages: Infinity,
      groups: Infinity,
      contacts: Infinity,
      dailyMessages: Infinity
    },
    features: [
      'advanced_encryption',
      'priority_support',
      'message_search',
      'voice_call',
      'video_call',
      'data_export'
    ]
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: null, // Custom pricing
    limits: {
      groupMembers: Infinity,
      fileSize: Infinity,
      storage: Infinity,
      messages: Infinity,
      groups: Infinity,
      contacts: Infinity,
      dailyMessages: Infinity
    },
    features: [
      'advanced_encryption',
      'priority_support',
      'message_search',
      'voice_call',
      'video_call',
      'data_export',
      'private_deployment',
      'custom_development',
      'dedicated_support',
      'sla_guarantee',
      'training_service',
      'audit_logs',
      'compliance',
      'integration',
      'unlimited_users'
    ]
  }
};

class SubscriptionService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  /**
   * Get user's current subscription
   */
  async getSubscription(userId) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw error;
    }

    // If no subscription exists, create a free one
    if (!data) {
      return await this.createFreeSubscription(userId);
    }

    return data;
  }

  /**
   * Create a free subscription for new user
   */
  async createFreeSubscription(userId, walletAddress) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        wallet_address: walletAddress,
        plan: 'free',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString() // 100 years
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update subscription plan
   */
  async updateSubscription(userId, updates) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId, cancelAtPeriodEnd = true) {
    const updates = cancelAtPeriodEnd
      ? { cancel_at_period_end: true }
      : { status: 'cancelled', cancel_at_period_end: false };

    return await this.updateSubscription(userId, updates);
  }

  /**
   * Resume cancelled subscription
   */
  async resumeSubscription(userId) {
    return await this.updateSubscription(userId, {
      cancel_at_period_end: false,
      status: 'active'
    });
  }

  /**
   * Get plan limits
   */
  getPlanLimits(planId) {
    const plan = Object.values(PLANS).find(p => p.id === planId);
    return plan ? plan.limits : PLANS.FREE.limits;
  }

  /**
   * Get plan features
   */
  getPlanFeatures(planId) {
    const plan = Object.values(PLANS).find(p => p.id === planId);
    return plan ? plan.features : [];
  }

  /**
   * Check if user has feature access
   */
  async hasFeature(userId, featureKey) {
    const subscription = await this.getSubscription(userId);
    const features = this.getPlanFeatures(subscription.plan);
    return features.includes(featureKey);
  }

  /**
   * Check if user can perform action based on limits
   */
  async checkLimit(userId, limitType, currentValue) {
    const subscription = await this.getSubscription(userId);
    const limits = this.getPlanLimits(subscription.plan);
    const limit = limits[limitType];
    
    if (limit === Infinity) return true;
    return currentValue < limit;
  }

  /**
   * Get or create today's usage stats
   */
  async getTodayUsage(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await this.supabase
      .from('usage_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error && error.code === 'PGRST116') {
      // Create new usage record for today
      const subscription = await this.getSubscription(userId);
      const { data: newData, error: insertError } = await this.supabase
        .from('usage_stats')
        .insert({
          user_id: userId,
          wallet_address: subscription.wallet_address,
          date: today,
          messages_sent: 0,
          storage_used: 0,
          groups_created: 0,
          contacts_added: 0,
          files_uploaded: 0,
          api_calls: 0
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return newData;
    }

    if (error) throw error;
    return data;
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(userId, field, amount = 1) {
    const usage = await this.getTodayUsage(userId);
    
    const { data, error } = await this.supabase
      .from('usage_stats')
      .update({
        [field]: usage[field] + amount
      })
      .eq('id', usage.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Check daily message limit
   */
  async canSendMessage(userId) {
    const subscription = await this.getSubscription(userId);
    const limits = this.getPlanLimits(subscription.plan);
    
    if (limits.dailyMessages === Infinity) return true;
    
    const usage = await this.getTodayUsage(userId);
    return usage.messages_sent < limits.dailyMessages;
  }

  /**
   * Check storage limit
   */
  async hasStorageSpace(userId, additionalBytes) {
    const subscription = await this.getSubscription(userId);
    const limits = this.getPlanLimits(subscription.plan);
    
    if (limits.storage === Infinity) return true;
    
    const usage = await this.getTodayUsage(userId);
    return (usage.storage_used + additionalBytes) <= limits.storage;
  }

  /**
   * Record payment transaction
   */
  async recordTransaction(transactionData) {
    const { data, error } = await this.supabase
      .from('payment_transactions')
      .insert(transactionData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get user's payment history
   */
  async getPaymentHistory(userId, limit = 10) {
    const { data, error } = await this.supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats() {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('plan, status, count')
      .group('plan, status');

    if (error) throw error;
    return data;
  }
}

module.exports = {
  SubscriptionService,
  PLANS
};
