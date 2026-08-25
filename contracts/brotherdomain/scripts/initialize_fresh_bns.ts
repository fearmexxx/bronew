import { Account, Contract, RpcProvider } from "starknet";
import { readFileSync } from "fs";
import { getCompiledCode } from "./utils";

const STRK_SEPOLIA =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

async function main() {
  const accountFile = process.env.STARKLI_ACCOUNT_FILE;
  const privateKey = process.env.STARKNET_PRIVATE_KEY;
  const bnsAddress = process.env.BNS_CONTRACT_ADDRESS;
  if (!accountFile || !privateKey || !bnsAddress) {
    throw new Error("Set STARKLI_ACCOUNT_FILE, STARKNET_PRIVATE_KEY, and BNS_CONTRACT_ADDRESS");
  }
  const config = JSON.parse(readFileSync(accountFile, "utf8"));
  const admin = config.deployment?.address;
  const provider = new RpcProvider({
    nodeUrl: process.env.RPC_ENDPOINT || "https://api.cartridge.gg/x/starknet/sepolia",
  });
  const account = new Account({ provider, address: admin, signer: privateKey });
  const { sierraCode } = await getCompiledCode("brother_identity_BrotherNamingService");
  const bns = new Contract({
    abi: sierraCode.abi,
    address: bnsAddress,
    providerOrAccount: account,
  });
  const response = await bns.initialize(
    "Brother Real",
    "REAL",
    1_000_000_000_000_000_000n,
    admin,
    STRK_SEPOLIA,
  );
  console.log("Initialization transaction:", response.transaction_hash);
  await provider.waitForTransaction(response.transaction_hash);
  console.log("Fresh BNS initialized:", bnsAddress);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
