# Brother ID — compact project memory

Updated: 2026-09-18. Read this file first when resuming work; use deeper documents only for the active phase.

## Product

- Positioning: human-readable private STRK payments on Starknet.
- Live app: https://bronew.vercel.app/
- Repository: https://github.com/fearmexxx/bronew (`main`).
- Revenue hypothesis: free payment acquisition → paid team payout workflows. Do not prioritize grants, a token, or domain speculation.

## Current architecture

- Frontend: React/Vite in `client1/`.
- Privacy: STRK20 Wallet API v0.10.3+, executed by Xverse/Ready; the app never receives viewing keys.
- Mainnet: STRK20 shield, private transfer, unshield, direct addresses, and `.stark` resolution.
- Sepolia: `.real` naming contract at `client1/src/constants/index.ts`.
- Payment links: `?pay=<address>`; generation requires Mainnet and an activated privacy wallet.
- Activation invites: `?invite=1`; used when a recipient is not registered with STRK20.

## Safety invariants

- Never resolve a Sepolia `.real` name into a Mainnet payment.
- Never claim recipient readiness before the wallet/protocol confirms it; Wallet API has no safe public readiness query.
- Never log or collect wallet addresses for analytics without explicit consent.
- Never expose or commit wallet private keys, keystores, `.env` files, or viewing keys.
- Do not deploy naming contracts to Mainnet without an external review and incident plan.

## Verification baseline

From `client1/`: `npm run typecheck`, `npm test`, `npm run build`. From repo root: `git diff --check`.

## Completed launch phases

1. STRK20 wallet integration and Xverse/Ready capability handling.
2. Mainnet switching, activation guidance, and direct-address transfers.
3. Recipient-owned payment links.
4. Starknet ID `.stark` resolution, resolver provenance, safe `.real` network gating, and recipient activation invites.

## Next phase

Consent-based, address-free funnel metrics followed by five concierge user pilots. Only after real repeat-use evidence: prototype batch private payouts.

## Detailed references

- Strategy: `GO_TO_MARKET_PLAN.md`
- Integration: `STRK20_INTEGRATION.md`
- Phase audits: `docs/audits/`
- Historical work: `PROGRESS_LOG.md`
