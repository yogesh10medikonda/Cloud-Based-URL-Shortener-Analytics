const { verifyToken, extractTokenFromHeader } = require('../../middleware/config/jwt');

/**
 * Middleware to verify JWT token and attach user to request
 * 
 * Checks for token in Authorization header (Bearer <token>)
 * If valid, attaches user ID to req.user
 * If invalid, returns 401 Unauthorized
 */
const authMiddleware = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please log in.'
      });
    }

    // Verify the token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please log in again.'
      });
    }

    // Attach user ID to request object for use in controllers
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed.',
      error: error.message
    });
  }
};

module.exports = authMiddleware;
