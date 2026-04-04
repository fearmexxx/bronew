# Brother ID Technical Audit Report 🛡️

**Date:** April 5, 2026  
**Revision:** 0.9.3 (Infrastructure Hardening)  
**Status:** Pre-Mainnet Review  

---

## 🏗️ 1. Smart Contract Audit (`contracts/`)
The BNS V3 contract suite was reviewed for reentrancy, access control, and business logic consistency.

### 🔴 High Severity: Post-Settlement Resolution Gap
- **Location**: `lib.cairo` → `settle()`
- **Issue**: The settlement function successfully transfers the domain NFT to the winner but fails to update the `_domain_to_address` mapping.
- **Impact**: The domain will still resolve to the seller's address even after the auction is finalized. The winner must manually call `set_resolver` to fix this.
- **Recommendation**: Update `settle()` to call `_domain_to_address.write(domain, winner)` immediately after NFT transfer.

### 🟡 Medium Severity: Active Auction Index Decay (Gapped Array)
- **Location**: `lib.cairo` → `_remove_from_active_auctions()`
- **Issue**: The current implementation for removing auctions does not correctly shrink the `_active_auction_count` or uses a search-and-zero pattern that leaves "phantom" indices.
- **Impact**: Over hundreds of auctions, `get_active_auction_domains()` will become increasingly expensive (gas) as it iterates over cleared indices.
- **Recommendation**: Implement a **Swap-and-Pop** pattern to ensure the active array is always contiguous.

### 🔵 Low Severity: Unused Withdrawal Parameter
- **Location**: `lib.cairo` → `withdraw(domain: felt252)`
- **Issue**: The `domain` parameter is read but ignored. The function always withdraws the user's *entire* refundable balance.
- **Impact**: Non-breaking, but misleading ABI for third-party integrators.

---

## 🌐 2. Resolver API Audit (`solver-service/`)
The Express-based resolution service was audited for common web vulnerabilities and Starknet-specific data handling.

### ✅ Pass: 7-Layer Security Implementation
- **Helmet**: Correctly implemented to strip fingerprinting headers and prevent clickjacking.
- **CORS**: Configured with a dynamic whitelist; currently defaults to "Allow All" for dev convenience but supports strict production Lockdown.
- **Rate-Limiting**: Implemented with `speed-limiter` (progressive slowdown) and `rate-limiter` (hard-cap), effectively neutralizing automated DDoS attempts.

### ✅ Pass: Data Sanitization
- **Safe Decoding**: The `safeDecode` helper correctly handles `shortString` errors and scrubs non-printable ASCII characters that often occur during Cairo → JS conversion.
- **Address Normalization**: All addresses are padded to 64-character hex format, preventing "mismatched" lookups due to missing leading zeros in user input.

---

## 🎨 3. Frontend Audit (`client1/`)
Review of the React 18 frontend focusing on transaction safety and user experience.

### ✅ Pass: State-Locked Navigation
- **Wizard Rail**: The 4-step registration wizard now correctly gates navigation. Step 1 (Search) cannot progress to Step 2 (Profile) without a valid wallet connection, preventing "dead transactions."

### ✅ Pass: Transaction Guards
- **Auction Guard**: The "Cancel Auction" button in the `DomainList` is now dynamically disabled if `highestBid > 0`. This prevents users from wasting gas on a transaction that is guaranteed to revert on-chain.

---

## 📊 4. Production Readiness Score

| Category | Score | Notes |
| :--- | :--- | :--- |
| **Security** | 9/10 | Solid middleware; reentrancy guards present everywhere. |
| **UX/UI** | 9.5/10 | Premium aesthetics; skeletons and badges provide great feedback. |
| **Architecture** | 8/10 | Gapped array in contract is a minor tech debt; settlement bug is the only "must-fix". |
| **Standardization** | 10/10 | API follows `/v1/` REST patterns; well-documented README. |

### 🚩 Critical Blocker for Mainnet
- [ ] **Contract Upgrade**: Address the `settle()` ownership record gap.

---

> [!TIP]
> **Performance Recommendation**: For the production `solver-service`, consider switching from in-memory caching to **Redis** if deploying multiple instances behind a load balancer.

> [!CAUTION]
> **Key Management**: The Alchemy RPC key in `config.js` is currently public. While acceptable for Sepolia/Testnet, it **must** be moved to an environment variable for the Mainnet deployment.
