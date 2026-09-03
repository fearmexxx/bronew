# Brother ID — Private Sprint checklist

Submission deadline: September 7, 2026 at 23:59 UTC. Registration remains open during the Sprint. The project owner is handling the registry pull request.

## Required before submission

- [ ] Connect Xverse or Ready on Starknet Mainnet at https://bronew.vercel.app/
- [ ] Register the public repository in the Sprint `registry.json` with the project owner's Telegram username.
- [ ] Complete at least three successful STRK20 Mainnet operations that touch the privacy pool. A practical demo sequence is shield, private transfer, and unshield.
- [ ] Copy the three Mainnet transaction hashes from the wallet/Voyager and add them to `strk20.json` under `transactions`.
- [ ] Record a demo video no longer than three minutes using `DEMO_SCRIPT.md`.
- [ ] Upload the video and add its public URL to `strk20.json` under `demo_video`.
- [ ] Confirm `demo_url` opens and the wallet connection, Mainnet privacy flow, and Sepolia registration network switch all work.
- [ ] Commit and push the completed `strk20.json` before September 7 at 23:59 UTC.

Brother ID stores the latest STRK20 transaction hashes in browser local storage under `brother_strk20_transactions` as a recovery aid. The public submission file must still be updated and committed manually.

## Safety checks

- Use small Mainnet amounts for the Sprint transactions.
- Verify the wallet shows Starknet Mainnet before approving a real-funds action.
- Never put a seed phrase, private key, or viewing key in the repository or demo recording.
