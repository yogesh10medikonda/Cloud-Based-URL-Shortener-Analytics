const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * User Schema for authentication
 * 
 * Stores user credentials with hashed passwords.
 * Email is indexed for efficient lookups during login.
 */
const userSchema = new mongoose.Schema({
  // User's email - unique identifier for login
  // Indexed for fast lookups
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },

  // Hashed password - never store plaintext
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },

  // Account creation timestamp
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Hash password before saving to database
 * Only hash if password is new or modified
 * 
 * IMPORTANT: Using async function without next parameter for modern Mongoose versions
 * Mongoose will automatically handle promise resolution/rejection
 */
userSchema.pre('save', async function() {
  // Only hash password if it's new or has been modified
  if (!this.isModified('password')) {
    return;
  }

  try {
    // Generate salt (10 rounds is a good balance between security and performance)
    const salt = await bcrypt.genSalt(10);
    // Hash the password with the salt
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    // Re-throw error so Mongoose can handle it properly
    throw new Error(`Password hashing failed: ${error.message}`);
  }
});

/**
 * Compare plaintext password with hashed password
 * Returns true if password matches, false otherwise
 */
userSchema.methods.comparePassword = async function(plaintextPassword) {
  return await bcrypt.compare(plaintextPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
