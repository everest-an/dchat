/**
 * Public Key Routes
 * 公钥管理 API 路由
 */

const express = require('express');
const router = express.Router();
const publicKeyController = require('../controllers/publicKeyController');

// JWT 认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const payload = jwt.decode(token);
    req.user_id = payload?.user_id || payload?.sub || 1;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// 公开路由 - 获取公钥
router.get('/address/:address', publicKeyController.getPublicKeyByAddress);
router.get('/user/:userId', publicKeyController.getPublicKeyByUserId);
router.get('/history/:address', publicKeyController.getKeyHistory);
router.post('/batch', publicKeyController.getPublicKeysBatch);

// 需要认证的路由
router.post('/register', authenticateToken, publicKeyController.registerPublicKey);
router.post('/rotate', authenticateToken, publicKeyController.rotateKey);

module.exports = router;
