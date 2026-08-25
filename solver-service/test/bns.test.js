'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { _test } = require('../resolver/bns');

test('parses IdentityContract u256 balance using both limbs', () => {
  const parsed = _test.parseIdentityDetails(['0x123', '0x1', '0x5', '0x1']);
  assert.equal(parsed.primaryDomainFelt, '0x123');
  assert.equal(parsed.isPrivacyEnabled, true);
  assert.equal(parsed.shieldedBalance, ((1n << 128n) + 5n).toString());
});

test('rejects malformed IdentityContract responses', () => {
  assert.throws(() => _test.parseIdentityDetails(['0x1']), /Malformed/);
});

test('normalizes addresses without losing leading zero padding', () => {
  assert.equal(_test.toHexAddress(1n), `0x${'0'.repeat(63)}1`);
});
