'use strict';
const router = require('express').Router();
const { query, validationResult } = require('express-validator');
const cache = require('../cache/store');
const bns = require('../resolver/bns');
const config = require('../config');

// Input validation rules
const validateResolve = [
  query('name')
    .isString().withMessage('name must be a string')
    .trim()
    .notEmpty().withMessage('name is required')
    .customSanitizer((v) => v.toLowerCase().replace(/\.real$/, ''))
    .isLength({ min: 4, max: 31 }).withMessage('name must be 4–31 characters (without .real)')
    .matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{4,}$/)
      .withMessage('name may only contain lowercase letters, digits, and hyphens'),
];

/**
 * GET /v1/resolve?name=satoshi.real
 * Resolves a .real domain to a Starknet wallet address.
 */
router.get('/v1/resolve', validateResolve, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid Input',
      details: errors.array().map((e) => e.msg),
      requestId: req.requestId,
    });
  }

  const name = req.query.name.toLowerCase().replace(/\.real$/, '');
  const cacheKey = `resolve:${name}`;

  // Cache hit?
  const cached = cache.get(cacheKey);
  if (cached.hit) {
    const { requestId: _old, ...rest } = cached.data;
    return res.json({ ...rest, cached: true, requestId: req.requestId });
  }

  try {
    const result = await bns.resolve(name);

    if (!result) {
      const notFound = {
        name: name + config.tld,
        address: null,
        error: 'Domain not found, not registered, or expired.',
      };
      cache.setNegative(cacheKey, notFound);
      return res.status(404).json({ ...notFound, requestId: req.requestId });
    }

    const response = {
      name: name + config.tld,
      address: result.address,
      expiry: result.expiry,
      isGracePeriod: result.isGracePeriod,
      isVerified: result.isVerified,
      tokenId: result.tokenId,
      isSubdomain: result.isSubdomain,
    };
    cache.set(cacheKey, response);
    return res.json({ ...response, cached: false, requestId: req.requestId });
  } catch (err) {
    console.error(`[resolve] Error for "${name}":`, err.message);
    return res.status(502).json({
      error: 'Upstream Error',
      message: 'Failed to query the Starknet network. Please retry.',
      requestId: req.requestId,
    });
  }
});

module.exports = router;
