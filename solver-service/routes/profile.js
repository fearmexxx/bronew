'use strict';
const router = require('express').Router();
const { query, validationResult } = require('express-validator');
const cache = require('../cache/store');
const bns = require('../resolver/bns');
const config = require('../config');

// Shared input validators
const nameValidator = query('name')
  .isString()
  .trim()
  .notEmpty().withMessage('name is required')
  .customSanitizer((v) => v.toLowerCase().replace(/\.real$/, ''))
  .isLength({ min: 4, max: 31 }).withMessage('name must be 4–31 characters')
  .matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{4,}$/)
    .withMessage('name may only contain lowercase letters, digits, and hyphens');

const addressValidator = query('address')
  .isString()
  .trim()
  .notEmpty().withMessage('address is required')
  .customSanitizer((v) => v.toLowerCase())
  .matches(/^0x[0-9a-f]{1,64}$/)
    .withMessage('address must be a valid hex Starknet address');

/**
 * GET /v1/profile?name=satoshi.real
 * Returns the full identity profile for a domain.
 */
router.get('/v1/profile', [nameValidator], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid Input',
      details: errors.array().map((e) => e.msg),
      requestId: req.requestId,
    });
  }

  const name = req.query.name.toLowerCase().replace(/\.real$/, '');
  const cacheKey = `profile:${name}`;

  const cached = cache.get(cacheKey);
  if (cached.hit) {
    return res.json({ ...cached.data, cached: true, requestId: req.requestId });
  }

  try {
    const result = await bns.getProfile(name);

    if (!result) {
      const notFound = { name: name + config.tld, error: 'Domain not found, not registered, or expired.' };
      cache.setNegative(cacheKey, notFound);
      return res.status(404).json({ ...notFound, requestId: req.requestId });
    }

    const { requestId: _old2, cached: _c, ...pureResult } = { ...result, requestId: undefined, cached: undefined };
    const response = { ...pureResult };
    cache.set(cacheKey, response);
    return res.json({ ...response, cached: false, requestId: req.requestId });
  } catch (err) {
    console.error(`[profile] Error for "${name}":`, err.message);
    return res.status(502).json({
      error: 'Upstream Error',
      message: 'Failed to query the Starknet network. Please retry.',
      requestId: req.requestId,
    });
  }
});

/**
 * GET /v1/domains?address=0x...
 * Returns all domains owned by a wallet address.
 */
router.get('/v1/domains', [addressValidator], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid Input',
      details: errors.array().map((e) => e.msg),
      requestId: req.requestId,
    });
  }

  const address = req.query.address.toLowerCase();
  const cacheKey = `domains:${address}`;

  const cached = cache.get(cacheKey);
  if (cached.hit) {
    return res.json({ ...cached.data, cached: true, requestId: req.requestId });
  }

  try {
    const domains = await bns.getDomainsOf(address);
    const response = {
      address,
      domains: domains.map((d) => d + config.tld),
      count: domains.length,
    };
    cache.set(cacheKey, response);
    return res.json({ ...response, cached: false, requestId: req.requestId });
  } catch (err) {
    console.error(`[domains] Error for "${address}":`, err.message);
    return res.status(502).json({
      error: 'Upstream Error',
      message: 'Failed to query the Starknet network. Please retry.',
      requestId: req.requestId,
    });
  }
});

module.exports = router;
