# Brother ID (BNS) Features & Status

**Version:** 0.9.1 (V3 Stabilization)
**Network:** Starknet Sepolia Testnet
**Contract:** `0xfad69cad592fc44fe3673717a643929eb5a62689eb2abeb7a1a0d3ae105371`

## 1. Core Naming Service (BNS)
- **Domain Registration:** Register `.real` identities for 1, 2, or 3 years.
- **Pricing Plans:** 
  - 1 Year: $5 (STRK/BROTHER)
  - 2 Years: $8 (Save 20%)
  - 3 Years: $12 (Save 20%)
- **Dynamic Pricing:** Length-based pricing remains active for 4-character domains. Current base price: 1 STRK/year for standard names.
- **Resolution:**
  - `resolve_domain`: Look up Starknet address by name.
  - `reverse_resolve`: Look up name by Starknet address.
- **Primary Domain:** Set a primary `.real` identity for your wallet address (Reverse Resolution).
- **Grace Period:** 90-day protection period after expiry. During this time, only the original owner can renew.
- **Metadata:** On-chain SVG generation (`get_domain_svg`) for NFT marketplaces.

## 2. Auction Marketplace
- **Escrow-Based Auctions:** Sellers list domains for auction; the NFT is held in escrow by the contract during the bidding period.
- **Bidding System:** 
  - Place bids using the payment token (STRK).
  - Minimum increment logic prevents spam bids.
  - Refundable bid system for outbid users.
- **Settlement:** Automated settlement that transfers the domain to the winner and funds to the seller.
- **Management:** Sellers can cancel active auctions (if no bids are placed) and withdraw their escrowed NFTs.

## 3. Profile & Identity Management
- **Dashboard:** Unified view of all owned domains and active auction listings.
- **Text Records:** Store arbitrary text data (Avatar, Twitter, Discord, GitHub, Description) on-chain for each domain.
- **Edit Profile:** Centralized dashboard to manage nickname and avatar preferences.
- **Generated Avatars:** Procedural canvas-based avatars for users without external NFTs, ensuring unique identities for all.
- **Identity Details:** View creation date, expiry date, and current resolver directly in the management modal.
- **Transfer:** Securely send domains to other Starknet addresses.

## 4. Referral Program
- **Referral Links:** Users can generate unique referral links using their wallet address.
- **Rewards:** 5% instant commission on all registration fees paid by referred users.
- **Verification:** Integration with the contract's `register_domain` to track referrers via calldata.
- **Earnings Dashboard:** Real-time tracking of referral bonuses with "Share on X" integration.

## 5. Security & Infrastructure
- **Upgradeable Proxy:** Native Cairo v2 `replace_class_syscall` proxy allows logic upgrades without changing the contract address.
- **Multi-Signature Management:** Proposals and confirmations for treasury and parameter changes.
- **Indexer:** Apibara integration to index MongoDB for high-performance frontend data fetching (Events: `DomainRegistered`, `Transfer`, etc.).
- **Reentrancy Protection:** All financial functions are protected by OpenZeppelin's Reentrancy Guard.

## 🛠️ Current Development Status

| Feature | Status | Notes |
| :--- | :--- | :--- |
| V3 Migration | ✅ Complete | Deployed and stabilized on Sepolia. |
| STRK Payment | ✅ Active | Successfully configured as the primary payment token. |
| Auction House | ✅ Stable | Bid/Settle/Cancel functionality verified. |
| Text Records | ✅ Fixed | Auth issues resolved; records update correctly. |
| Domain Details | ✅ Fixed | Double-encoding bug resolved; info loads instantly. |
| Profile Sync | ✅ Fixed | Address padding and name decoding bugs resolved. |
| Edit Profile | ✅ Complete | Nickname and Generated Avatars implemented with safe decoding. |
| Pricing Page | ✅ Complete | New $5/$8/$12 USD-indexed plan live in Header navigation. |
| Mainnet Prep | 🔄 Pending | Final audit and deployment script setup. |

---

> [!NOTE]
> The platform is currently in Final Stabilization. All core features are verified on the V3 contract address.
