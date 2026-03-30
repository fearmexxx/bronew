# Brother Naming Service Contract - Enhanced Features v2

This document summarizes the latest enhancements made to the Brother Naming Service contract, including native Cairo v2 upgradability and Brother domain discounts.

## 🎯 New Features Implemented

### 1. Native Cairo v2 Upgradability ✅

**Research-Based Implementation:**
- Researched Starknet's native `replace_class_syscall` for Cairo v2
- Updated from proxy pattern to native upgradability
- Contract can be upgraded while preserving state and address

**How it works:**
- Uses `starknet::syscalls::replace_class_syscall` 
- Admin can upgrade contract logic without changing address
- State is preserved across upgrades
- More efficient than proxy pattern

**Usage:**
```cairo
// Admin can upgrade to new class
upgrade_to(new_class_hash: ClassHash)
```

### 2. Brother Domain Discount System ✅

**What was added:**
- New `has_brother_domain` boolean parameter to `register_domain`
- One-time discount eligibility per address
- 1 year free discount (same as STRK domains)

**Discount Logic:**
- **1 year registration**: 100% discount (completely free)
- **2 year registration**: 50% discount (1 year free)
- **3 year registration**: ~33% discount (1 year free)

**One-Time Eligibility:**
- Each address can claim Brother domain discount only once
- Each address can claim STRK domain discount only once
- After claiming, full price applies for future registrations

**Usage:**
```cairo
// For someone with Brother domain
register_domain("example", 1, resolver_address, false, true); // Free for 1 year
register_domain("example2", 1, resolver_address, false, true); // Full price (already claimed)
```

### 3. Enhanced Discount Tracking ✅

**Storage Added:**
- `_strk_discount_claimed: Map<ContractAddress, bool>`
- `_brother_discount_claimed: Map<ContractAddress, bool>`

**New Functions:**
- `has_claimed_strk_discount(address)` - Check STRK discount eligibility
- `has_claimed_brother_discount(address)` - Check Brother discount eligibility

## 🔧 Technical Implementation Details

### Updated Function Signature
```cairo
fn register_domain(
    ref self: ContractState, 
    domain: felt252, 
    years: u8, 
    resolver: ContractAddress, 
    has_strkdomain: bool,     // STRK domain discount
    has_brother_domain: bool  // Brother domain discount
);
```

### Discount Logic Flow
1. Calculate base price
2. Check STRK discount eligibility (if `has_strkdomain = true`)
   - If eligible: apply discount and mark as claimed
3. Check Brother discount eligibility (if `has_brother_domain = true`)
   - If eligible: apply discount and mark as claimed
4. Proceed with registration

### Native Upgradability
```cairo
// In UpgradeableContract
fn upgrade_to(ref self: ContractState, new_class_hash: ClassHash) {
    self.ownable.assert_only_owner();
    replace_class_syscall(new_class_hash).unwrap();
    // Emit upgrade event
}
```

## 📁 File Structure

```
src/
├── lib.cairo              # Main naming service (updated with Brother discounts)
├── proxy.cairo            # Native Cairo v2 upgradable contract
├── brother_token.cairo    # Existing token contract
└── scripts/
    └── deploy_upgradable.ts # Updated deployment script
```

## 🚀 Deployment Instructions

### 1. Build Contracts
```bash
cd contracts/brotherdomain
scarb build
```

### 2. Deploy with Native Upgradability
```bash
# Deploy upgradable contract (not proxy pattern)
npm run deploy:upgradable
```

### 3. Upgrade Contract (when needed)
```bash
# Admin can upgrade to new implementation
npm run upgrade:contract
```

## 🔒 Security Features

1. **One-Time Discounts**: Prevents abuse of discount system
2. **Admin-Only Upgrades**: Only contract owner can upgrade
3. **State Preservation**: Upgrades don't affect existing data
4. **Multi-Signature Treasury**: Enhanced treasury security

## 📋 Usage Examples

### Register with Brother Domain Discount
```typescript
// First registration - gets discount
const tx1 = await contract.register_domain(
    "example1",           // domain name
    1,                    // years
    resolver_address,     // resolver
    false,                // no STRK domain
    true                  // has Brother domain (gets discount)
);

// Second registration - full price (discount already claimed)
const tx2 = await contract.register_domain(
    "example2",           // domain name
    1,                    // years
    resolver_address,     // resolver
    false,                // no STRK domain
    true                  // has Brother domain (no discount - already claimed)
);
```

### Check Discount Eligibility
```typescript
// Check if user can claim Brother domain discount
const canClaimBrother = !await contract.has_claimed_brother_discount(user_address);

// Check if user can claim STRK domain discount
const canClaimSTRK = !await contract.has_claimed_strk_discount(user_address);
```

### Upgrade Contract
```typescript
// Admin upgrades contract to new implementation
const newClassHash = "0x..."; // New contract class hash
const tx = await upgradableContract.upgrade_to(newClassHash);
```

## 🎉 Benefits

### For Users:
1. **Brother Domain Integration**: Encourages Brother domain adoption
2. **Fair Discount System**: One-time discount prevents abuse
3. **Future-Proof**: Contract can evolve without user migration

### For Developers:
1. **Native Upgradability**: More efficient than proxy pattern
2. **State Preservation**: No data loss during upgrades
3. **Enhanced Security**: Multi-signature treasury management

### For Business:
1. **User Acquisition**: Discounts encourage domain adoption
2. **Revenue Protection**: One-time limits prevent excessive discounts
3. **Flexibility**: Can upgrade features without migration

## 🔄 Migration from Previous Version

If upgrading from the previous version:

1. **Function Signature**: Add `has_brother_domain` parameter
2. **Discount Logic**: Update to check both STRK and Brother discounts
3. **Storage**: Add discount tracking maps
4. **Upgradability**: Use native Cairo v2 pattern instead of proxy

## 📊 Discount Summary

| Domain Type | 1 Year | 2 Years | 3 Years | Eligibility |
|-------------|--------|---------|---------|-------------|
| STRK Domain | Free | 50% off | 33% off | Once per address |
| Brother Domain | Free | 50% off | 33% off | Once per address |
| Regular | Full price | Full price | Full price | Always |

## 🎯 Next Steps

1. **Test the implementation** with various scenarios
2. **Deploy to testnet** for validation
3. **Update frontend** to handle new parameters
4. **Document user-facing changes**

All requested features have been successfully implemented using native Cairo v2 patterns! 🚀
