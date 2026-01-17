// Updated: Fixed 500 error with better error handling
const express = require('express');
const cors = require('cors');

const app = express();

// 中间件
app.use(cors({ 
  origin: ['https://dchat.pro', 'https://www.dchat.pro', 'http://localhost:5173', 'http://localhost:3000', '*'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 状态变量
let authControllerLoaded = false;
let loadError = null;
let supabaseConnected = false;

// 健康检查端点（增强版）
app.get('/health', async (req, res) => {
  // 尝试测试 Supabase 连接
  try {
    const { testConnection } = require('../src/config/supabase');
    supabaseConnected = await testConnection();
  } catch (e) {
    supabaseConnected = false;
  }
  
  res.json({ 
    status: authControllerLoaded && supabaseConnected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    service: 'dchat-backend',
    version: '1.0.0',
    components: {
      authController: authControllerLoaded,
      supabase: supabaseConnected
    }
  });
});

// API 路由（使用 try-catch 包装以避免崩溃）
try {
  const authController = require('../src/controllers/authController');
  authControllerLoaded = true;
  
  // Auth routes
  app.post('/api/auth/send-code', authController.sendVerificationCode);
  app.post('/api/auth/verify-code', authController.verifyCode);
  app.post('/api/auth/verify-login', authController.verifyCode); // Alias
  app.post('/api/auth/wallet-login', authController.walletLogin);
  app.post('/api/auth/alipay-login', authController.alipayLogin);
  app.post('/api/auth/register', authController.registerWithPassword);
  app.post('/api/auth/login', authController.loginWithPassword);
  
  // Nonce endpoint for wallet auth
  app.post('/api/auth/nonce', (req, res) => {
    const { wallet_address } = req.body;
    if (!wallet_address) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    const nonce = Math.floor(Math.random() * 1000000).toString();
    const message = `Sign this message to login to Dchat.\n\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
    res.json({ nonce, message });
  });
  
  console.log('✅ Auth controller loaded successfully');
} catch (error) {
  loadError = error;
  console.error('❌ Failed to load auth controller:', error.message);
  console.error('Stack:', error.stack);
  
  // 提供降级的 API 端点
  app.post('/api/auth/*', (req, res) => {
    res.status(503).json({ 
      error: 'Service temporarily unavailable',
      message: 'Backend services are being configured. Please use demo mode for now.',
      details: loadError ? loadError.message : 'Unknown error'
    });
  });
}

// 诊断端点
app.get('/api/status', (req, res) => {
  res.json({
    authControllerLoaded,
    loadError: loadError ? loadError.message : null,
    timestamp: new Date().toISOString()
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path 
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

module.exports = app;
