const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting Middleware
 * 
 * Why Rate Limiting is Essential for Abuse Prevention:
 * 
 * 1. Resource Protection:
 *    - Prevents excessive database writes (each shorten request creates a MongoDB document)
 *    - Protects server resources (CPU, memory, network bandwidth)
 *    - Reduces costs (database operations, storage)
 * 
 * 2. Abuse Prevention:
 *    - Stops automated bots from creating thousands of URLs
 *    - Prevents spam and malicious URL creation
 *    - Limits DoS (Denial of Service) attacks
 *    - Stops single users from monopolizing resources
 * 
 * 3. Fair Usage:
 *    - Ensures all users get fair access to the service
 *    - Prevents one user from degrading service for others
 *    - Maintains service quality and availability
 * 
 * 4. Cost Control:
 *    - Each shortened URL consumes storage space
 *    - Database operations have associated costs
 *    - Prevents runaway costs from abuse
 * 
 * 5. Security:
 *    - Reduces attack surface (fewer requests = fewer attack vectors)
 *    - Helps identify suspicious patterns (repeated rate limit hits)
 *    - Protects against enumeration attacks
 * 
 * How It Works:
 * - Tracks requests per IP address
 * - Uses sliding window algorithm (requests reset after time window)
 * - Returns HTTP 429 (Too Many Requests) when limit exceeded
 * - Includes Retry-After header to inform clients when to retry
 */

/**
 * Rate limiter for URL shortening endpoint (STRICT)
 * 
 * Limits: 10 requests per minute per IP address (AGGRESSIVE)
 * 
 * This stricter limit:
 * - Prevents automated URL creation attacks
 * - Protects against spam and abuse
 * - Limits resource consumption
 * - Still allows legitimate users (10 URLs/min = 600/hour = 14,400/day)
 * 
 * Configuration:
 * - windowMs: 1 minute (60,000 milliseconds)
 * - max: 10 requests per window
 * - message: User-friendly error message
 * - standardHeaders: Include RateLimit-* headers in response
 * - legacyHeaders: Include X-RateLimit-* headers for compatibility
 */
const shortenUrlRateLimiter = rateLimit({
  // Time window: 1 minute (in milliseconds)
  // After this time, the request count resets for the IP
  windowMs: 60 * 1000, // 1 minute

  // Maximum number of requests allowed per IP within the window
  // 10 requests per minute = 600 per hour = 14,400 per day
  // Aggressive limit prevents abuse while allowing normal usage
  max: 10,

  // Error message returned when rate limit is exceeded
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
    message: 'You have exceeded the rate limit of 10 requests per minute. Please wait 60 seconds before creating more URLs.'
  },

  // Include standard rate limit headers in response
  // These headers help clients understand their rate limit status
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers

  // Handler function called when rate limit is exceeded
  // Customizes the response sent to the client
  handler: (req, res) => {
    const resetTime = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: 'You have exceeded the rate limit of 10 requests per minute. Please try again later.',
      retryAfter: resetTime, // Seconds until reset
      limit: {
        max: req.rateLimit.limit,
        current: req.rateLimit.current,
        remaining: Math.max(0, req.rateLimit.limit - req.rateLimit.current)
      }
    });
  },

  // Skip rate limiting for successful requests (only count failed requests)
  // Set to false to count all requests regardless of success/failure
  skipSuccessfulRequests: false,

  // Skip rate limiting for failed requests (only count successful requests)
  // Set to false to count all requests regardless of success/failure
  skipFailedRequests: false,

  // Key generator function - determines how to identify users
  // By default, uses IP address (req.ip)
  // You can customize this to use user ID, API key, etc.
  keyGenerator: (req) => {
    // Prefer authenticated user ID over IP (when available)
    // This prevents one user from bypassing limit with multiple IPs
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }

    // Fall back to IP address for unauthenticated requests
    return req.ip || req.connection.remoteAddress;
  }
});

module.exports = {
  shortenUrlRateLimiter
};

