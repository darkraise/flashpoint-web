import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * Standard rate limiter for most API endpoints
 * Default: 100 requests per minute per IP
 */
export const rateLimitStandard = rateLimit({
  windowMs: config.rateLimitWindowMs, // 1 minute
  max: config.rateLimitMaxRequests, // 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for sensitive endpoints (shared playlists, auth)
 * 10 requests per minute per IP to prevent scraping and brute force
 */
export const rateLimitStrict = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Lenient rate limiter for authenticated users
 * 30 requests per minute per IP
 */
export const rateLimitAuth = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per window
  message: 'Too many requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});
