const { supabase } = require('../config/supabase');
const { generateCode } = require('../utils/verification');
const { createWallet, encryptWallet } = require('../utils/wallet');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dchat_jwt_secret_2025';

// Send verification code
exports.sendVerificationCode = async (req, res) => {
  try {
    const { identifier, type } = req.body;

    if (!identifier || !type) {
      return res.status(400).json({ error: 'Identifier and type are required' });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const { error } = await supabase
      .from('verification_codes')
      .insert({
        identifier,
        code,
        type,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to save verification code' });
    }

    console.log(`📧 Verification code for ${identifier}: ${code}`);
    
    res.json({ 
      success: true, 
      message: 'Verification code sent',
      code: code  // Always return code for testing
    });

  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({ error: 'Failed to send verification code', details: error.message });
  }
};

// Verify code and login/register
exports.verifyCode = async (req, res) => {
  try {
    const { identifier, code, type } = req.body;

    if (!identifier || !code || !type) {
      return res.status(400).json({ error: 'Identifier, code, and type are required' });
    }

    const { data: codes, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('identifier', identifier)
      .eq('code', code)
      .eq('type', type)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (codeError || !codes || codes.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', codes[0].id);

    const field = type === 'email' ? 'email' : 'phone';
    const { data: existingUsers } = await supabase
      .from('users')
      .select('*')
      .eq(field, identifier)
      .limit(1);

    let user;

    if (existingUsers && existingUsers.length > 0) {
      user = existingUsers[0];
    } else {
      const wallet = createWallet();
      const encryptedWallet = encryptWallet(wallet.privateKey, code);

      const userData = {
        [field]: identifier,
        login_method: type,
        wallet_address: wallet.address,
        encrypted_wallet: encryptedWallet,
        display_name: identifier.split('@')[0] || identifier.substring(0, 10)
      };

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (createError) {
        console.error('Create user error:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      user = newUser;
    }

    const token = jwt.sign(
      { userId: user.id, walletAddress: user.wallet_address },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        displayName: user.display_name,
        email: user.email,
        phone: user.phone,
        loginMethod: user.login_method
      }
    });

  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: 'Verification failed', details: error.message });
  }
};

// Wallet login
exports.walletLogin = async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      return res.status(400).json({ error: 'Wallet address and signature are required' });
    }

    const { data: existingUsers } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .limit(1);

    let user;

    if (existingUsers && existingUsers.length > 0) {
      user = existingUsers[0];
    } else {
      const userData = {
        wallet_address: walletAddress,
        login_method: 'wallet',
        display_name: `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`
      };

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (createError) {
        console.error('Create user error:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      user = newUser;
    }

    const token = jwt.sign(
      { userId: user.id, walletAddress: user.wallet_address },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        displayName: user.display_name,
        loginMethod: user.login_method
      }
    });

  } catch (error) {
    console.error('Wallet login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};

// Alipay login
exports.alipayLogin = async (req, res) => {
  try {
    const { alipayId } = req.body;

    if (!alipayId) {
      return res.status(400).json({ error: 'Alipay ID is required' });
    }

    const { data: existingUsers } = await supabase
      .from('users')
      .select('*')
      .eq('alipay_id', alipayId)
      .limit(1);

    let user;

    if (existingUsers && existingUsers.length > 0) {
      user = existingUsers[0];
    } else {
      const wallet = createWallet();
      const encryptedWallet = encryptWallet(wallet.privateKey, alipayId);

      const userData = {
        alipay_id: alipayId,
        login_method: 'alipay',
        wallet_address: wallet.address,
        encrypted_wallet: encryptedWallet,
        display_name: `Alipay_${alipayId.substring(0, 8)}`
      };

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (createError) {
        console.error('Create user error:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      user = newUser;
    }

    const token = jwt.sign(
      { userId: user.id, walletAddress: user.wallet_address },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        displayName: user.display_name,
        loginMethod: user.login_method
      }
    });

  } catch (error) {
    console.error('Alipay login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        displayName: user.display_name,
        email: user.email,
        phone: user.phone,
        loginMethod: user.login_method
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user', details: error.message });
  }
};

// Verify code and login (combined function)
exports.verifyAndLogin = async (req, res) => {
  try {
    const { identifier, code, type } = req.body;

    if (!identifier || !code || !type) {
      return res.status(400).json({ error: 'Identifier, code, and type are required' });
    }

    // Verify code
    const { data: codes, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('identifier', identifier)
      .eq('code', code)
      .eq('type', type)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (codeError || !codes || codes.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Mark code as used
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', codes[0].id);

    // Find or create user
    const field = type === 'email' ? 'email' : 'phone';
    const { data: existingUsers } = await supabase
      .from('users')
      .select('*')
      .eq(field, identifier)
      .limit(1);

    let user;

    if (existingUsers && existingUsers.length > 0) {
      user = existingUsers[0];
    } else {
      const wallet = createWallet();
      const encryptedWallet = encryptWallet(wallet.privateKey, code);

      const userData = {
        [field]: identifier,
        login_method: type,
        wallet_address: wallet.address,
        encrypted_wallet: encryptedWallet,
        display_name: identifier.split('@')[0] || identifier.substring(0, 10)
      };

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (createError) {
        console.error('Create user error:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      user = newUser;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, walletAddress: user.wallet_address },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        displayName: user.display_name,
        email: user.email,
        phone: user.phone,
        loginMethod: user.login_method
      }
    });

  } catch (error) {
    console.error('Verify and login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};

// Password-based registration
exports.registerWithPassword = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Check if user exists
    const { data: existingUsers } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create wallet
    const wallet = createWallet();
    const encryptedWallet = encryptWallet(wallet.privateKey, password);

    // Create user
    const userData = {
      email,
      password_hash: hashedPassword,
      login_method: 'password',
      wallet_address: wallet.address,
      encrypted_wallet: encryptedWallet,
      display_name: username || email.split('@')[0],
      email_verified: false
    };

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (createError) {
      console.error('Create user error:', createError);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, walletAddress: newUser.wallet_address },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        walletAddress: newUser.wallet_address,
        displayName: newUser.display_name,
        email: newUser.email,
        loginMethod: newUser.login_method
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
};

// Password-based login
exports.loginWithPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const { data: users, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (findError || !users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // Check if user has password (might be using other login methods)
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Please use verification code to login' });
    }

    // Verify password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, walletAddress: user.wallet_address },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        displayName: user.display_name,
        email: user.email,
        loginMethod: user.login_method
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};
