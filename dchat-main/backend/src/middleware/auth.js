const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

/**
 * Verify JWT token middleware
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      // Check if session exists and is valid
      const [sessions] = await pool.execute(
        'SELECT * FROM sessions WHERE token = ? AND user_id = ? AND expires_at > NOW()',
        [token, decoded.userId]
      );

      if (sessions.length === 0) {
        return res.status(403).json({ error: 'Session expired or invalid' });
      }

      req.user = decoded;
      req.token = token;
      next();
    });

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (!err) {
        const [sessions] = await pool.execute(
          'SELECT * FROM sessions WHERE token = ? AND user_id = ? AND expires_at > NOW()',
          [token, decoded.userId]
        );

        if (sessions.length > 0) {
          req.user = decoded;
          req.token = token;
        }
      }
      next();
    });

  } catch (error) {
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};

