const User = require('../models/user.model');
const { generateToken } = require('../config/jwt');

/**
 * Email validation regex - RFC 5322 simplified
 * Validates basic email format
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false; // RFC 5321 max length
  return EMAIL_REGEX.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, error?: string }
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long' };
  }
  if (password.length > 255) {
    return { valid: false, error: 'Password must not exceed 255 characters' };
  }
  return { valid: true };
}

/**
 * User signup handler
 * Creates a new user account with email and password
 * 
 * Request body: { email, password }
 * Response: { success, token, user: { id, email } } on success
 * Errors: 
 *   - 400: Validation error (invalid email, weak password)
 *   - 409: Email already registered
 *   - 500: Server error (MongoDB connection, bcrypt failure)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const signup = async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[SIGNUP-${requestId}] New signup request received`);
    
    const { email, password } = req.body;

    // ===== VALIDATION =====
    
    // Check email is provided and valid
    if (!email) {
      console.log(`[SIGNUP-${requestId}] Missing email field`);
      return res.status(400).json({
        success: false,
        error: 'Email is required',
        details: 'Please provide a valid email address'
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      console.log(`[SIGNUP-${requestId}] Invalid email format: ${email}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        details: 'Please provide a valid email address'
      });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.log(`[SIGNUP-${requestId}] Invalid password: ${passwordValidation.error}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid password',
        details: passwordValidation.error
      });
    }

    // ===== CHECK DUPLICATE EMAIL =====
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[SIGNUP-${requestId}] Checking if email exists: ${normalizedEmail}`);
    
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      console.log(`[SIGNUP-${requestId}] Email already registered: ${normalizedEmail}`);
      return res.status(409).json({
        success: false,
        error: 'Email already registered',
        details: 'This email is already in use. Please log in or use a different email.'
      });
    }

    // ===== CREATE NEW USER =====
    console.log(`[SIGNUP-${requestId}] Creating new user: ${normalizedEmail}`);
    
    const newUser = new User({
      email: normalizedEmail,
      password: password.trim() // Trim password (user may accidentally add spaces)
    });

    // Save to database (pre-save hook will hash the password)
    await newUser.save();

    console.log(`[SIGNUP-${requestId}] User created successfully. ID: ${newUser._id}`);

    // ===== GENERATE JWT TOKEN =====
    const token = generateToken(newUser._id);

    // ===== RETURN SUCCESS RESPONSE =====
    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: newUser._id,
        email: newUser.email
      }
    });

  } catch (error) {
    // ===== ERROR HANDLING =====
    console.error(`[SIGNUP-${requestId}] Signup error:`, error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors)
        .map(err => err.message)
        .join('; ');
      console.log(`[SIGNUP-${requestId}] Validation error: ${errorMessages}`);
      
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errorMessages
      });
    }

    // Handle Mongoose duplicate key error (email already exists)
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      const email = error.keyValue?.email || 'unknown';
      console.log(`[SIGNUP-${requestId}] Duplicate email error: ${email}`);
      
      return res.status(409).json({
        success: false,
        error: 'Email already registered',
        details: 'This email is already in use. Please log in or use a different email.'
      });
    }

    // Handle password hashing errors
    if (error.message && error.message.includes('Password hashing')) {
      console.error(`[SIGNUP-${requestId}] Password hashing failed:`, error);
      
      return res.status(500).json({
        success: false,
        error: 'Server error',
        details: 'Failed to secure password. Please try again later.'
      });
    }

    // Handle MongoDB connection errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerError') {
      console.error(`[SIGNUP-${requestId}] Database error:`, error.message);
      
      return res.status(503).json({
        success: false,
        error: 'Service unavailable',
        details: 'Database connection error. Please try again later.'
      });
    }

    // Generic error response for unexpected errors
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: 'An unexpected error occurred. Please try again later.'
    });
  }
};

/**
 * User login handler
 * Authenticates user and returns JWT token
 * 
 * Request body: { email, password }
 * Response: { success, token, user: { id, email } } on success
 * Errors: 
 *   - 400: Missing email or password
 *   - 401: Invalid credentials
 *   - 500: Server error
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const login = async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[LOGIN-${requestId}] New login request received`);
    
    const { email, password } = req.body;

    // ===== VALIDATION =====
    if (!email || !password) {
      console.log(`[LOGIN-${requestId}] Missing email or password`);
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        details: 'Please provide both email and password'
      });
    }

    // ===== FIND USER =====
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[LOGIN-${requestId}] Looking up user: ${normalizedEmail}`);
    
    // Use .select('+password') to include password field (it's excluded by default)
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      console.log(`[LOGIN-${requestId}] User not found: ${normalizedEmail}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        details: 'The email or password you provided is incorrect'
      });
    }

    // ===== VERIFY PASSWORD =====
    console.log(`[LOGIN-${requestId}] Verifying password for: ${normalizedEmail}`);
    
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log(`[LOGIN-${requestId}] Invalid password for: ${normalizedEmail}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        details: 'The email or password you provided is incorrect'
      });
    }

    // ===== GENERATE JWT TOKEN =====
    console.log(`[LOGIN-${requestId}] Login successful for: ${normalizedEmail}`);
    const token = generateToken(user._id);

    // ===== RETURN SUCCESS RESPONSE =====
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        email: user.email
      }
    });

  } catch (error) {
    // ===== ERROR HANDLING =====
    console.error(`[LOGIN-${requestId}] Login error:`, error);

    // Handle MongoDB connection errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerError') {
      console.error(`[LOGIN-${requestId}] Database error:`, error.message);
      
      return res.status(503).json({
        success: false,
        error: 'Service unavailable',
        details: 'Database connection error. Please try again later.'
      });
    }

    // Generic error response
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: 'An unexpected error occurred during login. Please try again later.'
    });
  }
};

/**
 * Get current user profile
 * Protected route - requires valid JWT token
 * 
 * Response: { success, user: { id, email, createdAt } }
 * Errors:
 *   - 404: User not found
 *   - 500: Server error
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getProfile = async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[PROFILE-${requestId}] Fetching profile for user: ${req.user.id}`);
    
    const user = await User.findById(req.user.id);

    if (!user) {
      console.log(`[PROFILE-${requestId}] User not found: ${req.user.id}`);
      return res.status(404).json({
        success: false,
        error: 'User not found',
        details: 'The requested user profile does not exist'
      });
    }

    console.log(`[PROFILE-${requestId}] Profile fetched successfully: ${req.user.id}`);

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error(`[PROFILE-${requestId}] Profile fetch error:`, error);

    // Handle MongoDB connection errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerError') {
      return res.status(503).json({
        success: false,
        error: 'Service unavailable',
        details: 'Database connection error. Please try again later.'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: 'An unexpected error occurred. Please try again later.'
    });
  }
};

module.exports = {
  signup,
  login,
  getProfile
};
