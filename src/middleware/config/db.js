// MongoDB connection configuration using Mongoose.
// This module exposes a reusable connectDB function so the same
// connection can be shared across the entire application.

const mongoose = require('mongoose');

// Read the MongoDB connection string from environment variables.
// Make sure MONGO_URI is defined in your .env file.
const { MONGO_URI } = process.env;

/**
 * Establish a connection to MongoDB using Mongoose.
 * This function can be imported and called once when the app starts.
 * Mongoose maintains a singleton connection internally, so subsequent
 * `mongoose.model` calls will reuse this underlying connection.
 */
async function connectDB() {
  try {
    if (!MONGO_URI) {
      console.error('❌ ERROR: MONGO_URI environment variable is not defined!');
      console.error('   Please create a .env file in the project root with:');
      console.error('   MONGO_URI=mongodb://127.0.0.1:27017/urlshortener');
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    // Use Mongoose to connect to MongoDB.
    await mongoose.connect(MONGO_URI);

    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // Optionally exit the process so container/orchestrator can restart it.
    process.exit(1);
  }
}

// Export the connection function so it can be reused in the app entry point.
module.exports = {
  connectDB,
};


