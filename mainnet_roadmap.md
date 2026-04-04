# Brother ID Mainnet Roadmap 🚀

This document outlines the critical steps required to migrate the Brother Naming Service (BNS) from Sepolia Testnet to Starknet Mainnet.

---

## 🏗️ Phase 1: Smart Contract Finalization
Before mainnet deployment, the V3 contract suite requires final hardening.

- [ ] **Fix Auction Settle Ownership Gap**: Address the bug where `settle()` doesn't update the resolver mapping (Bug #1 in Stress Test).
- [ ] **Implement Swap-and-Pop Deletion**: Optimize `_remove_from_active_auctions` to prevent gapped arrays and reduce gas on high-volume auction lookups.
- [ ] **Contract Audit**: Final internal review + professional audit (e.g., Trail of Bits, OpenZeppelin, or Starknet-specific auditors).
- [ ] **Finalize Fee Collector**: Setup a multi-sig (Argent/Braavos) address for the treasury and auction fee recipient.

---

## 🛠️ Phase 2: Infrastructure & Resolver Setup
The resolver service must be robust and cost-efficient for production.

- [ ] **Solver Service Deployment**: Deploy the hardened Express API to a production environment (Railway, Fly.io, or AWS).
- [ ] **Global Rate Limiting**: Enable Redis-backed rate limiting for the Resolver API if scaling across multiple instances.
- [ ] **Mainnet Indexer**: Point the Apibara indexer to Mainnet blocks and update MongoDB connection strings.
- [ ] **SSL/CORS**: Finalize production certificate setup and whitelist only the production frontend URL.

---

## 📱 Phase 3: Frontend Transition
Switching the UI from Sepolia to Mainnet without downtime.

- [ ] **Environment Variable Switch**:
    - Update `VITE_BNS_CONTRACT_ADDRESS` to the Mainnet Proxy.
    - Update `VITE_STARKNET_NETWORK` to `'mainnet'`.
    - Update `VITE_SOLVER_URL` to the production resolver endpoint.
- [ ] **Asset Validation**: Verify STRK (Mainnet) token address in `constants/index.ts`.
- [ ] **Analytics & Tracking**: Implement basic tracking (Plausible/PostHog) for registration success rates.

---

## 📈 Phase 4: Launch & Ecosystem
Growing the Brother ID ecosystem on day one.

- [ ] **Genesis Registration Event**: Coordinate with early partners for a "Brother Badge" or whitelist period if desired.
- [ ] **Partner Integrations**:
    - [ ] **AVNU & Fibrous**: Submit PRs to integrate Brother ID resolution into their swap interfaces.
    - [ ] **Argent/Braavos**: Ensure names resolve correctly in mainstream wallets.
    - [ ] **Starkscan/Voyager**: Coordinate on-chain metadata rendering.
- [ ] **X (Twitter) Marketing**: Launch the referral program and "Share on X" features as finalized in the Registration Wizard.

---

## 📋 Pre-Flight Checklist (The "Red Button" List)

1. [ ] Is the Proxy initialized with Mainnet STRK?
2. [ ] Does the `get_token_uri` return the correct Mainnet URL?
3. [ ] Is the Treasury set to the Multi-sig?
4. [ ] Is `is_mint_active` set to `true`?
5. [ ] **Wait for block confirmation before announcing.**

> [!IMPORTANT]
> Once deployed to Mainnet, contract logic is immutable (unless upgraded via Proxy). Ensure the initialization parameters (Base Price, Fee BPS) are quadruple-checked.

> [!TIP]
> Use a staging domain (e.g., `stage.brother.real`) for final integration tests on Mainnet before pointing the primary `brother.real` DNS.
