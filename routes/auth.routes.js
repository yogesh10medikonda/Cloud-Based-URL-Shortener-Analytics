const express = require('express');
const router = express.Router();
const { signup, login, getProfile } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth');

/**
 * Auth Routes
 * 
 * POST /api/auth/signup - Create new user account
 * POST /api/auth/login - Login and receive JWT token
 * GET /api/auth/profile - Get current user profile (requires auth)
 */

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes
router.get('/profile', authMiddleware, getProfile);

module.exports = router;
