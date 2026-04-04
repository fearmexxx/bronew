'use strict';
const router = require('express').Router();
const { query, validationResult } = require('express-validator');
const cache = require('../cache/store');
const bns = require('../resolver/bns');

// Input validation rules
const validateReverse = [
  query('address')
    .isString().withMessage('address must be a string')
    .trim()
    .notEmpty().withMessage('address is required')
    .customSanitizer((v) => v.toLowerCase())
    .matches(/^0x[0-9a-f]{1,64}$/)
      .withMessage('address must be a valid hex Starknet address (0x followed by up to 64 hex chars)'),
];

/**
 * GET /v1/reverse?address=0x049d36...
 * Resolves a Starknet wallet address to its primary .real domain.
 */
router.get('/v1/reverse', validateReverse, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid Input',
      details: errors.array().map((e) => e.msg),
      requestId: req.requestId,
    });
  }

  const address = req.query.address.toLowerCase();
  const cacheKey = `reverse:${address}`;

  // Cache hit?
  const cached = cache.get(cacheKey);
  if (cached.hit) {
    const { requestId: _old, ...rest } = cached.data;
    return res.json({ ...rest, cached: true, requestId: req.requestId });
  }

  try {
    const result = await bns.reverseLookup(address);

    if (!result) {
      const notFound = {
        address,
        name: null,
        error: 'No primary domain set for this address.',
      };
      cache.setNegative(cacheKey, notFound);
      return res.status(404).json({ ...notFound, requestId: req.requestId });
    }

    const response = {
      address,
      name: result.name,
    };
    cache.set(cacheKey, response);
    return res.json({ ...response, cached: false, requestId: req.requestId });
  } catch (err) {
    console.error(`[reverse] Error for "${address}":`, err.message);
    return res.status(502).json({
      error: 'Upstream Error',
      message: 'Failed to query the Starknet network. Please retry.',
      requestId: req.requestId,
    });
  }
});

module.exports = router;
