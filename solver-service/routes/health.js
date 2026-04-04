'use strict';
const router = require('express').Router();
const config = require('../config');

// GET /health — liveness probe
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    version: config.version,
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

// GET /v1/meta — protocol metadata for integrating partners
router.get('/v1/meta', (req, res) => {
  res.json({
    protocol: 'Brother ID',
    tld: config.tld,
    network: config.network,
    contract: config.bnsContractAddress,
    version: config.version,
    endpoints: {
      resolve:  '/v1/resolve?name={name.real}',
      reverse:  '/v1/reverse?address={0x...}',
      profile:  '/v1/profile?name={name.real}',
      domains:  '/v1/domains?address={0x...}',
    },
    requestId: req.requestId,
  });
});

module.exports = router;
