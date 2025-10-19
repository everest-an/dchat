const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Rate limiting for verification code sending
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many verification requests, please try again later'
});

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later'
});

// Public routes
router.post('/send-code', verificationLimiter, authController.sendVerificationCode);
router.post('/verify-login', loginLimiter, authController.verifyAndLogin);
router.post('/wallet-login', loginLimiter, authController.walletLogin);
router.post('/alipay-login', loginLimiter, authController.alipayLogin);

// Protected routes
router.get('/me', authenticateToken, authController.getCurrentUser);

module.exports = router;

