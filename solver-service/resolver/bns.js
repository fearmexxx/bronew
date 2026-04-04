'use strict';
const { shortString } = require('starknet');
const { contract } = require('./contract');

const GRACE_PERIOD_SECS = 7776000; // 90 days

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'bigint') return value === 1n;
  if (value && typeof value === 'object') {
    if ('True' in value) return true;
    if ('False' in value) return false;
    if ('value' in value) return normalizeBool(value.value);
  }
  return false;
}

function u256ToBigInt(u256) {
  if (typeof u256 === 'bigint') return u256;
  if (typeof u256 === 'string' || typeof u256 === 'number') return BigInt(u256);
  if (u256 && typeof u256 === 'object') {
    const low = BigInt(u256.low ?? 0);
    const high = BigInt(u256.high ?? 0);
    return (high << 128n) + low;
  }
  return 0n;
}

function toHexAddress(raw) {
  if (typeof raw === 'bigint') return '0x' + raw.toString(16).padStart(64, '0');
  if (typeof raw === 'string') {
    if (raw.startsWith('0x')) return raw;
    return '0x' + BigInt(raw).toString(16).padStart(64, '0');
  }
  return '0x0';
}

/**
 * Decode a felt252 short string safely.
 * Returns empty string for zero or unprintable data.
 */
function safeDecode(felt) {
  if (!felt || felt === '0x0' || felt === 0 || felt === 0n) return '';
  try {
    const decoded = shortString.decodeShortString(felt);
    // Strip non-printable ASCII
    const clean = decoded.replace(/[^\x20-\x7E]/g, '').trim();
    // Artifact checks — corrupted FELT shards
    if (clean.length === 0) return '';
    const lower = clean.toLowerCase();
    if (['il', 'ih', 'aa', 'aaa'].includes(lower)) return '';
    if (clean.length >= 3 && /^[A-Z]+$/.test(clean)) return '';
    if (clean.length > 5 && /^[A-Z0-9]+$/.test(clean)) return '';
    return clean;
  } catch {
    return '';
  }
}

function parseExpiry(raw) {
  try {
    if (typeof raw === 'bigint') return Number(raw);
    if (typeof raw === 'string') return Number(BigInt(raw));
    if (typeof raw === 'number') return raw;
    if (raw && typeof raw === 'object') {
      const low = raw.low ?? raw.value ?? 0;
      return Number(BigInt(low));
    }
    return 0;
  } catch {
    return 0;
  }
}

// ─── BNS Read Functions ───────────────────────────────────────────────────────

/**
 * Resolve a domain name (without .real suffix) to an address.
 * Returns { address, expiry, isGracePeriod, isExpired, isVerified } or null.
 */
async function resolve(name) {
  const encoded = shortString.encodeShortString(name);

  const { provider } = require('./contract');

  // Use low-level callContract (matches what useBns.ts does successfully)
  const rawResult = await provider.callContract({
    contractAddress: require('../config').bnsContractAddress,
    entrypoint: 'get_domain_info',
    calldata: [encoded],
  }, 'latest');

  // Parse the raw array result from callContract
  // DomainDetails: handler(1), resolver(1), token_id(2:low+high), expiry_date(1), last_transfer_time(1), parent_domain(1), is_subdomain(1)
  let data = Array.isArray(rawResult) ? rawResult : (rawResult.result ?? rawResult.data ?? []);
  // Strip the leading array length element if present
  if (data.length === 9) data = data.slice(1); // with length prefix
  if (data.length < 8) return null;

  const resolverBig = BigInt(data[1]);
  if (resolverBig === 0n) return null;

  const tokenId = (BigInt(data[3]) << 128n) + BigInt(data[2]); // high<<128 + low
  const expiryRaw = data[4];
  const expiry = Number(BigInt(expiryRaw));
  const now = Math.floor(Date.now() / 1000);
  const isExpired = expiry > 0 && now > expiry + GRACE_PERIOD_SECS;
  const isGracePeriod = expiry > 0 && now > expiry && now <= expiry + GRACE_PERIOD_SECS;

  if (isExpired) return null;

  // Verification (best effort)
  let isVerified = false;
  try {
    const verRes = await provider.callContract({
      contractAddress: require('../config').bnsContractAddress,
      entrypoint: 'is_verified',
      calldata: [encoded],
    }, 'latest');
    const verData = Array.isArray(verRes) ? verRes : (verRes.result ?? verRes.data ?? []);
    isVerified = verData[0] === '0x1' || verData[0] === 1n || verData[0] === '1';
  } catch { /* ignore */ }

  return {
    address: toHexAddress(resolverBig),
    expiry: expiry || null,
    isGracePeriod,
    isVerified,
    tokenId: '0x' + tokenId.toString(16),
    isSubdomain: data[7] === '0x1' || data[7] === '1',
  };
}

/**
 * Reverse resolve a wallet address to its primary domain name.
 * Returns { name } or null.
 */
async function reverseLookup(address) {
  const { provider } = require('./contract');

  const rawResult = await provider.callContract({
    contractAddress: require('../config').bnsContractAddress,
    entrypoint: 'get_primary_domain',
    calldata: [address],
  }, 'latest');

  const data = Array.isArray(rawResult) ? rawResult : (rawResult.result ?? rawResult.data ?? []);
  const domainFelt = data[0];
  if (!domainFelt || domainFelt === '0x0' || BigInt(domainFelt) === 0n) return null;

  const decoded = shortString.decodeShortString(domainFelt);
  if (!decoded || decoded.trim() === '') return null;

  return { name: decoded.trim() + '.real' };
}

/**
 * Fetch the full identity profile for a domain.
 * Returns rich data including records and metadata.
 */
async function getProfile(name) {
  const encoded = shortString.encodeShortString(name);
  const { provider } = require('./contract');
  const contractAddr = require('../config').bnsContractAddress;

  // Parallel fetches: full_profile + is_verified + nickname text record
  const [profileResult, verResult, nickResult] = await Promise.all([
    provider.callContract({ contractAddress: contractAddr, entrypoint: 'get_full_profile', calldata: [encoded] }, 'latest'),
    provider.callContract({ contractAddress: contractAddr, entrypoint: 'is_verified', calldata: [encoded] }, 'latest').catch(() => null),
    provider.callContract({
      contractAddress: contractAddr,
      entrypoint: 'get_text',
      calldata: [encoded, shortString.encodeShortString('nickname')],
    }, 'latest').catch(() => null),
  ]);

  // get_full_profile returns: handler(1), resolver(1), token_id(2), expiry_date(1), last_transfer_time(1), parent_domain(1), is_subdomain(1), avatar(1), twitter(1), discord(1), url(1), description(1)
  let data = Array.isArray(profileResult) ? profileResult : (profileResult.result ?? profileResult.data ?? []);
  if (data.length === 0) return null;

  const resolverBig = BigInt(data[1] ?? 0);
  if (resolverBig === 0n) return null;

  const tokenId = (BigInt(data[3] ?? 0) << 128n) + BigInt(data[2] ?? 0);
  const expiry = Number(BigInt(data[4] ?? 0));
  const now = Math.floor(Date.now() / 1000);
  const isExpired = expiry > 0 && now > expiry + GRACE_PERIOD_SECS;
  const isGracePeriod = expiry > 0 && now > expiry && now <= expiry + GRACE_PERIOD_SECS;

  if (isExpired) return null;

  const verData = verResult ? (Array.isArray(verResult) ? verResult : (verResult.result ?? [])) : [];
  const isVerified = verData[0] === '0x1' || verData[0] === 1n || verData[0] === '1';

  const nickData = nickResult ? (Array.isArray(nickResult) ? nickResult : (nickResult.result ?? [])) : [];
  const nickname = nickData[0] ? safeDecode(nickData[0]) : '';

  // Text records start at index 8 (after DomainDetails 8 fields)
  return {
    name: name + '.real',
    address: toHexAddress(resolverBig),
    expiry: expiry || null,
    isGracePeriod,
    isVerified,
    tokenId: '0x' + tokenId.toString(16),
    isSubdomain: data[7] === '0x1' || data[7] === '1',
    records: {
      avatar:      safeDecode(data[8]),
      twitter:     safeDecode(data[9]),
      discord:     safeDecode(data[10]),
      url:         safeDecode(data[11]),
      description: safeDecode(data[12]),
      nickname,
    },
  };
}

/**
 * Fetch all domains owned by a wallet address.
 * Returns array of domain name strings (without .real).
 */
async function getDomainsOf(address) {
  const { provider } = require('./contract');
  const rawResult = await provider.callContract({
    contractAddress: require('../config').bnsContractAddress,
    entrypoint: 'get_domains_of',
    calldata: [address],
  }, 'latest');

  let data = Array.isArray(rawResult) ? rawResult : (rawResult.result ?? rawResult.data ?? []);
  // First element is array length
  if (data.length === 0) return [];
  const len = Number(BigInt(data[0]));
  const items = data.slice(1, 1 + len);

  return items
    .map((d) => {
      try {
        if (!d || BigInt(d) === 0n) return null;
        const hex = '0x' + BigInt(d).toString(16);
        return shortString.decodeShortString(hex);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

module.exports = { resolve, reverseLookup, getProfile, getDomainsOf };
