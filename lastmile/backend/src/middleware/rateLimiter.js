import logger from '../utils/logger.js';

// In-memory sliding window rate limiter
const requestCounts = new Map();

export const rateLimiter = (options = { windowMs: 60 * 1000, max: 15 }) => {
  return (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || 'global';
    const now = Date.now();
    const windowStart = now - options.windowMs;

    if (!requestCounts.has(key)) {
      requestCounts.set(key, []);
    }

    const timestamps = requestCounts.get(key).filter(ts => ts > windowStart);
    timestamps.push(now);
    requestCounts.set(key, timestamps);

    if (timestamps.length > options.max) {
      logger.warn(`Rate limit exceeded for IP: ${key}`);
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again in a minute.'
      });
    }

    next();
  };
};
