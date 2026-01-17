const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { generateWallet, encryptPrivateKey, verifySignature } = require('../utils/wallet');
const { generateCode, isCodeExpired, getExpirationTime } = require('../utils/verification');
const { sendVerificationEmail, sendWelcomeEmail } = require('../services/emailService');

/**
 * Send verification code (email or phone)
 */
const sendVerificationCode = async (req, res) => {
  try {
    const { identifier, type } = req.body; // identifier: email or phone, type: 'email' or 'phone'

    if (!identifier || !type) {
      return res.status(400).json({ error: 'Identifier and type are required' });
    }

    // Generate verification code
    const code = generateCode();
    const expiresAt = getExpirationTime();

    // Save code to database
    const [result] = await pool.execute(
      'INSERT INTO verification_codes (identifier, code, type, expires_at) VALUES (?, ?, ?, ?)',
      [identifier, code, type, expiresAt]
    );

    // Send code based on type
    if (type === 'email') {
      const emailSent = await sendVerificationEmail(identifier, code);
      if (!emailSent) {
        return res.status(500).json({ error: 'Failed to send verification email' });
      }
    } else if (type === 'phone') {
      // TODO: Implement SMS sending
      console.log(`SMS code for ${identifier}: ${code}`);
      // For now, just log it
    }

    res.json({
      success: true,
      message: `Verification code sent to ${identifier}`,
      expiresIn: 300 // 5 minutes in seconds
    });

  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
};

/**
 * Verify code and login/register
 */
const verifyAndLogin = async (req, res) => {
  try {
    const { identifier, code, type } = req.body;

    if (!identifier || !code || !type) {
      return res.status(400).json({ error: 'Identifier, code, and type are required' });
    }

    // Check verification code
    const [codes] = await pool.execute(
      'SELECT * FROM verification_codes WHERE identifier = ? AND code = ? AND type = ? AND used = FALSE ORDER BY created_at DESC LIMIT 1',
      [identifier, code, type]
    );

    if (codes.length === 0) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const verificationCode = codes[0];

    // Check if code is expired
    if (isCodeExpired(verificationCode.expires_at)) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Mark code as used
    await pool.execute(
      'UPDATE verification_codes SET used = TRUE WHERE id = ?',
      [verificationCode.id]
    );

    // Check if user exists
    const field = type === 'email' ? 'email' : 'phone';
    const [users] = await pool.execute(
      `SELECT * FROM users WHERE ${field} = ?`,
      [identifier]
    );

    let user;
    let isNewUser = false;

    if (users.length === 0) {
      // Create new user with custodial wallet
      const wallet = generateWallet();
      
      // Encrypt private key (using user's identifier as password for now)
      // In production, use a more secure method
      const encryptedKey = encryptPrivateKey(wallet.privateKey, process.env.JWT_SECRET + identifier);
      
      // Create user
      const [userResult] = await pool.execute(
        `INSERT INTO users (wallet_address, login_method, is_custodial, ${field}, ${field}_verified, name) VALUES (?, ?, ?, ?, ?, ?)`,
        [wallet.address, type, true, identifier, true, identifier.split('@')[0] || 'User']
      );

      const userId = userResult.insertId;

      // Store encrypted wallet
      await pool.execute(
        'INSERT INTO custodial_wallets (user_id, wallet_address, encrypted_private_key) VALUES (?, ?, ?)',
        [userId, wallet.address, JSON.stringify(encryptedKey)]
      );

      // Fetch created user
      const [newUsers] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      user = newUsers[0];
      isNewUser = true;

      // Send welcome email
      if (type === 'email') {
        await sendWelcomeEmail(identifier, user.name);
      }

    } else {
      user = users[0];
      
      // Update last login
      await pool.execute(
        'UPDATE users SET last_login_at = NOW() WHERE id = ?',
        [user.id]
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        walletAddress: user.wallet_address,
        loginMethod: user.login_method
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Save session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await pool.execute(
      'INSERT INTO sessions (user_id, token, ip_address, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, token, req.ip, expiresAt]
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
    res.status(500).json({ error: 'Failed to verify code' });
  }
};

/**
 * Wallet login (Web3)
 */
const walletLogin = async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({ error: 'Wallet address, signature, and message are required' });
    }

    // Verify signature
    const isValid = verifySignature(message, signature, walletAddress);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE wallet_address = ?',
      [walletAddress]
    );

    let user;
    let isNewUser = false;

    if (users.length === 0) {
      // Create new user
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
      
      // Update last login
      await pool.execute(
        'UPDATE users SET last_login_at = NOW() WHERE id = ?',
        [user.id]
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        walletAddress: user.wallet_address,
        loginMethod: user.login_method
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Save session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.execute(
      'INSERT INTO sessions (user_id, token, ip_address, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, token, req.ip, expiresAt]
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
    res.status(500).json({ error: 'Failed to login with wallet' });
  }
};

/**
 * Alipay login (OAuth)
 */
const alipayLogin = async (req, res) => {
  try {
    const { alipayId, alipayInfo } = req.body;

    if (!alipayId) {
      return res.status(400).json({ error: 'Alipay ID is required' });
    }

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE alipay_id = ?',
      [alipayId]
    );

    let user;
    let isNewUser = false;

    if (users.length === 0) {
      // Create new user with custodial wallet
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

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        walletAddress: user.wallet_address,
        loginMethod: user.login_method
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Save session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.execute(
      'INSERT INTO sessions (user_id, token, ip_address, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, token, req.ip, expiresAt]
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
    res.status(500).json({ error: 'Failed to login with Alipay' });
  }
};

/**
 * Get current user info
 */
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        email: user.email,
        phone: user.phone,
        alipayId: user.alipay_id,
        name: user.name,
        company: user.company,
        position: user.position,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        loginMethod: user.login_method,
        isCustodial: Boolean(user.is_custodial),
        emailVerified: Boolean(user.email_verified),
        phoneVerified: Boolean(user.phone_verified),
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at
      }
    });

  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
};

module.exports = {
  sendVerificationCode,
  verifyAndLogin,
  walletLogin,
  alipayLogin,
  getCurrentUser
};

