# Brother ID Project Memo

**Last Updated:** January 19, 2026
**Revision:** 0.8.0 - UI Overhaul & Ownership Verification Fix

## 1. Executive Summary
**Brother ID** (Brother Naming Service - BNS) is a decentralized identity provider built on **Starknet**. It enables users to register, manage, and auction human-readable identities (ending in `.real`) mapped to blockchain addresses. The project consists of a React-based frontend (`client1`) and Cairo v2 smart contracts (`contracts`).

## 2. Architecture

### 2.1 Frontend (`client1`)
- **Framework:** React 18 (Vite) with TypeScript.
- **Styling:** Tailwind CSS with custom "Cyberpunk/Futuristic" dark theme (neon accents, glassmorphism).
- **Web3 Integration:** 
  - `@starknet-react/core` for wallet connection (Argent X, Braavos, etc.).
  - `starknet.js` for direct provider interaction.
- **State Management:** Local React state + Context API (`StarknetProvider`).
- **Key Components:**
  - **`SearchBox`**: Domain availability check and registration initiation.
  - **`Profile`**: User dashboard for owned domains and auction history.
  - **`AuctionList` / `AuctionItem`**: Real-time auction marketplace interface.
  - **`RegistrationModal`**: A 4-step centered wizard with glassmorphism styling and concurrent price fetching.
  - **`WalletModal`**: A premium AVNU-inspired connection interface with categorized wallets, "Recently used" tracking, and Xverse/MetaMask support.
  - **Modals**: `BiddingModal`, `StartAuctionModal`, `ManageDomainModal`.

### 2.2 Smart Contracts (`contracts/brotherdomain`)
- **Language:** Cairo v2 (Scarb framework).
- **Core Contracts:**
  - **`BrotherNamingService` (`src/lib.cairo`)**: 
    - Handles domain registration (1-3 years), renewals, and transfers.
    - Implements ERC721 for domain ownership.
    - Contains native Auction House logic (create, bid, settle, cancel).
    - Supports subdomains and reverse resolution.
    - **Pricing Logic:** Length-based pricing with discount support for existing STRK or Brother domain holders.
    - **Treasury:** Built-in multi-signature treasury management for funds.
    - **Text Records:** Stores arbitrary text data (avatar, socials, description) for domains via `_text_records` map.
    - **Grace Period:** 90-day grace period for renewals post-expiry.
    - **Verification:** Built-in verification system (`is_verified`).
    - **Metadata:** On-chain SVG generation (`get_domain_svg`).
    - **Profile:** Single-call profile fetching (`get_full_profile`).
  - **`UpgradeableContract` (`src/proxy.cairo`)**: Implements native Cairo v2 upgradability (`replace_class_syscall`), allowing logic updates while preserving state/address.
  - **`BrotherToken` (`src/brother_token.cairo`)**: ERC20 token used for payments.

### 2.3 Infrastructure (`indexer`)
- **Indexer:** Apibara configuration (`apibara.config.json`) to index `DomainRegistered` and `Transfer` events to MongoDB. This enables high-performance data fetching for the frontend.

## 3. Key Features & Workflows

### 3.1 Domain Registration
- Users search for domains via `SearchBox`.
- **Availability:** Checked against contract `is_domain_available`. Now accounts for Grace Period.
- **Pricing:** Dynamic based on length (shorter = more expensive).
- **Discounts:** One-time discounts available for users holding specific related assets/domains.
- **Payment:** Paid in `BROTHER` tokens (or configured payment token).

### 3.2 Auctions
- **Listing:** Domain owners can list domains for auction with a reserve price and duration.
- **Bidding:** Users place bids in the payment token. Bids are escrowed.
- **Settlement:** 
  - **Winner:** Receives the NFT.
  - **Seller:** Receives highest bid minus fees (default 2% fee to treasury).
  - **Losers:** Can withdraw their refundable bid amounts.

### 3.3 Management
- **Resolution:** Map names to addresses (`resolve_domain`) and vice-versa (`reverse_resolve`).
- **Primary Domain:** Users can set a primary domain for their address.
- **Records:** Users can set text records (Avatar, Twitter, Discord, etc.) via the "Manage Domain" modal.
- **Grace Period:** 
    - **Active:** Domain works and resolves.
    - **Expired (Grace):** Domain stops resolving (publicly), but owner can still renew. No one else can register.
    - **Expired (Finished):** Domain is available. New registration burns the old token.

## 4. Current State & Configuration

- **Network:** Sepolia Testnet (Alchemy v0_10 endpoint synced).
- **Phase 1-4 Complete:** Text Records, Grace Period, Verification, Metadata, Infrastructure.
- **UI Refinement Complete**: Registration Wizard and Wallet Modal overhauled.
- **Stabilization:** Explicit `blockIdentifier: 'latest'` overrides and on-chain ownership verification implemented.
- **Next Steps:** Deploy contract upgrade to activate new referrer and pricing features (V3).

## 5. Revision Log

| Date | Version | Notes |
| :--- | :--- | :--- |
| **Jan 19, 2026** | **0.8.0** | Overhauled Registration Wizard and Wallet Modal UI. Implemented on-chain `owner_of` verification for domain lists. Added Xverse/MetaMask support. |
| **Jan 19, 2026** | **0.7.0** | Fixed Alchemy RPC "Invalid block id" error with universal `latest` blockID overrides. Updated `StarknetProvider`. |
| **Jan 19, 2026** | **0.6.0** | Consolidated all changes. Reset git history for fresh repository state. |
| **Jan 19, 2026** | **0.5.0** | Implemented Phase 4 (Infrastructure & Metadata). Added `get_full_profile` and `get_domain_svg` to contract. Created indexer config. |
| **Jan 19, 2026** | **0.4.0** | Implemented Phase 3 (Verification System) and refined Phase 2 UI (Grace Period badges). |
| **Jan 19, 2026** | **0.3.0** | Implemented Phase 2: Added `GRACE_PERIOD` constant and updated registration/renewal logic. |
| **Jan 19, 2026** | **0.2.0** | Implemented Phase 1: Added `_text_records` to contract, updated `useBns` hook, and added "Update Records" UI to `ManageDomainModal`. |
| **Jan 19, 2026** | **0.1.0** | Initial analysis. Repository contains `client1` (active frontend) and `contracts`. Verified contract upgradability pattern and auction logic integration. |