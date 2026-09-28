const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRE = '7d'; // Token valid for 7 days

/**
 * Generate a JWT token for a user
 * @param {string} userId - The user's MongoDB _id
 * @returns {string} - JWT token
 */
function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
}

/**
 * Verify a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {object|null} - Decoded token payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 * Expected format: "Bearer <token>"
 * @param {string} authHeader - The Authorization header value
 * @returns {string|null} - The token or null if not found
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7); // Remove "Bearer " prefix
}

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  JWT_SECRET
};
