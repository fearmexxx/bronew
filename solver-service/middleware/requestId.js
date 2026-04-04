'use strict';
const { v4: uuidv4 } = require('uuid');

/**
 * Injects a unique X-Request-ID header into every request & response.
 * Partners can use this ID to correlate their logs with ours.
 */
function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || uuidv4();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}

module.exports = requestId;
