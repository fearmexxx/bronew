# Brother ID Resolver API — Partner Integration Guide

**Version:** 2.0.0 | **Network:** Starknet Sepolia (Mainnet coming soon)

The Brother ID Resolver API allows wallets, dApps, and explorers to integrate `.real` domain resolution directly — no SDK or on-chain calls required.

---

## Base URL

```
http://localhost:3001   (self-hosted)
```

---

## Endpoints

### `GET /health`
Liveness check for uptime monitors.
```bash
curl http://localhost:3001/health
```
```json
{ "status": "ok", "uptime": 1234, "version": "2.0.0", "requestId": "..." }
```

---

### `GET /v1/meta`
Returns protocol metadata. Useful for auto-configuring integrations.
```bash
curl http://localhost:3001/v1/meta
```
```json
{
  "protocol": "Brother ID",
  "tld": ".real",
  "network": "starknet-sepolia",
  "contract": "0xfad6...",
  "version": "2.0.0",
  "endpoints": { ... }
}
```

---

### `GET /v1/resolve?name=satoshi.real`
**Forward resolution** — domain name → Starknet wallet address.

| Parameter | Required | Description |
|---|---|---|
| `name` | ✅ | Domain name, with or without `.real` suffix |

```bash
curl "http://localhost:3001/v1/resolve?name=satoshi.real"
```
```json
{
  "name": "satoshi.real",
  "address": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  "expiry": 1893456000,
  "isGracePeriod": false,
  "isVerified": true,
  "tokenId": "0x1",
  "isSubdomain": false,
  "cached": false,
  "requestId": "3f9a2b..."
}
```

**Errors:**
- `400` — Invalid name format
- `404` — Domain not found / expired
- `429` — Rate limit exceeded
- `502` — Starknet network error

---

### `GET /v1/reverse?address=0x049d36...`
**Reverse resolution** — Starknet wallet address → primary `.real` domain.

| Parameter | Required | Description |
|---|---|---|
| `address` | ✅ | Hex Starknet address (`0x` prefixed) |

```bash
curl "http://localhost:3001/v1/reverse?address=0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"
```
```json
{
  "address": "0x049d36...",
  "name": "satoshi.real",
  "cached": false,
  "requestId": "a1b2c..."
}
```

---

### `GET /v1/profile?name=satoshi.real`
**Full identity profile** — the richest data endpoint, ideal for wallet address book UIs.

```bash
curl "http://localhost:3001/v1/profile?name=satoshi.real"
```
```json
{
  "name": "satoshi.real",
  "address": "0x049d36...",
  "expiry": 1893456000,
  "isGracePeriod": false,
  "isVerified": true,
  "tokenId": "0x1",
  "isSubdomain": false,
  "records": {
    "avatar": "https://example.com/avatar.png",
    "twitter": "@satoshi",
    "discord": "satoshi#1234",
    "url": "https://satoshi.btc",
    "description": "The OG.",
    "nickname": "Satoshi"
  },
  "cached": false,
  "requestId": "x9z..."
}
```

---

### `GET /v1/domains?address=0x...`
Returns all `.real` domains owned by a wallet address.

```bash
curl "http://localhost:3001/v1/domains?address=0x049d36..."
```
```json
{
  "address": "0x049d36...",
  "domains": ["satoshi.real", "bitcoin.real"],
  "count": 2,
  "cached": false,
  "requestId": "d4e5f..."
}
```

---

## Security & Rate Limits

All endpoints share a rate limit:
- **100 requests per 15 minutes per IP**
- Progressive slowdown starts at 50 req/window
- Headers returned: `RateLimit-Remaining`, `RateLimit-Reset`, `Retry-After`

**Caching:** Successful results are cached for 60 seconds. Cache status is indicated by `"cached": true` in the response.

**Request Tracing:** Every response includes a `X-Request-ID` header and `requestId` body field for log correlation.

---

## Self-Hosting

```bash
git clone <repo>
cd solver-service
cp .env.example .env
# Edit .env with your RPC URL and ALLOWED_ORIGINS
npm install
npm start
```

**Docker:**
```bash
docker build -t bns-resolver .
docker run -p 3001:3001 --env-file .env bns-resolver
```

---

## Deployment (Railway)

1. Connect repo to Railway
2. Set environment variables from `.env.example`
3. Railway auto-detects `Dockerfile` — no additional config needed
