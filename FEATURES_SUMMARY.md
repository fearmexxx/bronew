# Brother ID (BNS) Features Summary

**Project:** Brother Naming Service
**Version:** 0.9.0

## 🎨 User Experience (UX)

### 1. Registration Wizard (Overhauled)
- **4-Step Centered Flow**: A modern, focused wizard for registration.
  - **Step 1**: Search & Duration (with concurrent price fetching).
  - **Step 2**: Primary Domain Toggle & Referral Code.
  - **Step 3**: Profile Records (Avatar, Twitter, Discord).
  - **Step 4**: Minting Call & Tracking.
- **Glassmorphism Theme**: Cyberpunk-inspired dark mode with custom CSS animations.

### 2. Wallet Connection (Premium)
- **Categorized Hub**: Grouped wallets: **Ready** (Primary), **Continue with** (Mobile/Controller), **More Wallets**.
- **Xverse & MetaMask Support**: Native support for Xverse and MetaMask on Starknet.
- **Recently Used Badge**: Memory-aware UI that highlights your preferred wallet.
- **Smart Redirection**: Guides users to the correct download page if a wallet isn't detected.

## 🔗 Protocol & Functionality

### 1. Domain Lifecycle
- **Registration**: 1-3 year periods with dynamic pricing based on length.
- **Grace Period**: 90-day protection for owners to renew before public burn.
- **Metadata**: On-chain SVG generation for NFTs.

### 2. Auction House
- **Native Marketplace**: List, bid, and settle auctions directly within the BNS contract.
- **Ownership Sync**: Real-time on-chain `owner_of` verification for high-fidelity profile lists.

### 3. Identity & Records
- **Text Records**: Domain-linked storage for Avatars, Socials, and Descriptions.
- **Verification**: Built-in system for verified domain statuses.
- **Full Profiles**: Single-call retrieval of domain metadata and text records.

### 4. Protocol V3 (New)
- **Upgradeable Architecture**: Native Cairo v2 proxy pattern with logic/state separation.
- **Dynamic Pricing**: Enhanced price tiers for different domain lengths.
- **Referral System**: Built-in support for referrer-based discounts/incentives.

## 🛠️ Technical Specs
- **Network**: Sepolia Testnet.
- **Proxy Address**: `0xfad69cad592fc44fe3673717a643929eb5a62689eb2abeb7a1a0d3ae105371`
- **Provider**: Alchemy RPC with `latest` blockID persistence.
- **SDK**: Starknet.js v8 + Starknet-React.
- **Contracts**: Cairo v2 (Upgradable).
