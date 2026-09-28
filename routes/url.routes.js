const express = require('express');
const router = express.Router();

// Import URL controller functions
const { shortenUrl, redirectToOriginalUrl, getAnalytics, listAllUrls } = require('../controllers/url.controller');

// Import rate limiting middleware
const { shortenUrlRateLimiter } = require('../middleware/rateLimiter');

// Import authentication middleware
const authMiddleware = require('../middleware/auth');

/**
 * URL Routes
 * 
 * Defines the HTTP endpoints for URL shortening operations.
 * Routes are organized here to keep the main app.js file clean.
 * 
 * Protected routes (require authentication):
 * - POST / - Create shortened URL
 * - GET / - List user's URLs
 * 
 * Public routes (no authentication needed):
 * - GET /:shortCode - Redirect to original URL
 * - GET /analytics/:shortCode - Get URL analytics
 */

// POST / (mounted at /api/url, so full path is /api/url)
// PROTECTED: Creates a new shortened URL (requires login)
// Rate limited to 100 requests per 15 minutes per IP address
router.post('/', authMiddleware, shortenUrlRateLimiter, shortenUrl);

// POST /shorten kept for backward compatibility
// PROTECTED: Creates a new shortened URL (requires login)
router.post('/shorten', authMiddleware, shortenUrlRateLimiter, shortenUrl);

// GET / (no params)
// PROTECTED: Returns all shortened URLs created by logged-in user (for dashboard)
router.get('/', authMiddleware, listAllUrls);

// GET /analytics/:shortCode
// PUBLIC: Returns analytics for a short code (clicks, createdAt, lastAccessed)
router.get('/analytics/:shortCode', getAnalytics);

// GET /:shortCode
// PUBLIC: Redirects to the original URL associated with the short code
// URL parameter: shortCode (e.g., "abc123")
router.get('/:shortCode', redirectToOriginalUrl);

// Export the router to be used in app.js
module.exports = router;

