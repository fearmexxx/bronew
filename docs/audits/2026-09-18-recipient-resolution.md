# Phase audit — recipient resolution and activation invites

Date: 2026-09-18

## Scope

Make Mainnet private payments safer and easier to complete by adding Starknet ID resolution, explicit resolver provenance, strict network boundaries, and a recovery path when the recipient has not activated STRK20.

## Changes reviewed

- Added a single recipient resolver with typed provenance (`address`, `starknet-id`, `brother-id`).
- Added `.stark` resolution through Starknet.js on the connected network.
- Kept `.real` on Sepolia and fail-closed for Mainnet payments.
- Reject zero-address (including direct input), invalid-address, unknown-suffix, and unregistered results.
- Deduplicate concurrent resolution triggered by field blur and immediate transfer submission.
- Added an on-blur recipient preview showing resolver and network.
- Convert transfer-time `NOT_REGISTERED` into a recipient activation invite.
- Added an invite landing state with wallet activation guidance.
- Removed remaining hackathon/Sprint wording from the payment surface.

## Privacy and security findings

- Good: no readiness API is invented and no address is sent to an analytics/backend service.
- Good: a Sepolia alias can no longer silently determine a Mainnet recipient.
- Good: invite URLs contain no wallet address, amount, viewing key, or private balance.
- Residual: recipient readiness is learned only when STRK20 rejects the transfer attempt; this may still cost user time generating a proof depending on wallet behavior.
- Residual: RPC availability affects name resolution. Direct addresses remain the fallback.
- Residual: `.stark` ownership and resolution are public; human-readable naming does not itself add anonymity.

## Test coverage

- Direct address normalization and connected-network labeling.
- `.stark` provider routing and provenance.
- `.real` Sepolia resolution and Mainnet rejection.
- Unknown format and zero-address rejection.
- Existing STRK20 action/version and contract-view regression tests.

## Release gate

Required before push: TypeScript check, unit tests, production build, whitespace audit. Required after push: GitHub Actions success and production bundle verification.
