# Phase audit — consent-based funnel analytics

Date: 2026-09-18

## Scope

Measure the launch funnel without collecting wallet addresses or other payment identifiers.

## Implementation

- Vercel Web Analytics loads only after explicit opt-in.
- A persistent Privacy control lets a visitor change or withdraw consent.
- Page-view URLs are stripped of query parameters and fragments before transmission, protecting `?pay=` values.
- Custom events use a compile-time event allowlist.
- Event properties pass through a runtime allowlist containing only network, recipient type, and entry-source categories.
- No event accepts wallet addresses, names, amounts, balances, transaction hashes, viewing keys, error text, or free-form values.
- Analytics and the product both fail safely when storage, scripts, or network requests are blocked.

## Funnel events

`private_wallet_opened` → `wallet_connect_opened` → `wallet_connected` → `privacy_activated` → `shield_confirmed` → `recipient_resolved` → `private_send_confirmed`.

Supporting events: `payment_link_copied`, `activation_invite_copied`, and `unshield_confirmed`.

## Audit findings

- Fixed repeated private-balance refreshes overcounting privacy activation.
- Fixed blur/send races overcounting recipient resolution.
- Production dependency audit initially found inherited high-severity advisories.
- Compatible transitive upgrades cleared Google SDK tree advisories.
- `@sats-connect/core@0.17.6` pins vulnerable `axios@1.13.5`; a tested package override now uses patched `axios@1.20.0`.
- Final production dependency audit: zero known vulnerabilities.

## Operational requirement

Vercel Web Analytics must be enabled for the production project. Custom-event availability depends on the Vercel plan; the app remains fully functional when event intake is unavailable.

## Release gate

TypeScript, unit tests, production build, production dependency audit, whitespace audit, hosted CI, and deployed-bundle verification.
