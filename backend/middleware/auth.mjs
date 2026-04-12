import jwt from 'jsonwebtoken';
import { asyncHandler } from './errorHandler.mjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Authentication middleware — OPTIONAL mode.
 * Auth is globally bypassed in this app (all users operate without login).
 * If a valid token IS present it is decoded and attached to req.user.
 * If no token is present the request is allowed through with req.user = null.
 * This prevents 401 errors on every route while still supporting future auth.
 */
export const authenticateToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // No token — allow through without blocking (auth is optional)
    req.user = { userId: null };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // Invalid token — still allow through (don't block unauthenticated requests)
    req.user = { userId: null };
    next();
  }
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
});
