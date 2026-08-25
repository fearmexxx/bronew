# Secured Escrow Migration

The former Sepolia IdentityContract at
`0x07493f41c9d961e36c4973a787df6b035bf0b673d23623e811420df21c0547bd`
must be treated as retired. Its public `deposit` and
`update_shielded_balance` entrypoints can create unsupported accounting
balances.

## Deployment order

1. Build and test `contracts/brotherdomain` with Scarb 2.11.x.
2. Deploy a new `IdentityContract` with the Sepolia STRK address as its
   `strk_token` constructor argument.
3. Confirm that a deposit without sufficient STRK allowance reverts.
4. Confirm that `approve` plus `deposit` transfers STRK into the contract and
   increases the caller's recorded balance by the same amount.
5. Confirm withdrawals cannot exceed the recorded balance.
6. Set the new address in:
   - `client1/.env` as `VITE_IDENTITY_CONTRACT_ADDRESS`
   - `solver-service/.env` as `IDENTITY_CONTRACT_ADDRESS`
   - the SDK constructor used by integrators
   - `indexer/apibara.config.json`
7. Build the frontend and SDK, run the Cairo tests, then perform a small-value
   Sepolia deposit/withdraw smoke test before enabling the UI publicly.

The BNS proxy upgrade containing the auction settlement synchronization should
be deployed separately through the existing proxy upgrade flow.

## Prepared artifacts

- Secured IdentityContract class hash:
  `0x07cfa742b2364d879ac6e13966c5cdf0a2a4e9b12eb7a2dc7e46b86a918ff23f`
- Updated BNS implementation class hash:
  `0x06d180719907457dec68eb9b4ee253306325777f94098653a02f6cdd27da95d`

The secured IdentityContract was declared and deployed on Starknet Sepolia on
August 23, 2026 at
`0x0789d496b1257bff236a722df1243c4d26210dac453f431538d44c669487e07e`.
Declaration transaction: `0x05b4ae15f778da0601c336826bcc2a2e32f5cd40632d4158bc06a27cae4e5e3b`.
Deployment transaction: `0x051dca0b9d739cf16b097f96c990ede8552bfdfa0cbeb126a96fc78d12377f50`.

The live 0.01 STRK custody smoke test passed:

- Deposit: `0x04366f2944131b0ca88cb96ee0d2a8c47c59bc0888b39c63878de841ac29f491`
- Withdrawal: `0x06a9d4bdd6af36f45eaba12c2974277fb61c80b08b1bb94672995aee362d5fc4`

The updated BNS implementation was declared successfully:

- Class hash: `0x06d180719907457dec68eb9b4ee253306325777f94098653a02f6cdd27da95d`
- Declaration transaction: `0x03a7e890bc8430ef9d8cbacb92689d3bc55dfc4a0ca67c5ce11eb276fcbb0807`

The legacy proxy upgrade was not submitted because its admin is
`0x0b857906388a00383c866daa04dd100a7827f95b5c3af40213b598b95c7487b`,
whose signer is not present in the repository's ignored development wallet or
Starkli keystores. The remaining operation is a single `upgrade_to` call from
that admin account to BNS proxy
`0x0fad69cad592fc44fe3673717a643929eb5a62689eb2abeb7a1a0d3ae105371`
with the new class hash above.

A clean replacement BNS proxy was subsequently deployed and initialized at
`0x0797edc2bfaa44fcf46aa55a0f9210d5c698de8553a144e69038dfd5ba4592b8`.
Its admin and treasury are the new recoverable Starkli account
`0x03c0d2297b843e1913e016b021a27b7e6de16aef6904946fcfd1602fb05db81c`;
its payment token is Sepolia STRK and its base price is 1 STRK.

Fresh deployment transactions:

- Admin account deployment: `0x04d9ab8becd602045e4124df3cb7d430e77cc75bcbaa38e8997751efa958c557`
- Proxy deployment: `0x09de58c7a038afd970d6eb25009be008ded649f3091b77c832f184092bdac46`
- Initial BNS class attachment: `0x06a8971ea97c9a5e48b293291e286bbf55af956cd94d4d41e3835b74086e1073`
- Initialization: `0x07ca70d2873b55356fe9165e0e09d92cfefdb4ddf8d2629841b15ef9e1ee7778`
- Registration/resolution smoke test: `0x01c0f3edd6410a63c7805e549744f9428f15b31c060a23f4e86012d3a734ca57`

Receipt review showed that the inherited Gemini implementation allowed the
owner to call `initialize` repeatedly. The fresh proxy was therefore upgraded
again to a hardened class that rejects initialization whenever the payment
token is already configured:

- Hardened BNS class: `0x06a8e3a2329cfea86e0a24043992f65ef67b6af4cf7ddb6fe175f48b6e2d806e`
- Declaration: `0x0deb7c05f1689dd8a80845d900c16c8a48b6ee23bf3b735cce850e664bf718e`
- Upgrade: `0x04576383c90c54542826d71cc2f3442aaa9c92c507420585a4d14d7b965247a8`

## Final auction escrow hardening

Integration testing subsequently exposed an ERC721 authorization defect in
the auction escrow flow: contract-owned settlement transfers were routed
through the public authorization path. The implementation now uses the
OpenZeppelin ERC721 internal transfer primitive for auction custody, winning
settlement, no-bid return, and cancellation. Normal user transfers continue
to use the authorization-checked public path.

The final implementation is live on the same fresh proxy:

- Final BNS class: `0x06c1516221cd3af15b53d2dc6bb629579ebd12a9731e155d74ee9451716740b7`
- Declaration: `0x03e3ed6ecf865d39efa3cdf9560640dad7a7f34ff8f92532c2539c8538a1da9`
- Upgrade: `0x06eeb1a2db9943494681c29661ac36c8fc3c9f134d81aa3536f0cbc051001732`

Post-upgrade read-only verification confirmed the installed class hash,
admin, treasury, Sepolia STRK payment token, 1 STRK base price, existing
`smoke825.real` resolution, and IdentityContract STRK configuration. The
release test matrix passed with 9 Cairo tests, 10 SDK tests, 3 resolver tests,
the SDK TypeScript build, and the frontend production build.
