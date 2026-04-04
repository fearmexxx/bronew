'use strict';
require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  env: process.env.NODE_ENV || 'development',

  // Starknet
  rpcUrl: process.env.RPC_URL ||
    'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/qXU4ta4yLmxUhIoLb-cZ7KtsNn808Pjw',
  bnsContractAddress: process.env.BNS_CONTRACT_ADDRESS ||
    '0xfad69cad592fc44fe3673717a643929eb5a62689eb2abeb7a1a0d3ae105371',
  network: process.env.NETWORK || 'starknet-sepolia',

  // Security
  // Comma-separated list of allowed origins. Empty string = allow all (dev mode).
  allowedOrigins: process.env.ALLOWED_ORIGINS || '',

  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  slowDownThreshold: parseInt(process.env.SLOW_DOWN_THRESHOLD || '50', 10),
  slowDownDelayMs: parseInt(process.env.SLOW_DOWN_DELAY_MS || '500', 10),

  // Caching
  cacheTtlSecs: parseInt(process.env.CACHE_TTL_SECS || '60', 10),
  negativeCacheTtlSecs: parseInt(process.env.NEGATIVE_CACHE_TTL_SECS || '5', 10),

  // API version
  version: '2.0.0',
  tld: '.real',
};

module.exports = config;
