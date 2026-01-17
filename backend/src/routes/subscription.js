/**
 * Subscription Routes
 */

const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription/subscriptionController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.get('/plans', subscriptionController.getPlans);

// Protected routes (require authentication)
router.get('/current', authenticate, subscriptionController.getCurrentSubscription);
router.get('/usage', authenticate, subscriptionController.getUsage);
router.get('/payment-history', authenticate, subscriptionController.getPaymentHistory);
router.get('/feature/:feature', authenticate, subscriptionController.checkFeature);

// Subscription management
router.post('/checkout', authenticate, subscriptionController.createCheckoutSession);
router.post('/portal', authenticate, subscriptionController.createPortalSession);
router.post('/cancel', authenticate, subscriptionController.cancelSubscription);
router.post('/resume', authenticate, subscriptionController.resumeSubscription);

// Usage tracking (internal)
router.post('/usage/increment', authenticate, subscriptionController.incrementUsage);
router.post('/check/message', authenticate, subscriptionController.canSendMessage);
router.post('/check/storage', authenticate, subscriptionController.checkStorage);

// Webhooks (no authentication - verified by signature)
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), subscriptionController.handleStripeWebhook);

module.exports = router;
