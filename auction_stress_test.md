# Auction Stress-Test Findings — V3 Contract
**Date:** April 5, 2026 | **Scope:** `_auctions`, `settle`, `bid`, `cancel_auction`, `withdraw`

---

## Test Scenarios Evaluated

| # | Scenario | Expected | Actual | Status |
|---|---|---|---|---|
| 1 | Create auction → Place bid → Wait for end → Settle | NFT → winner, STRK → seller (minus 2% fee) | ✅ Correct | PASS |
| 2 | Create auction → No bids → Wait for end → Settle | NFT returned to seller | ✅ Correct | PASS |
| 3 | Create auction → No bids → Cancel before end | NFT returned to seller | ✅ Correct | PASS |
| 4 | Create auction → Place bid → Cancel | Should revert | ✅ Reverts with "Has bids" | PASS |
| 5 | Place overbid (higher than current + min_increment) | New bid accepted, old bidder refunded | ✅ Correct | PASS |
| 6 | Place bid below reserve | Should revert | ✅ Reverts with "Bid too low" | PASS |
| 7 | Settle before auction ends | Should revert | ✅ Reverts with "Auction not ended" | PASS |
| 8 | Settle already-settled auction | Should revert | ✅ Reverts with "Auction not active" | PASS |
| 9 | Winner domain resolution after settle | `resolve_domain` returns winner address | ❌ Returns **seller** address | **BUG** |
| 10 | Third party calls `settle` | Should succeed (permissionless) | ✅ Correct | PASS |

---

## 🐛 Bug #1 — Post-Settlement Resolution Broken (HIGH)

### Description
`settle()` correctly transfers the NFT to the winning bidder via `erc721.transfer_from`, but **does not update** the BNS resolution mappings:
- `_domain_to_details.resolver` still points to the seller
- `_domain_to_address[domain]` still points to the seller

### Impact
After a successful auction settlement, any partner or wallet calling `resolve_domain(name)` will receive the **previous owner's address**, not the winner's. This is a correctness bug — the protocol's resolution layer is inconsistent with NFT ownership after a sale.

### Contract Fix Required (V3 Upgrade)
```cairo
// Inside settle(), after erc721.transfer_from to winner:
let mut domain_details = self._domain_to_details.read(domain);
domain_details.resolver = auc.highest_bidder;
domain_details.last_transfer_time = now;
self._domain_to_details.write(domain, domain_details);
self._domain_to_address.write(domain, auc.highest_bidder);
```

### Interim Frontend Mitigation (Applied ✅)
The frontend's `DomainList` is refreshed after any settle/cancel action, so UI reflects on-chain NFT state. However, the Resolver API (`/v1/resolve`) will return stale data until the contract is upgraded. Added a comment warning in `bns.js`.

---

## ⚠️ Bug #2 — `withdraw(domain)` misleading parameter (LOW)

### Description
The `withdraw` function signature takes a `domain: felt252` parameter, but **never uses it**. Refunds are stored per-user globally (`_refundable[caller]`), not per-domain. The `domain` param is read into `_auc` but never referenced in any logic.

### Impact
No security risk. However, it misleads callers into thinking they need to specify which domain's refund to claim. Any `domain` value will produce the same result.

### Fix Applied ✅
The frontend `useAuction.ts` `withdraw` call is correct (it passes the domain just to satisfy the ABI). No change needed on the frontend — the UX is fine. Documented here for the next contract upgrade cycle.

---

## ⚠️ Risk #1 — Cancel Button Shown for Domains With Active Bids (UX)

### Description
`DomainList.tsx` shows a "Cancel Auction" button for any domain in `auctionedDomains`. If a bid has been placed, clicking Cancel triggers a transaction that **will revert** on-chain with "Has bids".

### Fix Applied ✅
The "Cancel Auction" button now checks `auctionDetails.highestBid` before rendering. If `highestBid > 0`, the button is replaced with a disabled **"Has Bids — Cannot Cancel"** indicator.

---

## ⚠️ Risk #2 — Zero-Bid Settlement Shows as Regular Settled

### Description
If `settle()` is called with no bids, the NFT is returned to the seller and `AuctionCancelled` is emitted. But `AuctionHistoryList` classifies this as `status: 'Sold'` for the seller since `!auctionDetails.active`.

### Fix Applied ✅
Added a `!hasBids` check: `status: 'Returned'` for sellers when auction settled with 0 bids.

---

## ⚠️ Risk #3 — Active Auction Index Can Have Gaps (Performance, Non-Critical)

### Description
`_remove_from_active_auctions` marks deleted slots as `0` but does not compact the array. Over time, `get_active_auction_domains` iterates over empty slots. For the current scale (Sepolia, low volume) this is not an issue, but should be addressed before Mainnet with high auction frequency.

### Recommendation
Replace the gapped array with a swap-and-pop deletion pattern in the next contract upgrade. Document in Mainnet Roadmap.

---

## Summary

| Finding | Severity | Status |
|---|---|---|
| Post-settle resolution broken | HIGH | ⚠️ Needs contract upgrade |
| `withdraw(domain)` misleading | LOW | Documented |
| Cancel button on bid'd auctions | UX | ✅ Fixed in frontend |
| Zero-bid settled shown as Sold | UX | ✅ Fixed in frontend |
| Active auction index gaps | PERF | 📋 Added to Mainnet Roadmap |
