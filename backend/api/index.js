const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      hasDbHost: !!process.env.DB_HOST,
      hasDbPassword: !!process.env.DB_PASSWORD,
      hasJwtSecret: !!process.env.JWT_SECRET
    }
  });
});

// API routes
app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { pool } = require('../src/config/database');
    const { generateCode, getExpirationTime } = require('../src/utils/verification');
    const { sendVerificationEmail } = require('../src/services/emailService');
    
    const { identifier, type } = req.body;

    if (!identifier || !type) {
      return res.status(400).json({ error: 'Identifier and type are required' });
    }

    const code = generateCode();
    const expiresAt = getExpirationTime();

    await pool.execute(
      'INSERT INTO verification_codes (identifier, code, type, expires_at) VALUES (?, ?, ?, ?)',
      [identifier, code, type, expiresAt]
    );

    if (type === 'email') {
      await sendVerificationEmail(identifier, code);
    } else if (type === 'phone') {
      console.log(`SMS code for ${identifier}: ${code}`);
    }

    res.json({
      success: true,
      message: `Verification code sent to ${identifier}`,
      expiresIn: 300
    });

  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({ error: 'Failed to send verification code', details: error.message });
  }
});

app.post('/api/auth/verify-login', async (req, res) => {
  try {
    const { pool } = require('../src/config/database');
    const { isCodeExpired } = require('../src/utils/verification');
    const { generateWallet, encryptPrivateKey } = require('../src/utils/wallet');
    const jwt = require('jsonwebtoken');
    
    const { identifier, code, type } = req.body;

    if (!identifier || !code || !type) {
      return res.status(400).json({ error: 'Identifier, code, and type are required' });
    }

    const [codes] = await pool.execute(
      'SELECT * FROM verification_codes WHERE identifier = ? AND code = ? AND type = ? AND used = FALSE ORDER BY created_at DESC LIMIT 1',
      [identifier, code, type]
    );

    if (codes.length === 0) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const verificationCode = codes[0];

    if (isCodeExpired(verificationCode.expires_at)) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    await pool.execute(
      'UPDATE verification_codes SET used = TRUE WHERE id = ?',
      [verificationCode.id]
    );

    const field = type === 'email' ? 'email' : 'phone';
    const [users] = await pool.execute(
      `SELECT * FROM users WHERE ${field} = ?`,
      [identifier]
    );

    let user;
    let isNewUser = false;

    if (users.length === 0) {
      const wallet = generateWallet();
      const encryptedKey = encryptPrivateKey(wallet.privateKey, process.env.JWT_SECRET + identifier);
      
      const [userResult] = await pool.execute(
        `INSERT INTO users (wallet_address, login_method, is_custodial, ${field}, ${field}_verified, name) VALUES (?, ?, ?, ?, ?, ?)`,
        [wallet.address, type, true, identifier, true, identifier.split('@')[0] || 'User']
      );

      const userId = userResult.insertId;

      await pool.execute(
        'INSERT INTO custodial_wallets (user_id, wallet_address, encrypted_private_key) VALUES (?, ?, ?)',
        [userId, wallet.address, JSON.stringify(encryptedKey)]
      );

      const [newUsers] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      user = newUsers[0];
      isNewUser = true;

    } else {
      user = users[0];
      await pool.execute(
        'UPDATE users SET last_login_at = NOW() WHERE id = ?',
        [user.id]
      );
    }

    const token = jwt.sign(
      {
        userId: user.id,
        walletAddress: user.wallet_address,
        loginMethod: user.login_method
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.execute(
      'INSERT INTO sessions (user_id, token, ip_address, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, token, req.headers['x-forwarded-for'] || req.connection.remoteAddress, expiresAt]
    );

    res.json({
      success: true,
      isNewUser,
      token,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        email: user.email,
        phone: user.phone,
        name: user.name,
        company: user.company,
        position: user.position,
        avatarUrl: user.avatar_url,
        loginMethod: user.login_method,
        isCustodial: Boolean(user.is_custodial)
      }
    });

  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: 'Failed to verify code', details: error.message });
  }
});

app.post('/api/auth/wallet-login', async (req, res) => {
  try {
    const { pool } = require('../src/config/database');
    const { verifySignature } = require('../src/utils/wallet');
    const jwt = require('jsonwebtoken');
    
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({ error: 'Wallet address, signature, and message are required' });
    }

    const isValid = verifySignature(message, signature, walletAddress);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const [users] = await pool.execute(
      'SELECT * FROM users WHERE wallet_address = ?',
      [walletAddress]
    );

    let user;
    let isNewUser = false;

    if (users.length === 0) {
      const [result] = await pool.execute(
        'INSERT INTO users (wallet_address, login_method, is_custodial, name) VALUES (?, ?, ?, ?)',
        [walletAddress, 'wallet', false, 'User']
      );

      const [newUsers] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [result.insertId]
      );
      user = newUsers[0];
      isNewUser = true;

    } else {
      user = users[0];
      await pool.execute(
        'UPDATE users SET last_login_at = NOW() WHERE id = ?',
        [user.id]
      );
    }

    const token = jwt.sign(
      {
        userId: user.id,
        walletAddress: user.wallet_address,
        loginMethod: user.login_method
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.execute(
      'INSERT INTO sessions (user_id, token, ip_address, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, token, req.headers['x-forwarded-for'] || req.connection.remoteAddress, expiresAt]
    );

    res.json({
      success: true,
      isNewUser,
      token,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        email: user.email,
        phone: user.phone,
        name: user.name,
        company: user.company,
        position: user.position,
        avatarUrl: user.avatar_url,
        loginMethod: user.login_method,
        isCustodial: Boolean(user.is_custodial)
      }
    });

  } catch (error) {
    console.error('Error in wallet login:', error);
    res.status(500).json({ error: 'Failed to login with wallet', details: error.message });
  }
});

app.post('/api/auth/alipay-login', async (req, res) => {
  try {
    const { pool } = require('../src/config/database');
    const { generateWallet, encryptPrivateKey } = require('../src/utils/wallet');
    const jwt = require('jsonwebtoken');
    
    const { alipayId, alipayInfo } = req.body;

    if (!alipayId) {
      return res.status(400).json({ error: 'Alipay ID is required' });
    }

    const [users] = await pool.execute(
      'SELECT * FROM users WHERE alipay_id = ?',
      [alipayId]
    );

    let user;
    let isNewUser = false;

    if (users.length === 0) {
      const wallet = generateWallet();
      const encryptedKey = encryptPrivateKey(wallet.privateKey, process.env.JWT_SECRET + alipayId);
      
      const [userResult] = await pool.execute(
        'INSERT INTO users (wallet_address, login_method, is_custodial, alipay_id, name) VALUES (?, ?, ?, ?, ?)',
        [wallet.address, 'alipay', true, alipayId, alipayInfo?.name || 'Alipay User']
      );

      const userId = userResult.insertId;

      await pool.execute(
        'INSERT INTO custodial_wallets (user_id, wallet_address, encrypted_private_key) VALUES (?, ?, ?)',
        [userId, wallet.address, JSON.stringify(encryptedKey)]
      );

      const [newUsers] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      user = newUsers[0];
      isNewUser = true;

    } else {
      user = users[0];
      await pool.execute(
        'UPDATE users SET last_login_at = NOW() WHERE id = ?',
        [user.id]
      );
    }

    const token = jwt.sign(
      {
        userId: user.id,
        walletAddress: user.wallet_address,
        loginMethod: user.login_method
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.execute(
      'INSERT INTO sessions (user_id, token, ip_address, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, token, req.headers['x-forwarded-for'] || req.connection.remoteAddress, expiresAt]
    );

    res.json({
      success: true,
      isNewUser,
      token,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        alipayId: user.alipay_id,
        name: user.name,
        company: user.company,
        position: user.position,
        avatarUrl: user.avatar_url,
        loginMethod: user.login_method,
        isCustodial: Boolean(user.is_custodial)
      }
    });

  } catch (error) {
    console.error('Error in Alipay login:', error);
    res.status(500).json({ error: 'Failed to login with Alipay', details: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Export for Vercel
module.exports = app;

