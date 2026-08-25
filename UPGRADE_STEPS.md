# Upgrade Instructions (Sepolia Testnet)

Follow these steps on your Mac to upgrade the Brother ID contract with the latest Phase 5 logic.

## 1. Environment Setup
Create `contracts/brotherdomain/.env` and add:
```env
DEPLOYER_ADDRESS=0x...
DEPLOYER_PRIVATE_KEY=0x...
RPC_ENDPOINT=https://api.cartridge.gg/x/starknet/sepolia
PROXY_CONTRACT_ADDRESS=0x44f8e5acfb2aeb5580698edb9d5fbf376d46acb38b99aaa1de942c98dd19182
```

## 2. Compile Contract
Ensure you have `scarb` installed (`curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh`).
```bash
cd contracts/brotherdomain
scarb build
```

## 3. Execute Upgrade
This will declare the new class hash and update the proxy.
```bash
npm install
npm run upgrade:contract
```

## 4. Verify
Run the test script to confirm `get_full_profile` and auction updates are live.
```bash
ts-node scripts/verify_contract_setup.ts
```
