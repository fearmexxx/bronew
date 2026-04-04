'use strict';
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const config = require('../config');

// ─── CORS ─────────────────────────────────────────────────────────────────────
// In production set ALLOWED_ORIGINS="https://app.brother.domains,https://avnu.fi"
// In dev, leave it empty to allow all.
const allowedOriginsList = config.allowedOrigins
  ? config.allowedOrigins.split(',').map((o) => o.trim())
  : [];

const corsOptions = {
  origin: allowedOriginsList.length === 0
    ? '*'                     // dev: open
    : (origin, callback) => { // prod: whitelist
        // Allow server-to-server calls (no Origin header)
        if (!origin) return callback(null, true);
        if (allowedOriginsList.includes(origin)) return callback(null, true);
        return callback(
          Object.assign(new Error('Blocked by CORS policy'), { status: 403 }),
          false
        );
      },
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Request-ID', 'X-API-Key'],
  exposedHeaders: ['X-Request-ID', 'Retry-After', 'X-RateLimit-Remaining'],
  maxAge: 600, // 10 min preflight cache
};

// ─── Rate Limit ───────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,  // Return RateLimit-* headers
  legacyHeaders: false,
  // Trust proxy is configured in express (see server.js)
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Max ${config.rateLimitMax} requests per ${config.rateLimitWindowMs / 60000} minutes.`,
      retryAfter: res.getHeader('Retry-After'),
      requestId: req.requestId,
    });
  },
});

// ─── Slow Down ────────────────────────────────────────────────────────────────
// Starts adding delay after slowDownThreshold req/window,
// giving non-malicious slowness before a hard ban.
const speedLimiter = slowDown({
  windowMs: config.rateLimitWindowMs,
  delayAfter: config.slowDownThreshold,
  delayMs: (hits) => (hits - config.slowDownThreshold) * config.slowDownDelayMs,
});

// ─── Helmet ───────────────────────────────────────────────────────────────────
const helmetMiddleware = helmet({
  crossOriginEmbedderPolicy: false, // Needed for public APIs
  contentSecurityPolicy: false,     // Not a browser app
});

module.exports = { helmetMiddleware, corsOptions, limiter, speedLimiter, cors };
