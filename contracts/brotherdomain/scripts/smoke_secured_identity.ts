import { Account, CallData, RpcProvider, cairo } from "starknet";
import { readFileSync } from "fs";
import * as dotenv from "dotenv";

dotenv.config();

const IDENTITY = process.env.IDENTITY_CONTRACT_ADDRESS ||
  "0x0789d496b1257bff236a722df1243c4d26210dac453f431538d44c669487e07e";
const STRK = process.env.STRK_TOKEN_ADDRESS ||
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const AMOUNT = 10_000_000_000_000_000n; // 0.01 STRK

async function shieldedBalance(provider: RpcProvider, user: string): Promise<bigint> {
  const result = await provider.callContract({
    contractAddress: IDENTITY,
    entrypoint: "get_shielded_balance",
    calldata: [user],
  }, "latest");
  return BigInt(result[0]) + (BigInt(result[1] || 0) << 128n);
}

async function main() {
  const walletPath = process.env.DEPLOYER_WALLET_FILE;
  if (!walletPath) throw new Error("Set DEPLOYER_WALLET_FILE");
  const wallet = JSON.parse(readFileSync(walletPath, "utf8"));
  const address = wallet.account_address || wallet.address;
  const privateKey = wallet.private_key || wallet.privateKey;
  if (!address || !privateKey) throw new Error("Wallet file is missing address or private key");

  const provider = new RpcProvider({
    nodeUrl: process.env.RPC_ENDPOINT || "https://api.cartridge.gg/x/starknet/sepolia",
  });
  const account = new Account({ provider, address, signer: privateKey });
  const before = await shieldedBalance(provider, address);

  const depositTx = await account.execute([
    {
      contractAddress: STRK,
      entrypoint: "approve",
      calldata: CallData.compile({ spender: IDENTITY, amount: cairo.uint256(AMOUNT) }),
    },
    {
      contractAddress: IDENTITY,
      entrypoint: "deposit",
      calldata: CallData.compile({ amount: cairo.uint256(AMOUNT) }),
    },
  ]);
  await provider.waitForTransaction(depositTx.transaction_hash);
  const afterDeposit = await shieldedBalance(provider, address);
  if (afterDeposit !== before + AMOUNT) throw new Error("Deposit accounting mismatch");

  const withdrawTx = await account.execute({
    contractAddress: IDENTITY,
    entrypoint: "withdraw",
    calldata: CallData.compile({ amount: cairo.uint256(AMOUNT) }),
  });
  await provider.waitForTransaction(withdrawTx.transaction_hash);
  const afterWithdraw = await shieldedBalance(provider, address);
  if (afterWithdraw !== before) throw new Error("Withdrawal accounting mismatch");

  console.log("Secured escrow smoke test passed.");
  console.log("Deposit transaction:", depositTx.transaction_hash);
  console.log("Withdraw transaction:", withdrawTx.transaction_hash);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
