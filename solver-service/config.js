'use strict';
require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  env: process.env.NODE_ENV || 'development',

  // Starknet
  rpcUrl: process.env.RPC_URL ||
    'https://api.cartridge.gg/x/starknet/sepolia',
  bnsContractAddress: process.env.BNS_CONTRACT_ADDRESS ||
    '0x0797edc2bfaa44fcf46aa55a0f9210d5c698de8553a144e69038dfd5ba4592b8',
  identityContractAddress: process.env.IDENTITY_CONTRACT_ADDRESS ||
    '0x0789d496b1257bff236a722df1243c4d26210dac453f431538d44c669487e07e',
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
