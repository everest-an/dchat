/**
 * Unit tests for payments API
 */

const request = require('supertest');
const express = require('express');
const paymentsRouter = require('../payments');

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method'
      }),
      list: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'pi_test123',
            amount: 1000,
            currency: 'usd',
            status: 'succeeded',
            created: Math.floor(Date.now() / 1000),
            metadata: {}
          }
        ],
        has_more: false
      })
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test123',
          url: 'https://checkout.stripe.com/pay/cs_test123'
        })
      }
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        latest_invoice: {
          payment_intent: {
            client_secret: 'pi_test123_secret'
          }
        }
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        cancel_at_period_end: false,
        metadata: {}
      }),
      cancel: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'canceled'
      })
    },
    customers: {
      create: jest.fn().mockResolvedValue({
        id: 'cus_test123'
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'cus_test123'
      })
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: 'ref_test123',
        status: 'succeeded',
        amount: 1000
      })
    },
    webhooks: {
      constructEvent: jest.fn((payload, sig, secret) => {
        return {
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test123',
              status: 'succeeded'
            }
          }
        };
      })
    }
  }));
});

describe('Payments API', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/payments', paymentsRouter);
    
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123';
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/payments/create-intent', () => {
    it('should create a payment intent successfully', async () => {
      const response = await request(app)
        .post('/api/payments/create-intent')
        .send({
          amount: 10.00,
          currency: 'usd',
          metadata: {
            plan: 'pro'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.clientSecret).toBeDefined();
      expect(response.body.paymentIntentId).toBe('pi_test123');
    });

    it('should reject invalid amounts', async () => {
      const response = await request(app)
        .post('/api/payments/create-intent')
        .send({
          amount: -10,
          currency: 'usd'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid amount');
    });

    it('should reject zero amounts', async () => {
      const response = await request(app)
        .post('/api/payments/create-intent')
        .send({
          amount: 0,
          currency: 'usd'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/payments/create-checkout', () => {
    it('should create a checkout session successfully', async () => {
      const response = await request(app)
        .post('/api/payments/create-checkout')
        .send({
          items: [
            {
              name: 'Pro Plan',
              description: 'Monthly subscription',
              price: 9.99,
              currency: 'usd',
              quantity: 1
            }
          ],
          mode: 'payment'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sessionId).toBe('cs_test123');
      expect(response.body.url).toBeDefined();
    });

    it('should reject empty items', async () => {
      const response = await request(app)
        .post('/api/payments/create-checkout')
        .send({
          items: []
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No items');
    });
  });

  describe('POST /api/payments/create-subscription', () => {
    it('should create a subscription successfully', async () => {
      const response = await request(app)
        .post('/api/payments/create-subscription')
        .send({
          priceId: 'price_test123',
          metadata: {
            plan: 'pro'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.subscriptionId).toBe('sub_test123');
      expect(response.body.clientSecret).toBeDefined();
      expect(response.body.customerId).toBeDefined();
    });

    it('should reject missing price ID', async () => {
      const response = await request(app)
        .post('/api/payments/create-subscription')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Price ID is required');
    });

    it('should use existing customer if provided', async () => {
      const stripe = require('stripe')();
      
      const response = await request(app)
        .post('/api/payments/create-subscription')
        .send({
          priceId: 'price_test123',
          customerId: 'cus_existing123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(stripe.customers.retrieve).toHaveBeenCalledWith('cus_existing123');
    });
  });

  describe('POST /api/payments/cancel-subscription', () => {
    it('should cancel a subscription successfully', async () => {
      const response = await request(app)
        .post('/api/payments/cancel-subscription')
        .send({
          subscriptionId: 'sub_test123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.subscriptionId).toBe('sub_test123');
      expect(response.body.status).toBe('canceled');
    });

    it('should reject missing subscription ID', async () => {
      const response = await request(app)
        .post('/api/payments/cancel-subscription')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Subscription ID is required');
    });
  });

  describe('POST /api/payments/refund', () => {
    it('should process a full refund successfully', async () => {
      const response = await request(app)
        .post('/api/payments/refund')
        .send({
          paymentIntentId: 'pi_test123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.refundId).toBe('ref_test123');
      expect(response.body.status).toBe('succeeded');
    });

    it('should process a partial refund successfully', async () => {
      const response = await request(app)
        .post('/api/payments/refund')
        .send({
          paymentIntentId: 'pi_test123',
          amount: 5.00,
          reason: 'requested_by_customer'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.refundId).toBeDefined();
    });

    it('should reject missing payment intent ID', async () => {
      const response = await request(app)
        .post('/api/payments/refund')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Payment intent ID is required');
    });
  });

  describe('GET /api/payments/history', () => {
    it('should retrieve payment history', async () => {
      const response = await request(app)
        .get('/api/payments/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.payments)).toBe(true);
      expect(response.body.payments.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/payments/history?limit=5&startingAfter=pi_test123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.hasMore).toBeDefined();
    });
  });

  describe('GET /api/payments/subscription/:id', () => {
    it('should retrieve subscription details', async () => {
      const response = await request(app)
        .get('/api/payments/subscription/sub_test123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.subscription).toBeDefined();
      expect(response.body.subscription.id).toBe('sub_test123');
      expect(response.body.subscription.status).toBe('active');
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('should handle payment_intent.succeeded event', async () => {
      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'test_signature')
        .send({
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test123'
            }
          }
        })
        .expect(200);

      expect(response.body.received).toBe(true);
    });

    it('should handle subscription events', async () => {
      const stripe = require('stripe')();
      stripe.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test123',
            status: 'active'
          }
        }
      });

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'test_signature')
        .send({})
        .expect(200);

      expect(response.body.received).toBe(true);
    });

    it('should reject invalid signatures', async () => {
      const stripe = require('stripe')();
      stripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send({})
        .expect(400);

      expect(response.text).toContain('Webhook Error');
    });
  });

  describe('POST /api/payments/crypto/create', () => {
    it('should create a crypto payment address', async () => {
      const response = await request(app)
        .post('/api/payments/crypto/create')
        .send({
          amount: 100,
          currency: 'usd',
          cryptocurrency: 'ETH'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.paymentId).toBeDefined();
      expect(response.body.address).toBeDefined();
      expect(response.body.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(response.body.expiresAt).toBeDefined();
    });

    it('should support different cryptocurrencies', async () => {
      const btcResponse = await request(app)
        .post('/api/payments/crypto/create')
        .send({
          amount: 100,
          currency: 'usd',
          cryptocurrency: 'BTC'
        })
        .expect(200);

      expect(btcResponse.body.success).toBe(true);
      expect(btcResponse.body.address).toMatch(/^1[a-fA-F0-9]{40}$/);
    });

    it('should reject invalid amounts', async () => {
      const response = await request(app)
        .post('/api/payments/crypto/create')
        .send({
          amount: -10,
          currency: 'usd',
          cryptocurrency: 'ETH'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/payments/crypto/status/:id', () => {
    it('should retrieve crypto payment status', async () => {
      // First create a payment
      const createResponse = await request(app)
        .post('/api/payments/crypto/create')
        .send({
          amount: 100,
          currency: 'usd',
          cryptocurrency: 'ETH'
        });

      const paymentId = createResponse.body.paymentId;

      // Then check status
      const response = await request(app)
        .get(`/api/payments/crypto/status/${paymentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payment).toBeDefined();
      expect(response.body.payment.id).toBe(paymentId);
      expect(response.body.payment.status).toBe('pending');
    });

    it('should return 404 for non-existent payment', async () => {
      const response = await request(app)
        .get('/api/payments/crypto/status/non_existent_id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle Stripe API errors gracefully', async () => {
      const stripe = require('stripe')();
      stripe.paymentIntents.create.mockRejectedValue(
        new Error('Stripe API error')
      );

      const response = await request(app)
        .post('/api/payments/create-intent')
        .send({
          amount: 10,
          currency: 'usd'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      const stripe = require('stripe')();
      stripe.subscriptions.create.mockRejectedValue(
        new Error('Network error')
      );

      const response = await request(app)
        .post('/api/payments/create-subscription')
        .send({
          priceId: 'price_test123'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});
