import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const rateLimitStandard = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/** Strict rate limiter for sensitive endpoints (auth, shared playlists) to prevent scraping/brute force. */
export const rateLimitStrict = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const rateLimitAuth = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});
