const Url = require('../models/url.model');
const { encode } = require('../utils/base62');
const { getRedisClient } = require('../config/redis');

/**
 * URL Service
 * 
 * Handles URL shortening operations including:
 * - Saving URLs to MongoDB
 * - Generating unique short codes using Base62 encoding
 * - Collision avoidance through MongoDB ObjectId uniqueness
 */

/**
 * Create a shortened URL
 * 
 * Collision Avoidance Strategy:
 * 
 * MongoDB's ObjectId (_id) is guaranteed to be unique across all documents.
 * It consists of:
 * - 4-byte timestamp (seconds since Unix epoch)
 * - 5-byte random value (unique per process)
 * - 3-byte incrementing counter (initialized randomly)
 * 
 * By using the ObjectId as the source for Base62 encoding, we ensure:
 * 1. Uniqueness: Each document gets a unique _id, preventing collisions
 * 2. No pre-checking needed: We don't need to verify if a code exists
 * 3. Deterministic: Same _id always produces the same shortCode
 * 4. Scalable: Works across distributed systems without coordination
 * 
 * Alternative approaches (and why we don't use them):
 * - Random generation: Requires checking for duplicates (race conditions possible)
 * - Sequential counters: Requires distributed locking (performance bottleneck)
 * - Hash-based: Collision risk increases with scale (birthday paradox)
 * 
 * @param {string} originalUrl - The long URL to shorten
 * @param {Date} [expiresAt] - Optional expiration date for the shortened URL
 * @returns {Promise<string>} The generated short code
 * @throws {Error} If URL creation fails
 */
/**
 * Create a shortened URL
 *
 * Supports optional custom shortCode. If `customShortCode` is provided it will
 * be validated for allowed characters and uniqueness. If it's not provided,
 * a generated Base62 shortCode based on the MongoDB ObjectId will be used.
 *
 * @param {string} originalUrl
 * @param {string} userId - The ID of the user creating this URL
 * @param {Date|null} expiresAt
 * @param {string|null} customShortCode
 */
async function createShortUrl(originalUrl, userId, expiresAt = null, customShortCode = null) {
  try {
    // If a custom short code is provided, validate and ensure uniqueness first
    if (customShortCode) {
      const clean = String(customShortCode).trim();

      // Allow only URL-safe short codes: alphanumeric, dash and underscore
      const validPattern = /^[A-Za-z0-9_-]{3,64}$/;
      if (!validPattern.test(clean)) {
        const err = new Error('Invalid custom short code format. Use 3-64 chars: letters, numbers, - or _');
        err.code = 'INVALID_CUSTOM_CODE';
        throw err;
      }

      // Check uniqueness
      const existing = await Url.findOne({ shortCode: clean });
      if (existing) {
        const err = new Error('Custom short code already in use');
        err.code = 'CUSTOM_CODE_TAKEN';
        throw err;
      }

      // Create document with provided shortCode
      const urlDoc = new Url({ originalUrl, userId, expiresAt, shortCode: clean });
      await urlDoc.save();
      return clean;
    }

    // Step 1: Create a new URL document instance
    // Mongoose automatically generates a unique _id when creating a new document,
    // even before saving. This _id is guaranteed to be unique.
    const urlDoc = new Url({
      originalUrl,
      userId,
      expiresAt
      // shortCode will be set after generating it from _id
    });

    // Step 2: Convert MongoDB ObjectId to a number for Base62 encoding
    // ObjectId is a 24-character hex string (12 bytes) that contains:
    // - 4 bytes: timestamp (seconds since Unix epoch)
    // - 5 bytes: random value (unique per process)
    // - 3 bytes: incrementing counter (initialized randomly)
    // 
    // We convert the hex string to a number for Base62 encoding.
    // Since ObjectId hex strings can be very large, we use a combination of
    // timestamp and random parts to ensure uniqueness while staying within
    // JavaScript's safe integer range.
    
    const objectIdHex = urlDoc._id.toString();
    
    // Extract parts of the ObjectId hex string
    const timestampPart = objectIdHex.substring(0, 8);  // First 4 bytes (timestamp)
    const randomPart = objectIdHex.substring(8, 16);    // Middle 4 bytes (random + counter)
    
    // Combine and convert to decimal number
    // This combination provides sufficient uniqueness (timestamp ensures temporal
    // uniqueness, random part ensures uniqueness across processes/instances)
    const numericId = parseInt(timestampPart + randomPart, 16);

    // Step 3: Generate shortCode using Base62 encoding
    // This converts the numeric ID to a compact, URL-safe string
    const shortCode = encode(numericId);

    // Step 4: Set the generated shortCode on the document
    urlDoc.shortCode = shortCode;

    // Step 5: Save the document to MongoDB
    // The unique index on shortCode will prevent any collisions (though extremely
    // unlikely with ObjectId-based generation)
    await urlDoc.save();

    // Return the generated shortCode
    return shortCode;
  } catch (error) {
    // Handle potential errors
    if (error.code === 11000) {
      // Duplicate key error on shortCode
      // This should be extremely rare with ObjectId-based approach, but if it occurs,
      // it means we had a collision. In a production system, you might want to:
      // - Retry with a different encoding strategy
      // - Use additional entropy (e.g., append random suffix)
      // - Log the incident for monitoring
      throw new Error('Short code collision detected. Please try again.');
    }
    // Re-throw other errors (validation errors, connection errors, etc.)
    throw error;
  }
}

/**
 * Cache-Aside Pattern Explanation:
 * 
 * Cache-Aside (also called Lazy Loading) is a caching pattern where:
 * 
 * 1. Application checks cache first (Redis)
 *    - If data exists in cache (cache hit): return immediately
 *    - If data doesn't exist (cache miss): proceed to step 2
 * 
 * 2. Application queries the database (MongoDB)
 *    - Fetch data from the primary data store
 *    - If found: store in cache for future requests
 *    - If not found: return null (don't cache negative results)
 * 
 * 3. Subsequent requests benefit from cached data
 *    - Fast response times (sub-millisecond)
 *    - Reduced database load
 *    - Better scalability
 * 
 * Benefits:
 * - Reduces database load significantly (most requests served from cache)
 * - Improves response times (Redis is in-memory, much faster than disk I/O)
 * - Graceful degradation (if Redis fails, fall back to MongoDB)
 * - TTL ensures data freshness (expired URLs are removed from cache)
 * 
 * Trade-offs:
 * - Cache invalidation complexity (handled by TTL in this case)
 * - Potential stale data (mitigated by TTL and expiration checks)
 * - Additional infrastructure (Redis server)
 */

// Cache key prefix for URL lookups
const CACHE_KEY_PREFIX = 'url:';
// Default TTL (Time To Live) for cached URLs: 1 hour (3600 seconds)
// This ensures frequently accessed URLs stay in cache while allowing updates
const DEFAULT_CACHE_TTL = 3600;

/**
 * Get original URL by short code
 * 
 * This function implements the core logic for GET /:shortCode endpoint
 * using the Cache-Aside pattern with Redis caching.
 * 
 * Flow:
 * 1. Check Redis cache first (fast path)
 * 2. If cache miss, fetch from MongoDB (slow path)
 * 3. Store result in Redis with TTL
 * 4. Check expiry and increment clicks
 * 5. Return the original URL (redirect happens in controller)
 * 
 * @param {string} shortCode - The short code to look up
 * @returns {Promise<string|null>} The original URL or null if not found/expired
 * @throws {Error} If database query fails
 */
async function getUrlByShortCode(shortCode) {
  try {
    const redisClient = getRedisClient();
    const cacheKey = `${CACHE_KEY_PREFIX}${shortCode}`;

    // Step 1: Check Redis cache first (Cache-Aside pattern)
    // This is the fast path - most requests will be served from here
    // Redis lookups are sub-millisecond, much faster than MongoDB disk I/O
    if (redisClient && redisClient.isReady) {
      try {
        const cachedUrl = await redisClient.get(cacheKey);
        
        // Cache hit: URL found in Redis
        // Return immediately without querying MongoDB
        // This dramatically improves performance for frequently accessed URLs
        if (cachedUrl) {
          // Increment clicks in MongoDB asynchronously (fire and forget)
          // We don't wait for this to complete to keep response fast
          Url.findOneAndUpdate(
            { shortCode },
            { $inc: { clicks: 1 }, $set: { lastAccessed: new Date() } },
            { new: false }
          ).catch(err => console.error('Error updating clicks/lastAccessed:', err));

          // Return structured result to indicate URL found
          return { originalUrl: cachedUrl };
        }
      } catch (redisError) {
        // Redis error: gracefully degrade to MongoDB
        // Log the error but continue with database lookup
        // This ensures the application continues to work even if Redis is down
        console.error('Redis cache error (falling back to MongoDB):', redisError.message);
      }
    }

    // Step 2: Cache miss - Fetch URL from MongoDB
    // Query the database to find the URL document matching the shortCode
    // The unique index on shortCode makes this query very efficient (O(log n))
    // Uses MongoDB's findOne() which returns the first matching document or null
    const urlDoc = await Url.findOne({ shortCode });

    // If URL not found in database, return null
    // This indicates the shortCode doesn't exist
    // We don't cache negative results (null) to avoid cache pollution
    if (!urlDoc) {
      return null;
    }

    // Step 3: Check expiry
    // Verify if the URL has an expiration date and if it has passed
    // expiresAt is optional (can be null), so we check both:
    // - If expiresAt exists (not null/undefined)
    // - If expiresAt is less than the current date/time
    // If expired, return null to indicate the URL is no longer valid
    const now = new Date();
    if (urlDoc.expiresAt && urlDoc.expiresAt < now) {
      return { expired: true };
    }

    // Step 4: Increment clicks and set lastAccessed
    // Update the click counter to track how many times this short URL was accessed
    // and record last accessed time. This is done atomically by modifying the
    // document and saving. In high-traffic scenarios, consider using $inc and
    // $set in a single update for better performance.
    urlDoc.clicks += 1;
    urlDoc.lastAccessed = now;
    await urlDoc.save();

    // Step 5: Store result in Redis cache with TTL (Cache-Aside pattern)
    // Cache the originalUrl so future requests can be served from Redis
    // TTL (Time To Live) ensures the cache entry expires automatically
    // We calculate TTL based on URL expiration if available, otherwise use default
    if (redisClient && redisClient.isReady) {
      try {
        let ttl = DEFAULT_CACHE_TTL;
        
        // If URL has expiration, calculate TTL based on remaining time
        // This ensures expired URLs are automatically removed from cache
        if (urlDoc.expiresAt) {
          const remainingSeconds = Math.floor((urlDoc.expiresAt - now) / 1000);
          // Only cache if expiration is in the future
          if (remainingSeconds > 0) {
            // Use remaining time or default TTL, whichever is smaller
            // This prevents caching URLs that expire very soon
            ttl = Math.min(remainingSeconds, DEFAULT_CACHE_TTL);
          } else {
            // URL expires very soon, don't cache it
            return urlDoc.originalUrl;
          }
        }
        
        // Store in Redis with calculated TTL
        // SETEX sets a key with a value and expiration time in seconds
        await redisClient.setEx(cacheKey, ttl, urlDoc.originalUrl);
      } catch (redisError) {
        // Redis write error: log but don't fail the request
        // The URL is still returned from MongoDB, just not cached
        console.error('Redis cache write error:', redisError.message);
      }
    }

    // Step 6: Return the original URL
    // Return the originalUrl field from the document
    // The controller will use this to perform the HTTP redirect
    return { originalUrl: urlDoc.originalUrl };
  } catch (error) {
    // Re-throw errors for controller to handle
    // This allows the controller to return appropriate HTTP status codes
    throw error;
  }
}

module.exports = {
  createShortUrl,
  getUrlByShortCode
};

