const mongoose = require('mongoose');

/**
 * URL Schema for storing shortened URLs
 * 
 * This model represents a shortened URL entry with tracking capabilities.
 * Indexes are added to optimize common query patterns:
 * - shortCode: Frequently queried for URL lookups (unique constraint ensures no duplicates)
 * - createdAt: Used for sorting/filtering by creation date
 * - expiresAt: Enables efficient queries for expired URLs cleanup
 */
const urlSchema = new mongoose.Schema({
  // The original long URL that was shortened
  originalUrl: {
    type: String,
    required: [true, 'Original URL is required'],
    trim: true
  },

  // The short code used in the shortened URL (e.g., "abc123")
  // Unique index ensures no duplicate codes and speeds up lookups
  shortCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },

  // Timestamp when the URL was created
  // Indexed for efficient sorting and filtering by date
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Optional expiration date for temporary URLs
  // Indexed to enable efficient queries for expired URLs cleanup
  expiresAt: {
    type: Date,
    default: null,
    index: true
  },

  // Counter for tracking how many times the shortened URL was accessed
  clicks: {
    type: Number,
    default: 0
  }
,
  // Timestamp for the last time this short URL was accessed
  // Useful for analytics and sorting by recent activity
  lastAccessed: {
    type: Date,
    default: null,
    index: true
  },

  // Reference to the User who created this shortened URL
  // Indexed for efficient queries to find all URLs by a specific user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  }
});

/**
 * Performance Benefits of Indexes:
 * 
 * 1. shortCode (unique index):
 *    - O(log n) lookup time instead of O(n) full collection scan
 *    - Prevents duplicate codes at database level
 *    - Critical for URL resolution (most frequent operation)
 * 
 * 2. createdAt (index):
 *    - Fast sorting when listing URLs by creation date
 *    - Efficient date range queries (e.g., "URLs created last week")
 *    - Useful for analytics and reporting features
 * 
 * 3. expiresAt (index):
 *    - Enables efficient cleanup of expired URLs
 *    - Fast queries like: db.urls.find({ expiresAt: { $lt: new Date() } })
 *    - Prevents full collection scan when removing expired entries
 */

// Export the model
module.exports = mongoose.model('Url', urlSchema);

