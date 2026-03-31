# Brother ID Features & Functions Summary

This document serves as a "Quick Load" cheat sheet for the **Brother ID (BNS)** project. It details the current logic, contract interfaces, and architecture for both the frontend and smart contracts.

## 1. Technical Core (Starknet)
- **Network**: Sepolia Testnet
- **RPC Hub**: Alchemy (Direct v0_10 Endpoint)
- **Contract Address**: `0x1031fbbf843f059e8c6c923a472458eb4384513c5fd087ca5054a56f4d9cf41`
- **Library Version**: `starknet.js` v6

## 2. Smart Contract Logic (`contracts/brotherdomain`)
The contract uses a **Proxy Pattern** for upgradeability.

### 2.1 Core Functions (`register_domain`)
- **Signature (Current V2)**: `register_domain(domain, years, resolver, has_strkdomain, has_brother_domain)`
- **Arguments**:
  - `domain`: `felt252` (ShortString encoded)
  - `years`: `u8` (1-3)
  - `resolver`: `ContractAddress` (Target address)
  - `has_strkdomain`: `bool` (Discount check)
  - `has_brother_domain`: `bool` (Discount check)

### 2.2 Domain Properties
- **Grace Period**: 90 days. During this time, the domain is expired but only the original owner can renew it.
- **Pricing**: Length-based. 4-letter domains are 5 STRK, others are 1 STRK (Current testnet config).
- **Text Records**: Arbitrary keys like `avatar`, `twitter`, `discord`, `description`.

### 2.3 View Functions
- `is_domain_available(domain)`: Returns availability status (accounts for grace period).
- `get_domain_info(domain)`: Returns full domain metadata (owner, expiry, etc.).
- `get_domains_of(address)`: Returns all domains owned by an address.
- `get_full_profile(domain)`: Returns profile struct with all text records in one call.
- `get_domain_svg(domain)`: Generates on-chain NFT metadata.

## 3. Frontend Architecture (`client1`)
- **Theme**: Cyberpunk / Dark Mode / Glassmorphism.
- **State**: React Hooks + Context.

### 3.1 Hooks
- **`useBns.ts`**: Handles all BNS interactions. 
  > [!IMPORTANT]
  > All `view` calls explicitly use `{ blockIdentifier: 'latest' }` to bypassed Alchemy's `pending` block restriction.
- **`useAuction.ts`**: Handles the internal Auction House (Bid, List, Settle).

### 3.2 Components
- **`SearchBox`**: Real-time availability check + suggestions.
- **`ActivityTicker`**: Live on-chain event feed (polling via `getEvents`).
- **`Profile`**: Multi-tab dashboard for managing identities and viewing history.

## 4. Development Workflow
- **Run Dev**: `npm run dev` (in `client1`)
- **Build**: `npm run build`
- **Contract Upgrade**: `npm run upgrade:contract` (in `contracts/brotherdomain`)

---
**Current Version**: 0.7.0 (Alchemy Compatible)
