import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.mjs';
import { createUser, findUserByEmail, findUserByUsername, findUserById } from '../services/databaseService.js';
import User from '../models/User.js';

const router = express.Router();

// JWT secrets (in production, use env and stronger secrets)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-change-in-production';

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '30d';

function signAccessToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { userId: user._id, tokenVersion: user.token_version },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
}

// Validation middleware
const validateSignup = [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

const validateLogin = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Signup endpoint
router.post('/signup', validateSignup, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { username, email, password } = req.body;

  // Check if user already exists by email
  const existingUserByEmail = await findUserByEmail(email);
  if (existingUserByEmail) {
    return res.status(400).json({
      success: false,
      error: 'User with this email already exists'
    });
  }

  // Check if user already exists by username
  const existingUserByUsername = await findUserByUsername(username);
  if (existingUserByUsername) {
    return res.status(400).json({
      success: false,
      error: 'Username already taken'
    });
  }

  try {
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await createUser({
      username,
      email,
      password_hash: hashedPassword
    });

    // Generate tokens
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create user'
    });
  }
}));

// Login endpoint
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate tokens
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login'
    });
  }
}));

// Logout endpoint (client-side token removal)
router.post('/logout', asyncHandler(async (req, res) => {
  // If a refresh token is provided, bump token_version to invalidate future refreshes
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, REFRESH_SECRET);
        await User.findByIdAndUpdate(decoded.userId, { $inc: { token_version: 1 } });
      } catch (_) {
        // ignore invalid token on logout
      }
    }
  } catch (_) {}

  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
}));

// Get current user profile
router.get('/profile', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { 
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
}));

// Refresh token endpoint
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'Refresh token required' });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await findUserById(payload.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check token version for rotation/invalidation
    if (typeof payload.tokenVersion !== 'number' || payload.tokenVersion !== user.token_version) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    // Rotate: bump version
    await User.findByIdAndUpdate(user._id, { $inc: { token_version: 1 } });
    const updated = await findUserById(user._id);

    const newAccessToken = signAccessToken(updated);
    const newRefreshToken = signRefreshToken(updated);

    return res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken }
    });
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }
}));

export default router;
