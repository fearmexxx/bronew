# Claim escrow

STRK20 helper behind Brother claim links. A payout parks money for recipients
who have not activated privacy yet; each one later claims it into their own
private balance with the secret in their link. The payer can reclaim an unused
link the same way.

- Deposit: the pool withdraws the total to this contract, then calls
  `privacy_invoke(Deposit, token, [(poseidon(CLAIM_TAG, secret), amount), …], 0, 0)`.
  The contract refuses to record more than it actually holds on top of what is
  already parked.
- Claim: `privacy_invoke(Claim, 0, [], secret, note_id)` marks the link
  claimed, approves the pool, and returns one `OpenNoteDeposit` for the
  claimer's open note.
- Only the privacy pool may call `privacy_invoke`.

Client side: `client1/src/payments/claimLinks.ts` builds the matching Wallet
API actions. The commitment hash is pinned by the same test vector on both
sides.

## Test

```sh
scarb build
scarb cairo-test
```

## Deploy to Sepolia

Constructor argument: the Sepolia STRK20 privacy pool
`0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91`
([contract addresses](https://strk20.starknet.io/docs/contract-addresses)).

```sh
scarb build
sncast --account <your-sepolia-account> declare --network sepolia --contract-name ClaimEscrow
sncast --account <your-sepolia-account> deploy --network sepolia \
  --class-hash <class hash from declare> \
  --constructor-calldata 0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91
```

Then set `VITE_CLAIM_ESCROW_SEPOLIA=<deployed address>` for the frontend
(Vercel Preview and Production env, or `client1/.env.local`). Until it is set,
the app hides claim links on Sepolia.

## Before Mainnet

Not reviewed. Known limits to resolve in an external review first:

- A claim puts the secret in public calldata. Someone who sees a pending claim
  could submit their own claim with that secret first. Binding the claim to
  the claimer (for example a signature over the note) closes this.
- Parked and claimed amounts are public; payer and claimer are not.
- No expiry: unused links stay parked until someone with the secret claims.
