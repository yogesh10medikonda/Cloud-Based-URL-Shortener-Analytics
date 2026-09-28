const Url = require('../models/url.model');
const { getRedisClient } = require('../../middleware/config/redis');

/**
 * Cleanup Service for Expired URLs
 * 
 * TTL Index vs Manual Cleanup - Comparison:
 * 
 * MongoDB TTL Index (Automatic):
 * ===============================
 * Pros:
 * - Fully automatic - MongoDB handles deletion in the background
 * - No application code needed - set it once and forget it
 * - Efficient - MongoDB's background task runs periodically
 * - No scheduling overhead - handled by database engine
 * 
 * Cons:
 * - Less control over deletion timing (runs every 60 seconds)
 * - Cannot add custom logic (e.g., logging, notifications)
 * - Cannot clean up related data (e.g., Redis cache entries)
 * - Harder to monitor and track cleanup operations
 * - Cannot batch delete for better performance
 * 
 * Example TTL Index Setup:
 *   urlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
 *   // This automatically deletes documents when expiresAt < current time
 * 
 * Manual Cleanup (Scheduled Job):
 * ===============================
 * Pros:
 * - Full control over when and how cleanup happens
 * - Can add custom logic (logging, metrics, notifications)
 * - Can clean up related data (Redis cache, external services)
 * - Better monitoring and observability
 * - Can batch delete for better performance
 * - Can handle edge cases and special conditions
 * - Can generate reports on deleted URLs
 * 
 * Cons:
 * - Requires scheduling infrastructure (node-cron, external scheduler)
 * - Application overhead (runs in Node.js process)
 * - Need to handle errors and retries manually
 * - More code to maintain
 * 
 * Why We Use Manual Cleanup:
 * ==========================
 * 1. Redis Cache Cleanup: We need to remove expired URLs from Redis cache
 *    - TTL index only removes from MongoDB, not Redis
 *    - Manual cleanup can clear both MongoDB and Redis
 * 
 * 2. Monitoring & Logging: We want to track cleanup operations
 *    - Log how many URLs were deleted
 *    - Monitor cleanup performance
 *    - Track storage space reclaimed
 * 
 * 3. Flexibility: Can adjust cleanup frequency based on needs
 *    - Daily cleanup is sufficient for most use cases
 *    - Can change to hourly, weekly, etc. as needed
 * 
 * 4. Batch Operations: Can delete in batches for better performance
 *    - Process large numbers of expired URLs efficiently
 *    - Avoid long-running transactions
 * 
 * 5. Future Enhancements: Can add features like:
 *    - Analytics on expired URLs
 *    - Notifications before expiration
 *    - Archive expired URLs instead of deleting
 */

/**
 * Delete expired URLs from MongoDB
 * 
 * This function finds and removes all URLs where expiresAt < current date/time.
 * Uses the expiresAt index for efficient querying.
 * 
 * @returns {Promise<Object>} Cleanup statistics (deletedCount, etc.)
 */
async function deleteExpiredUrls() {
  try {
    const now = new Date();

    // Find all expired URLs
    // The expiresAt index makes this query efficient (O(log n))
    // Only queries URLs that have an expiration date set
    const expiredUrls = await Url.find({
      expiresAt: { $exists: true, $ne: null, $lt: now }
    }).select('shortCode expiresAt').lean();

    if (expiredUrls.length === 0) {
      return {
        deletedCount: 0,
        message: 'No expired URLs found'
      };
    }

    // Extract shortCodes for Redis cleanup
    const shortCodes = expiredUrls.map(url => url.shortCode);

    // Delete expired URLs from MongoDB
    // Using deleteMany for efficient batch deletion
    // The expiresAt index ensures this operation is fast
    const deleteResult = await Url.deleteMany({
      expiresAt: { $exists: true, $ne: null, $lt: now }
    });

    // Clean up Redis cache for expired URLs
    // Remove cached entries to free up memory
    const redisClient = getRedisClient();
    if (redisClient && redisClient.isReady) {
      try {
        // Delete cache entries for expired URLs
        // Using pipeline for better performance when deleting multiple keys
        const pipeline = redisClient.multi();
        shortCodes.forEach(shortCode => {
          pipeline.del(`url:${shortCode}`);
        });
        await pipeline.exec();
      } catch (redisError) {
        // Log Redis cleanup error but don't fail the operation
        console.error('Error cleaning up Redis cache:', redisError.message);
      }
    }

    return {
      deletedCount: deleteResult.deletedCount,
      shortCodesDeleted: shortCodes.length,
      timestamp: now.toISOString()
    };
  } catch (error) {
    console.error('Error deleting expired URLs:', error);
    throw error;
  }
}

/**
 * Cleanup statistics and logging
 * 
 * Logs cleanup operation results for monitoring and debugging.
 * 
 * @param {Object} stats - Cleanup statistics from deleteExpiredUrls
 */
function logCleanupStats(stats) {
  console.log('🧹 Cleanup completed:', {
    deletedCount: stats.deletedCount,
    timestamp: stats.timestamp,
    message: `Removed ${stats.deletedCount} expired URL(s)`
  });
}

module.exports = {
  deleteExpiredUrls,
  logCleanupStats
};

