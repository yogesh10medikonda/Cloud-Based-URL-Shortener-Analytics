require("dotenv").config();

// Import Express (web framework for Node.js)
const express = require("express");
const cors = require('cors');

// Import database connection function
const { connectDB } = require('../middleware/config/db');

// Import scheduler to initialize scheduled tasks
const { initializeScheduler } = require('./utils/scheduler');

// Import redirect controller for root-level redirects
const { redirectToOriginalUrl } = require('./controllers/url.controller');

// Create an Express application instance
const app = express();

// Enable CORS for the frontend running on Vite (http://localhost:5173)
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

/**
 * SECURITY: Request Body Size Limiting
 * 
 * Prevents oversized payloads from consuming server resources or causing DoS attacks.
 * Limit: 10KB per request
 * 
 * This protects against:
 * - Oversized JSON payloads that could crash the server
 * - Memory exhaustion attacks
 * - Slowloris-style DoS attacks
 * 
 * Most legitimate URL shortening requests are tiny (< 1KB):
 * {"longUrl": "https://example.com/path", "customCode": "my-code"}
 * 
 * With a 10KB limit, even multi-field requests with expiration dates are safe.
 */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb' }));

// Mount auth routes at /api/auth (no auth middleware needed for signup/login)
app.use("/api/auth", require("./routes/auth.routes"));

// Mount URL routes at /api/url (some routes protected by auth middleware)
app.use("/api/url", require("./routes/url.routes"));

// Simple health check endpoint to verify the server is running
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Root endpoint required by frontend check
app.get('/', (req, res) => {
  return res.status(200).json({ message: 'Backend is running' });
});

// Root-level redirect for short codes (placed AFTER API routes and root)
// Example: GET http://localhost:5000/abc123 -> redirects to original URL
app.get('/:shortCode', redirectToOriginalUrl);

/**
 * SECURITY: Global Error Handler Middleware
 * 
 * Catches all errors from routes and middleware
 * Prevents server crashes from unhandled errors
 * Returns proper error responses to clients
 */
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Default to 500 if no status code is set
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? message : 'An error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Read the port from environment variables, fallback to 5000 if not set
const PORT = process.env.PORT || 5000;

// Async function to start the server after database connection
async function startServer() {
  try {
    // Connect to MongoDB before starting the server
    await connectDB();

    // Initialize scheduled tasks (cleanup jobs, etc.)
    // This starts the cron scheduler for background tasks
    initializeScheduler();

    // Start the HTTP server and log a message when it is ready
    // Bind to 0.0.0.0 to make it reachable from outside
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    // Don't exit immediately - allow error to propagate naturally
    throw error;
  }
}

// Global error handlers to prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();

// Export the app instance (useful for testing or external usage)
module.exports = app;