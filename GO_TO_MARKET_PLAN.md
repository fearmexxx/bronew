# Brother ID go-to-market plan

Updated September 18, 2026.

## Executive decision

Brother ID should launch as **the human-readable private payment layer for Starknet**, not as a broad sovereign-identity protocol and not as a direct replacement for Starknet ID.

The narrow promise is: **send private STRK to a person or team you recognize, without copying an address or publicly exposing the payment relationship.**

The current product proves the core interaction: resolve a `.real` name, ask Xverse or Ready to construct the STRK20 action, and let the wallet retain the viewing key and proof responsibility. Naming registration remains on Sepolia and must be presented as beta infrastructure until a reviewed Mainnet deployment exists.

## Why this wedge

- STRK20 is live on Starknet Mainnet and explicitly supports shielded balances and private transfers through compatible wallets.
- Starknet already has established identity infrastructure. Competing head-on for generic names creates a costly two-sided adoption problem.
- Payments have a repeatable job: contributors, grant recipients, traders, creators, and treasury operators do not want every commercial relationship exposed through a public address graph.
- A readable recipient removes a major source of irreversible payment mistakes while privacy supplies the differentiated value.

## Initial customer profile

### Primary design partners

Starknet-native teams making recurring payments to contributors, creators, researchers, community moderators, or grant recipients.

The buyer is initially a founder, DAO operator, or treasury lead. The end user is the recipient who activates an STRK20 wallet and receives private assets.

### Secondary users

- Privacy-conscious Starknet power users.
- Public creators who want private tips or payment requests.
- Grant programs and public-goods communities.
- Wallet and treasury products that can embed the Brother ID resolver/SDK.

### Explicit non-targets for the first 90 days

- General-purpose decentralized identity.
- Speculative domain trading.
- A new privacy pool or wallet.
- Cross-chain identity aggregation.
- AI-agent autonomy without real customer demand.

## Product ladder

### Free — acquisition

- Resolve supported names and Starknet addresses.
- Shield, private-send, and unshield through the user's wallet.
- Local contact book.
- Public payment-request link with no sensitive amount embedded by default.

### Pro — validate after usage

Target price: $9–15/month, charged only after users demonstrate repeat payment activity.

- Multiple payment profiles and branded request pages.
- Encrypted contact backup.
- Private payment notes/receipts when the protocol supports them safely.
- Exportable transaction evidence controlled by the viewing-key owner.

### Teams — primary business model

Target starting price: $99/month per workspace after five design-partner pilots.

- Batch private payouts.
- Roles and approval policies.
- Recipient readiness checks before payroll execution.
- Payment templates, scheduled workflows, and accounting exports.
- Scoped disclosure and audit workflows.

Do not launch a token or depend on domain speculation for revenue. Domain fees can become a secondary revenue line only after a security-reviewed Mainnet registry and demonstrated demand.

## Distribution plan

### Phase 0 — public beta, now

- Make activation → shield → private send reliable for a first-time user.
- Launch recipient-owned payment links that prefill the payer's send flow.
- Publish a 60-second demo centered on one story: open link → private payment → confirmation.
- Onboard the first five users manually and observe every failure.

### Phase 1 — design partners, days 1–30

- Recruit 20 interviews from Starknet Discord, wallet communities, grant recipients, and DAO operators.
- Run five concierge pilots. Manually onboard each payer and recipient.
- Publish a 60-second product demo and one technical integration article.
- Seek Xverse/Ready feedback on activation and Wallet API compatibility.

### Phase 2 — repeat usage, days 31–60

- Payment links, direct-address fallback, Starknet ID resolution, and safe `.real` network gating are shipped.
- Recipient activation failures now provide an actionable invite; improve this only if wallet APIs expose a privacy-safe preflight.
- Consent-based, address-free funnel measurement is shipped; enable its Vercel dashboard and inspect pilot drop-off.
- Convert at least two design partners into paid team pilots.

### Phase 3 — team workflow, days 61–90

- Build batch private payouts using atomic multi-action support where wallet compatibility permits.
- Add roles, approval rules, receipts, and scoped disclosure exports.
- Decide whether `.real` deserves a Mainnet contract based on actual alias usage. Require an external contract review before deployment.

## Metrics and gates

### North-star metric

Weekly successful private payments to a human-readable recipient.

### Funnel

1. Landing visitor → wallet connected.
2. Wallet connected → privacy activated.
3. Privacy activated → first shield.
4. First shield → first private send.
5. First send → second send within 14 days.

### 30-day success thresholds

- 20 customer interviews.
- 10 wallets successfully activated.
- At least 40% of connected compatible wallets complete activation.
- At least 50% of activated wallets complete one private send.
- Five users complete a second private send within 14 days.
- Five design partners and two written pilot commitments.

If fewer than five people complete a private send after hands-on onboarding, stop building broad consumer UI and pivot toward an embedded resolver/onboarding SDK for wallets and payment apps.

## Product risks

- **Wallet rollout risk:** Xverse Wallet API capabilities are still landing. Maintain Ready as a first-class path and fail with precise instructions.
- **Activation friction:** registration/viewing-key setup happens inside the wallet. Treat readiness and onboarding as core product features.
- **Network mismatch:** `.real` currently resolves through Sepolia while money settles on Mainnet. Add direct-address and Starknet ID fallback before public growth.
- **Recipient readiness:** a private transfer requires a pool-ready recipient. Preflight this before users generate a proof.
- **Privacy language:** `.real` ownership is public and Mainnet pool interaction metadata remains visible. Never claim total anonymity.
- **Security:** do not deploy naming contracts to Mainnet without review, monitoring, upgrade policy, and incident procedures.

## Immediate backlog, ordered

1. Five manually onboarded design-partner pilots.
2. Review the consented funnel after each pilot and fix the largest drop-off.
3. Batch payout prototype, gated by repeat-use evidence.
4. Security review and Mainnet naming decision, gated by alias demand.

## Evidence base

- STRK20 builder stack and Wallet API positioning: https://www.starknet.io/blog/push-to-private/
- Starknet privacy launch and wallet ecosystem: https://www.starknet.io/blog/privacy-live-on-starknet/
- Existing Starknet identity infrastructure: https://docs.starknet.id/
