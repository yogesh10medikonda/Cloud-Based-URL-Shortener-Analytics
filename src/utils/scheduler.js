const cron = require('node-cron');
const { deleteExpiredUrls, logCleanupStats } = require('../services/cleanup.service');

// Scheduler Utility
// Sets up scheduled tasks using node-cron.
// Cron jobs run in the Node.js process and execute at specified intervals.

// Schedule daily cleanup of expired URLs
// Runs once per day at 2:00 AM (server time).
// Cron Expression: '0 2 * * *'
// Why 2 AM? Low traffic time, minimal impact on users, server resources typically more available
function scheduleCleanup() {
  // To run at different times, modify the cron expression:
  // Every hour: '0 * * * *'
  // Every 6 hours: '0 */6 * * *'
  // Every day at midnight: '0 0 * * *'
  // Every Sunday at 3 AM: '0 3 * * 0'
  // Schedule cleanup to run daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('🕐 Starting scheduled cleanup of expired URLs...');
      
      // Execute cleanup
      const stats = await deleteExpiredUrls();
      
      // Log results
      logCleanupStats(stats);
      
      console.log('✅ Scheduled cleanup completed successfully');
    } catch (error) {
      console.error('❌ Scheduled cleanup failed:', error.message);
      // Don't throw - allow scheduler to continue running
      // In production, consider sending alerts/notifications
    }
  }, {
    scheduled: true,
    timezone: 'UTC' // Use UTC to avoid timezone issues
  });

  console.log('📅 Scheduled cleanup task initialized: Daily at 2:00 AM UTC');
}

// Initialize all scheduled tasks
// Call this function when the application starts to begin scheduling.
function initializeScheduler() {
  scheduleCleanup();
  console.log('✅ Scheduler initialized');
}

module.exports = {
  scheduleCleanup,
  initializeScheduler
};

