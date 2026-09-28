const { createShortUrl, getUrlByShortCode } = require('../services/url.service');
const { validateUrl, validateCustomCode, validateExpirationDate, sanitizeInput } = require('../utils/validators');

/**
 * URL Controller
 * 
 * Handles HTTP requests for URL shortening operations.
 * This controller acts as the interface between the HTTP layer (Express routes)
 * and the business logic layer (services).
 * 
 * Security Features:
 * - SSRF prevention (blocks localhost, private IPs, IPv6 private ranges)
 * - URL validation (format, length, protocol checks)
 * - Custom code validation (format, reserved words)
 * - Expiration date validation (future dates, max 10 years)
 * - Input sanitization (XSS prevention)
 * - Rate limiting (10 requests per minute per IP)
 */

/**
 * Request Flow Explanation:
 * 
 * 1. Client sends POST request to /api/shorten with JSON body containing:
 *    { "url": "https://example.com/long-url", "expiresAt": "2024-12-31" (optional), "customCode": "my-code" (optional) }
 * 
 * 2. Express middleware (express.json()) parses the JSON body into req.body
 * 
 * 3. Controller receives the request object (req) and response object (res)
 * 
 * 4. Controller validates the URL format using comprehensive validators:
 *    - Checks for valid HTTP/HTTPS URLs
 *    - Prevents SSRF attacks (blocks localhost, private IPs)
 *    - Enforces length limits (10-2048 characters)
 *    - Blocks malicious URL schemes (data:, javascript:)
 * 
 * 5. Controller validates custom code (if provided):
 *    - Format: 3-64 alphanumeric characters plus dash/underscore
 *    - Prevents reserved words (api, auth, admin, etc.)
 * 
 * 6. Controller validates expiration date (if provided):
 *    - Must be in future
 *    - Max 10 years from now
 * 
 * 7. If validation passes, controller calls the URL service to create the short URL
 * 
 * 8. Service generates a shortCode and saves the URL to MongoDB
 * 
 * 9. Controller constructs the full short URL and returns it in JSON response
 * 
 * 10. If any step fails, controller returns appropriate error response with:
 *     - HTTP status code (400 for validation, 401 for auth, 409 for conflict, 429 for rate limit)
 *     - Error message with specific details about what failed
 */

/**
 * POST /api/url
 * 
 * Creates a shortened URL from a long URL.
 * Requires authentication (JWT token in Authorization header).
 * 
 * Request Body:
 *   {
 *     "longUrl": "https://example.com/very/long/url/path",
 *     "expiresAt": "2024-12-31T23:59:59Z" (optional, ISO 8601 format),
 *     "customCode": "my-short-code" (optional, 3-64 alphanumeric/dash/underscore)
 *   }
 * 
 * Success Response (201):
 *   {
 *     "success": true,
 *     "shortUrl": "http://localhost:5000/abc123",
 *     "shortCode": "abc123",
 *     "originalUrl": "https://example.com/very/long/url/path"
 *   }
 * 
 * Error Response (400 - Bad Request):
 *   {
 *     "success": false,
 *     "error": "Invalid URL format. Please provide a valid HTTP or HTTPS URL.",
 *     "details": "Cannot shorten private IP URLs"
 *   }
 * 
 * Error Response (401 - Unauthorized):
 *   {
 *     "success": false,
 *     "message": "Please log in to create shortened URLs."
 *   }
 * 
 * Error Response (409 - Conflict):
 *   {
 *     "success": false,
 *     "error": "Custom short code already in use. Please choose a different code."
 *   }
 * 
 * Error Response (429 - Too Many Requests):
 *   {
 *     "success": false,
 *     "error": "Too many requests",
 *     "message": "You have exceeded the rate limit of 10 requests per minute..."
 *   }
 * 
 * Security Features:
 * - SSRF Prevention: Blocks localhost, private IPs (10.x, 172.16-31.x, 192.168.x), link-local IPs (169.254.x)
 * - URL Length: 10-2048 characters (prevents oversized payloads)
 * - Protocol: Only HTTP/HTTPS (blocks data:, javascript:, file:)
 * - Custom Code: 3-64 chars, alphanumeric/dash/underscore, blocks reserved words
 * - Expiration: Future dates only, max 10 years
 * - Rate Limiting: 10 requests per minute per IP (enforced by middleware)
 * 
 * @param {Object} req - Express request object with req.user set by authMiddleware
 * @param {Object} res - Express response object
 */
async function shortenUrl(req, res) {
  try {
    // ===== STEP 1: AUTHENTICATION CHECK =====
    // Verify user is logged in
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to create shortened URLs.'
      });
    }

    // ===== STEP 2: EXTRACT REQUEST DATA =====
    // Extract URL and optional fields from request body
    const { longUrl, url, expiresAt, customCode } = req.body;
    const originalUrl = longUrl || url; // Support both field names

    // ===== STEP 3: VALIDATE URL IS PROVIDED =====
    if (!originalUrl) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
        details: 'Please provide a "longUrl" or "url" field in the request body'
      });
    }

    // ===== STEP 4: VALIDATE URL FORMAT, SSRF, LENGTH, PROTOCOL =====
    // Uses comprehensive validator that checks:
    // - Valid HTTP/HTTPS URL format
    // - No SSRF attacks (localhost, private IPs)
    // - Length between 10-2048 characters
    // - No malicious schemes (data:, javascript:)
    const urlValidation = validateUrl(originalUrl);
    if (!urlValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL',
        details: urlValidation.error
      });
    }

    // ===== STEP 5: VALIDATE CUSTOM CODE (IF PROVIDED) =====
    // Custom codes must be:
    // - 3-64 characters long
    // - Alphanumeric, dash, or underscore only
    // - Not in reserved word list
    if (customCode) {
      const codeValidation = validateCustomCode(customCode);
      if (!codeValidation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid custom code',
          details: codeValidation.error
        });
      }
    }

    // ===== STEP 6: VALIDATE EXPIRATION DATE (IF PROVIDED) =====
    // If provided, must be:
    // - ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
    // - In the future
    // - Not more than 10 years away
    let expirationDate = null;
    if (expiresAt) {
      const dateValidation = validateExpirationDate(expiresAt);
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid expiration date',
          details: dateValidation.error
        });
      }
      expirationDate = new Date(expiresAt);
    }

    // ===== STEP 7: CREATE SHORTENED URL =====
    // Call the service to generate shortCode and save to MongoDB
    // Passes:
    // - originalUrl: The long URL to shorten
    // - userId: Current user's ID (for data isolation)
    // - expirationDate: Optional expiration (null if not provided)
    // - customCode: Optional custom short code (null if not provided)
    let shortCode;
    try {
      shortCode = await createShortUrl(originalUrl, req.user.id, expirationDate, customCode);
    } catch (err) {
      // Handle specific error types
      if (err && err.code === 'CUSTOM_CODE_TAKEN') {
        return res.status(409).json({
          success: false,
          error: 'Custom short code already in use',
          details: 'Please choose a different custom code.'
        });
      }
      if (err && err.code === 'INVALID_CUSTOM_CODE') {
        return res.status(400).json({
          success: false,
          error: 'Invalid custom code',
          details: err.message
        });
      }
      // Re-throw unexpected errors to be caught by outer try-catch
      throw err;
    }

    // ===== STEP 8: CONSTRUCT RESPONSE =====
    // Build the full short URL using request protocol and host
    const protocol = req.protocol; // 'http' or 'https'
    const host = req.get('host');   // e.g., 'localhost:5000'
    const shortUrl = `${protocol}://${host}/${shortCode}`;

    // ===== STEP 9: RETURN SUCCESS RESPONSE =====
    return res.status(201).json({
      success: true,
      shortUrl,
      shortCode,
      originalUrl
    });

  } catch (error) {
    // ===== ERROR HANDLING =====
    // Log the error for debugging
    console.error('Error shortening URL:', error);

    // Check for specific error types and return appropriate responses
    if (error.message && error.message.includes('collision')) {
      // Short code collision (extremely rare)
      return res.status(500).json({
        success: false,
        error: 'Failed to generate short URL',
        details: 'Please try again. If the problem persists, contact support.'
      });
    }

    // Generic error response for unexpected errors
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: 'An unexpected error occurred. Please try again later.'
    });
  }
}

/**
 * GET /:shortCode
 * 
 * Redirects to the original URL associated with the short code.
 * 
 * URL Parameters:
 *   shortCode - The short code from the shortened URL (e.g., "abc123")
 * 
 * Success Response (302):
 *   Redirects to the original URL
 * 
 * Error Response (404):
 *   {
 *     "success": false,
 *     "error": "Short URL not found or expired"
 *   }
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function redirectToOriginalUrl(req, res) {
  try {
    // Step 1: Extract shortCode from URL parameters
    // Express automatically parses route parameters from the URL path
    // For example, GET /abc123 will set req.params.shortCode = "abc123"
    const { shortCode } = req.params;

    // Step 2: Validate that shortCode is provided
    // Ensure the shortCode parameter exists and is not empty
    if (!shortCode) {
      return res.status(400).json({
        success: false,
        error: 'Short code is required'
      });
    }

    // Step 3: Fetch URL info from service which now returns structured result
    // { originalUrl } on success, { expired: true } if expired, or null if missing
    const result = await getUrlByShortCode(shortCode);

    // Step 4: Handle not found
    if (!result) {
      return res.status(404).json({ success: false, error: 'Short URL not found' });
    }

    // Step 5: Handle expired
    if (result.expired) {
      return res.status(410).json({ success: false, error: 'URL has expired' });
    }

    // Step 6: Redirect to the original URL
    return res.redirect(302, result.originalUrl);

  } catch (error) {
    // Step 6: Handle errors gracefully
    // Log the error for debugging purposes
    // In production, use a proper logging service (e.g., Winston, Pino)
    console.error('Error redirecting URL:', error);

    // Return a generic error response to avoid exposing internal details
    // HTTP 500 indicates a server error
    return res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again later.'
    });
  }
}

module.exports = {
  shortenUrl,
  redirectToOriginalUrl,
  getAnalytics,
  listAllUrls
};

/**
 * GET /api/url
 *
 * Returns all shortened URLs created by the authenticated user (for dashboard).
 * Requires authentication (JWT token in Authorization header).
 * 
 * Query Parameters:
 *   sort: Field to sort by (default: '-createdAt' for newest first)
 *   limit: Maximum number of URLs to return (default: 100)
 * 
 * Response:
 *   {
 *     "success": true,
 *     "data": [
 *       {
 *         "shortCode": "abc123",
 *         "originalUrl": "https://...",
 *         "clicks": 42,
 *         "createdAt": "2024-01-07T...",
 *         "lastAccessed": "2024-01-07T...",
 *         "expiresAt": "2024-12-31T..." or null
 *       }
 *     ],
 *     "count": 5
 *   }
 */
async function listAllUrls(req, res) {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to view your URLs.'
      });
    }

    const Url = require('../models/url.model');
    const { sort = '-createdAt', limit = 100 } = req.query;

    // Fetch URLs for this user only, sorted by creation date (newest first)
    const urls = await Url.find({ userId: req.user.id })
      .select('shortCode originalUrl clicks createdAt lastAccessed expiresAt')
      .sort(sort)
      .limit(parseInt(limit))
      .lean();

    return res.status(200).json({
      success: true,
      data: urls,
      count: urls.length
    });
  } catch (error) {
    console.error('Error fetching URLs list:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * GET /api/url/analytics/:shortCode
 *
 * Returns analytics for a given shortCode including total clicks,
 * createdAt, and lastAccessed time.
 */
async function getAnalytics(req, res) {
  try {
    const { shortCode } = req.params;

    if (!shortCode) {
      return res.status(400).json({ success: false, error: 'Short code is required' });
    }

    const Url = require('../models/url.model');
    const urlDoc = await Url.findOne({ shortCode }).select('shortCode originalUrl createdAt clicks lastAccessed expiresAt');

    if (!urlDoc) {
      return res.status(404).json({ success: false, error: 'URL not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        shortCode: urlDoc.shortCode,
        originalUrl: urlDoc.originalUrl,
        createdAt: urlDoc.createdAt,
        clicks: urlDoc.clicks,
        lastAccessed: urlDoc.lastAccessed,
        expiresAt: urlDoc.expiresAt
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

