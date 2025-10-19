const express = require('express');
const cors = require('cors');
const authController = require('../src/controllers/authController');
const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.post('/api/auth/send-code', authController.sendVerificationCode);
app.post('/api/auth/verify-code', authController.verifyCode);
app.post('/api/auth/wallet-login', authController.walletLogin);
app.post('/api/auth/alipay-login', authController.alipayLogin);
module.exports = app;
