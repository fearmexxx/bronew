# Contract Upgrade Guide

This guide explains how to upgrade your existing BrotherNamingService contract without changing the contract address.

## Overview

Your contract uses a **proxy pattern** with native Cairo v2 upgradability:
- **Proxy Contract** (`UpgradeableContract`): The main contract address that users interact with
- **Implementation Contract** (`BrotherNamingService`): The actual logic that can be upgraded

When you upgrade, only the implementation changes. The proxy contract address stays the same, so users don't need to update anything.

## Current Setup

- **Proxy Contract Address**: `0x44f8e5acfb2aeb5580698edb9d5fbf376d46acb38b99aaa1de942c98dd19182`
- **Proxy Contract**: `contracts/brotherdomain/src/proxy.cairo` (UpgradeableContract)
- **Implementation Contract**: `contracts/brotherdomain/src/lib.cairo` (BrotherNamingService)

## What Changed in This Upgrade

The `get_auction` function now returns `min_increment` as the 4th parameter:

**Before:**
```cairo
fn get_auction(...) -> (ContractAddress, u256, u256, u256, ContractAddress, u64, bool)
// Returns: seller, token_id, reserve, highest_bid, highest_bidder, ends_at, active
```

**After:**
```cairo
fn get_auction(...) -> (ContractAddress, u256, u256, u256, u256, ContractAddress, u64, bool)
// Returns: seller, token_id, reserve, min_increment, highest_bid, highest_bidder, ends_at, active
```

This allows the UI to calculate the correct minimum bid amount according to the contract's validation logic.

## Prerequisites

1. **Environment Variables**: Set up your `.env` file:
   ```env
   DEPLOYER_PRIVATE_KEY=your_private_key
   DEPLOYER_ADDRESS=your_address
   RPC_ENDPOINT=https://api.cartridge.gg/x/starknet/sepolia
   PROXY_CONTRACT_ADDRESS=0x44f8e5acfb2aeb5580698edb9d5fbf376d46acb38b99aaa1de942c98dd19182
   ```

2. **Admin Access**: You must be the admin/owner of the proxy contract to upgrade it.

3. **Compiled Contract**: The contract must be compiled before upgrading.

## Upgrade Steps

### Step 1: Compile the Contract

```bash
cd contracts/brotherdomain
scarb build
```

This compiles the new implementation with the updated `get_auction` function.

### Step 2: Run the Upgrade Script

```bash
npm run upgrade:contract
```

Or directly:
```bash
ts-node scripts/upgrade_contract.ts
```

### What the Upgrade Script Does

1. **Loads the new implementation** from compiled artifacts
2. **Declares the new class** on Starknet (creates a new class hash)
3. **Verifies admin access** to the proxy contract
4. **Upgrades the proxy** to use the new implementation
5. **Verifies the upgrade** by testing contract functions

### Step 3: Verify the Upgrade

After the upgrade completes, verify it worked:

```bash
ts-node scripts/test_upgradable_contract.ts
```

Or test manually by calling `get_auction` and verifying it returns 8 values (including `min_increment`).

## Important Notes

### ✅ What Stays the Same

- **Contract Address**: The proxy contract address remains unchanged
- **Contract State**: All existing data (domains, auctions, etc.) is preserved
- **User Experience**: Users don't need to update anything

### ⚠️ What Changes

- **Implementation Logic**: The contract logic is updated to the new version
- **Function Signatures**: Some functions may have different return values (like `get_auction`)
- **ABI**: The ABI changes, but the contract address stays the same

### 🔒 Security

- Only the contract admin/owner can upgrade
- The upgrade transaction must be signed by the admin account
- All existing state and permissions are preserved

## Troubleshooting

### Error: "Account is not the admin"

**Solution**: Make sure `DEPLOYER_ADDRESS` in your `.env` matches the admin address of the proxy contract.

Check the admin:
```typescript
const proxyContract = new Contract(proxyAbi, PROXY_ADDRESS, provider);
const admin = await proxyContract.get_admin();
console.log("Admin:", admin);
```

### Error: "Failed to read BNS contract files"

**Solution**: Make sure you've compiled the contract:
```bash
scarb build
```

### Error: "Declaration failed"

**Solution**: 
- Check your RPC endpoint is working
- Ensure you have enough funds for the declaration transaction
- Verify the contract compiles without errors

### Error: "Upgrade failed"

**Solution**:
- Verify you're the admin of the proxy contract
- Check that the new class hash was declared successfully
- Ensure the proxy contract address is correct

## Testing the Upgrade

After upgrading, test the new functionality:

### 1. Test get_auction Function

```typescript
const contract = new Contract(bnsAbi, PROXY_ADDRESS, provider);
const result = await contract.get_auction(domain);
// Should return 8 values: seller, token_id, reserve, min_increment, highest_bid, highest_bidder, ends_at, active
console.log("Min increment:", result.min_increment);
```

### 2. Test Place Bid

The UI should now correctly calculate minimum bids using `min_increment` from the contract.

### 3. Verify Existing Functionality

Make sure existing features still work:
- Domain registration
- Domain renewal
- Domain transfer
- Auction creation
- Auction bidding

## Rollback (if needed)

If something goes wrong, you can upgrade back to the previous implementation:

1. Get the previous class hash from your deployment records
2. Run the upgrade script with the previous class hash
3. Or redeploy the previous version and upgrade to it

## Next Steps

After a successful upgrade:

1. **Update Frontend**: Ensure the UI is updated to handle the new `get_auction` return format
2. **Test Thoroughly**: Test all auction functionality with the new implementation
3. **Monitor**: Watch for any issues in the first few hours after upgrade
4. **Document**: Update your documentation with the new function signatures

## Support

If you encounter issues:
1. Check the transaction hash on a block explorer
2. Verify the contract state on Voyager
3. Review the error messages in the upgrade script output
4. Ensure all environment variables are correct

## Summary

Upgrading your contract is straightforward:
1. Make changes to `lib.cairo`
2. Compile: `scarb build`
3. Upgrade: `npm run upgrade:contract`
4. Verify: Test the new functionality

The contract address stays the same, so users don't need to update anything! 🎉

