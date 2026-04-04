'use strict';
const NodeCache = require('node-cache');
const config = require('../config');

// Main cache for successful resolutions
const resolveCache = new NodeCache({
  stdTTL: config.cacheTtlSecs,
  checkperiod: Math.ceil(config.cacheTtlSecs / 2),
  useClones: false,
});

// Negative cache for "not found" results — shorter TTL to avoid stale misses
const negativeCache = new NodeCache({
  stdTTL: config.negativeCacheTtlSecs,
  checkperiod: 2,
  useClones: false,
});

/**
 * Get a cached item. Returns { hit: true, data } or { hit: false }.
 */
function get(key) {
  const normalKey = key.toLowerCase();
  const data = resolveCache.get(normalKey);
  if (data !== undefined) return { hit: true, data };

  const negData = negativeCache.get(normalKey);
  if (negData !== undefined) return { hit: true, data: negData };

  return { hit: false };
}

/**
 * Set a positive cache entry.
 */
function set(key, value) {
  resolveCache.set(key.toLowerCase(), value);
}

/**
 * Set a negative cache entry (not-found).
 */
function setNegative(key, value) {
  negativeCache.set(key.toLowerCase(), value);
}

/**
 * Invalidate a specific key from both caches.
 */
function del(key) {
  const k = key.toLowerCase();
  resolveCache.del(k);
  negativeCache.del(k);
}

module.exports = { get, set, setNegative, del };
