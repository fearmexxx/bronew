'use strict';
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const config = require('./config');
const requestId = require('./middleware/requestId');
const { helmetMiddleware, corsOptions, limiter, speedLimiter } = require('./middleware/security');

// Routes
const healthRoutes = require('./routes/health');
const resolveRoutes = require('./routes/resolve');
const reverseRoutes = require('./routes/reverse');
const profileRoutes = require('./routes/profile');
const identityRoutes = require('./routes/identity');

const app = express();

// ─── Trust proxy (for Railway, Cloudflare, etc.) ─────────────────────────────
// This is required for rate-limiting to correctly identify the real client IP.
app.set('trust proxy', 1);

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(helmetMiddleware);
app.use(cors(corsOptions));
app.use(requestId);

// Structured request logging
const logFormat = config.env === 'production'
  ? ':remote-addr :method :url :status :res[content-length] :response-time ms'
  : 'dev';
app.use(morgan(logFormat));

// Parse JSON (though all our endpoints are GET, good practice for future)
app.use(express.json({ limit: '10kb' }));

// ─── Rate Limiting & Slowdown (apply to all /v1 routes) ──────────────────────
app.use('/v1', speedLimiter);
app.use('/v1', limiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/', healthRoutes);      // /health, /v1/meta
app.use('/', resolveRoutes);     // /v1/resolve
app.use('/', reverseRoutes);     // /v1/reverse
app.use('/', profileRoutes);     // /v1/profile, /v1/domains
app.use('/', identityRoutes);    // /v1/identity

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.originalUrl} does not exist.`,
    availableEndpoints: ['/health', '/v1/meta', '/v1/resolve', '/v1/reverse', '/v1/profile', '/v1/domains', '/v1/identity'],
    requestId: req.requestId,
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  // CORS violation
  if (err.status === 403) {
    return res.status(403).json({
      error: 'Forbidden',
      message: err.message,
      requestId: req.requestId,
    });
  }
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    requestId: req.requestId,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`\n🔷 Brother ID Resolver API v${config.version}`);
  console.log(`   Network  : ${config.network}`);
  console.log(`   Contract : ${config.bnsContractAddress}`);
  console.log(`   Port     : ${config.port}`);
  console.log(`   Env      : ${config.env}`);
  console.log(`\n   Endpoints:`);
  console.log(`     GET /health`);
  console.log(`     GET /v1/meta`);
  console.log(`     GET /v1/resolve?name=satoshi.real`);
  console.log(`     GET /v1/reverse?address=0x...`);
  console.log(`     GET /v1/profile?name=satoshi.real`);
  console.log(`     GET /v1/domains?address=0x...`);
  console.log(`     GET /v1/identity?name=satoshi.real`);
  console.log(`\n   Security:`);
  console.log(`     Rate limit : ${config.rateLimitMax} req / ${config.rateLimitWindowMs / 60000}min`);
  console.log(`     Slowdown   : after ${config.slowDownThreshold} req`);
  console.log(`     CORS       : ${config.allowedOrigins || 'open (dev)'}`);
  console.log(`     Cache TTL  : ${config.cacheTtlSecs}s (${config.negativeCacheTtlSecs}s negative)\n`);
});

module.exports = app;
