# Brother ID (Brother Protocol v3)

> **Human-readable private payments on Starknet**

Brother ID lets users send private STRK to a memorable `.real` name or direct Starknet address through STRK20-compatible wallets. The wallet retains viewing keys and proof responsibility. `.real` registration currently runs on Sepolia while STRK20 payments support Starknet Mainnet; the former transparent escrow is not used by the private-payment interface.

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
- **STRK20 Private STRK** (Wallet API v0.10.3+):
  - **Shield**: The connected privacy wallet creates encrypted notes and proves the STRK20 deposit.
  - **Unshield**: The wallet proves a withdrawal to a selected public Starknet address.
  - **Private Send**: Brother ID resolves the `.real` name; the wallet protects sender, recipient, and amount through STRK20.
  - Brother ID never handles or stores viewing keys. The former transparent Identity escrow remains available only for historical recovery.
- **Delegated AI Agents**: Configure autonomous agents with specific spending allowances and capabilities (`DEX & Arbitrage`, `Payments`, `Analytics`).

---

## 📄 License
MIT © Brother ID Team
