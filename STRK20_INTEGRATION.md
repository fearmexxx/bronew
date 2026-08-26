# STRK20 integration

Brother ID uses the Starknet Wallet API privacy extension introduced in specification v0.10.3. It does not implement or custody privacy keys itself.

## Architecture

1. Wallets are discovered through the Starknet Wallet Standard.
2. `WalletAccountV6` verifies the active Sepolia account and reported Wallet API versions.
3. The client reads encrypted-note balances with `strk20Balances`.
4. Shield, transfer, and unshield requests are encoded as standardized STRK20 actions.
5. The connected wallet owns viewing keys, builds proofs, and broadcasts with `strk20InvokeTransaction`.
6. For `.real` transfers, Brother ID publicly resolves the name to a Starknet recipient before handing the transfer action to the wallet.

The reusable `@brother/sdk` exposes matching balance, prepare, invoke, shield, unshield, and private-transfer methods. `strk20PrepareInvoke` is available for applications that need a separate preparation/proving step.

## Requirements

- Starknet Sepolia
- A wallet advertising Wallet API v0.10.3 or newer and implementing STRK20 methods (Ready is the current recommended wallet)
- STRK token address: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`

## Privacy boundary

Brother ID never requests, receives, logs, or stores a viewing key. Proof generation is wallet-managed. Public chain observers can still see that a STRK20 transaction occurred; withdrawals reveal their public destination, and `.real` resolution is a public lookup performed before a private transfer.

The deployed Brother Identity contract's `deposit`, `withdraw`, and `private_send` functions are a transparent legacy escrow. They are not used by the current privacy screen. SDK builders for those calls remain deprecated only so earlier deposits can be recovered.

## Verification

```bash
cd client1
npm ci
npm run typecheck
npm test
npm run build

cd ../sdk
npm ci
npm run build
npm test
```

The frontend adapter tests pin compatibility detection, lossless token parsing, and the exact standardized deposit/withdraw/transfer action shapes. SDK tests also verify that private state and proving are delegated to the wallet.

## References

- Starknet Wallet API specification v0.10.3: https://github.com/starkware-libs/starknet-specs/releases/tag/v0.10.3
- Starknet privacy SDK: https://github.com/starkware-libs/starknet-privacy/tree/main/sdk
- Starknet privacy announcement: https://www.starknet.io/blog/push-to-private/
