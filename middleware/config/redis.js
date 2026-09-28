/**
 * Redis Configuration
 * 
 * Why Redis is Used:
 * 
 * Redis is an in-memory data structure store that serves as a high-performance cache
 * and key-value database. In a URL shortener application, Redis provides several benefits:
 * 
 * 1. Performance Optimization:
 *    - URL lookups are the most frequent operation (every redirect request)
 *    - Redis provides sub-millisecond response times (much faster than MongoDB disk I/O)
 *    - Reduces database load by caching frequently accessed URLs
 * 
 * 2. Caching Strategy:
 *    - Cache shortCode → originalUrl mappings for fast lookups
 *    - Reduces MongoDB queries by serving cached data
 *    - Can cache click counts and other frequently accessed data
 * 
 * 3. Scalability:
 *    - Handles high traffic volumes efficiently
 *    - Reduces load on the primary database (MongoDB)
 *    - Can be used for rate limiting and session management
 * 
 * 4. Cost Efficiency:
 *    - Fewer database queries = lower database costs
 *    - Can handle millions of requests per second
 * 
 * 5. Additional Use Cases:
 *    - Rate limiting (prevent abuse)
 *    - Temporary data storage
 *    - Real-time analytics (e.g., popular URLs)
 *    - Distributed locking (if needed for concurrent operations)
 * 
 * Cache-Aside Pattern:
 *   1. Check Redis cache first
 *   2. If cache miss, query MongoDB
 *   3. Store result in Redis for future requests
 *   4. Set TTL (Time To Live) to ensure data freshness
 */

const { createClient } = require('redis');

// Read the Redis connection URL from environment variables
// Format: redis://localhost:6379 or redis://username:password@host:port
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client instance
// This client will be reused across the application for all Redis operations
let redisClient = null;

/**
 * Connect to Redis server
 * 
 * Establishes a connection to Redis using the connection URL from environment variables.
 * The client is configured to automatically reconnect if the connection is lost.
 * 
 * @returns {Promise<void>}
 * @throws {Error} If Redis connection fails
 */
async function connectRedis() {
  try {
    // Create Redis client with connection URL
    redisClient = createClient({
      url: REDIS_URL
    });

    // Handle connection errors
    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });

    // Log successful connection
    redisClient.on('connect', () => {
      console.log('🔄 Connecting to Redis...');
    });

    redisClient.on('ready', () => {
      console.log('✅ Connected to Redis successfully');
    });

    // Connect to Redis server
    await redisClient.connect();

    return redisClient;
  } catch (error) {
    console.error('❌ Redis connection error:', error.message);
    // In production, you might want to continue without Redis (graceful degradation)
    // or exit the process depending on your requirements
    throw error;
  }
}

/**
 * Get Redis client instance
 * 
 * Returns the connected Redis client. Use this function to access Redis
 * throughout the application after connecting.
 * 
 * @returns {Object|null} Redis client instance or null if not connected
 */
function getRedisClient() {
  return redisClient;
}

/**
 * Disconnect from Redis
 * 
 * Closes the connection to Redis server. Useful for graceful shutdown.
 * 
 * @returns {Promise<void>}
 */
async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    console.log('✅ Disconnected from Redis');
  }
}

// Export functions for use in other modules
module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis
};

