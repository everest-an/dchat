// Updated: Fixed 500 error with better error handling
const express = require('express');
const cors = require('cors');

const app = express();

// 中间件
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// 健康检查端点（不依赖任何外部服务）
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'dchat-backend',
    version: '1.0.0'
  });
});

// API 路由（使用 try-catch 包装以避免崩溃）
try {
  const authController = require('../src/controllers/authController');
  
  app.post('/api/auth/send-code', authController.sendVerificationCode);
  app.post('/api/auth/verify-code', authController.verifyCode);
  app.post('/api/auth/wallet-login', authController.walletLogin);
  app.post('/api/auth/alipay-login', authController.alipayLogin);
} catch (error) {
  console.error('Failed to load auth controller:', error.message);
  
  // 提供降级的 API 端点
  app.post('/api/auth/*', (req, res) => {
    res.status(503).json({ 
      error: 'Service temporarily unavailable',
      message: 'Backend services are being configured. Please use demo mode for now.'
    });
  });
}

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
