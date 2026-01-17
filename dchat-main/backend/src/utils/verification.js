const crypto = require('crypto');

/**
 * Generate a 6-digit verification code
 */
const generateCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Check if code is expired
 */
const isCodeExpired = (expiresAt) => {
  return new Date() > new Date(expiresAt);
};

/**
 * Get code expiration time (5 minutes from now)
 */
const getExpirationTime = () => {
  const now = new Date();
  return new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
};

module.exports = {
  generateCode,
  isCodeExpired,
  getExpirationTime
};

