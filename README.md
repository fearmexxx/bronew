# Brother ID (Brother Protocol v3)

> **Decentralized Sovereign Identity & Privacy Layer for Starknet**

Brother Protocol transforms human-readable `.real` domain names into sovereign, multi-tenant digital identities on Starknet. It bundles native naming service operations, decentralized auctions, text records, and a zero-knowledge shielded asset escrow pool for private payments.

---

## 🏗️ Architecture Overview

```
broidentity/
├── client1/                # React 18 (Vite) Frontend with Starknet React & Tailwind CSS
├── contracts/brotherdomain # Cairo v2 Smart Contracts (BNS Proxy + Multi-Tenant Identity)
├── solver-service/         # Hardened Express.js Resolution API (7-layer security & caching)
├── sdk/                    # @brother/sdk TypeScript SDK for ecosystem integrations
├── indexer/                # Apibara/MongoDB indexer for domain registration events
└── scripts/                # Deployment & administrative execution scripts
```

---

## ⚡ Deployed Contracts (Starknet Sepolia)

| Contract | Address | Explorer |
| :--- | :--- | :--- |
| **BNS V3 Proxy** | `0xfad69cad592fc44fe3673717a643929eb5a62689eb2abeb7a1a0d3ae105371` | [Voyager](https://sepolia.voyager.online/contract/0xfad69cad592fc44fe3673717a643929eb5a62689eb2abeb7a1a0d3ae105371) |
| **Identity Contract (v3 Escrow)** | `0x07493f41c9d961e36c4973a787df6b035bf0b673d23623e811420df21c0547bd` | [Voyager](https://sepolia.voyager.online/contract/0x07493f41c9d961e36c4973a787df6b035bf0b673d23623e811420df21c0547bd) |
| **STRK Token** | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` | [Voyager](https://sepolia.voyager.online/contract/0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d) |

---

## 🚀 Quick Start

### 1. Frontend Development (`client1`)
```bash
cd client1
cp .env.example .env
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Solver Resolution Service (`solver-service`)
```bash
cd solver-service
npm install
node server.js
```
The solver service runs on [http://localhost:3001](http://localhost:3001).

### 3. Developer SDK (`sdk`)
```bash
cd sdk
npm install
npm run build
npm test
```

### 4. Smart Contracts (`contracts/brotherdomain`)
```bash
cd contracts/brotherdomain
scarb build
scarb test
```

---

## 🛡️ Core Capabilities

- **Human-Readable Identifiers**: Register `.real` names with dynamic length-based pricing and 90-day grace periods.
- **Sovereign Multi-Tenant Identity**: Each caller manages their own linked wallets, text records, and AI agent permissions.
- **Atomic Token Escrow**:
  - **Deposit (Shield)**: Multicall transfers real STRK into the contract and increments your private balance.
  - **Withdraw (Unshield)**: Calls `withdraw()` to transfer escrowed tokens back to your public wallet.
  - **Private Send**: Resolves `.real` recipient on-chain and transfers STRK atomically.
- **Delegated AI Agents**: Configure autonomous agents with specific spending allowances and capabilities (`DEX & Arbitrage`, `Payments`, `Analytics`).

---

## 📄 License
MIT © Brother ID Team
