# Brother ID (Brother Protocol v3)

> **Decentralized Sovereign Identity & Privacy Layer for Starknet**

Brother Protocol transforms human-readable `.real` domain names into sovereign, multi-tenant digital identities on Starknet. It bundles native naming service operations, decentralized auctions, text records, and a transparent on-chain STRK escrow for domain-routed payments. The current escrow does not provide zero-knowledge transaction privacy.

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
| **Fresh BNS Proxy** | `0x0797edc2bfaa44fcf46aa55a0f9210d5c698de8553a144e69038dfd5ba4592b8` | [Voyager](https://sepolia.voyager.online/contract/0x0797edc2bfaa44fcf46aa55a0f9210d5c698de8553a144e69038dfd5ba4592b8) |
| **Secured Identity Escrow** | `0x0789d496b1257bff236a722df1243c4d26210dac453f431538d44c669487e07e` | [Voyager](https://sepolia.voyager.online/contract/0x0789d496b1257bff236a722df1243c4d26210dac453f431538d44c669487e07e) |
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
