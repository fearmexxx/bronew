import { RpcProvider } from "starknet";
import * as dotenv from "dotenv";

dotenv.config();

const STRK_SEPOLIA =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

async function main() {
  const address = process.env.IDENTITY_CONTRACT_ADDRESS?.trim();
  if (!address || address === "0x0") {
    throw new Error("Set IDENTITY_CONTRACT_ADDRESS to the new deployment");
  }
  const provider = new RpcProvider({
    nodeUrl: process.env.RPC_ENDPOINT ||
      "https://api.cartridge.gg/x/starknet/sepolia",
  });
  const contractClass: any = await provider.getClassAt(address);
  const functions = new Set(
    (contractClass.abi || []).flatMap((item: any) => {
      if (item.type === "function") return [item.name];
      if (item.type === "interface") {
        return (item.items || [])
          .filter((nested: any) => nested.type === "function")
          .map((nested: any) => nested.name);
      }
      return [];
    })
  );
  for (const required of ["deposit", "withdraw", "private_send", "get_wallets_count_of"]) {
    if (!functions.has(required)) throw new Error(`Missing required ABI entrypoint: ${required}`);
  }
  if (functions.has("update_shielded_balance")) {
    throw new Error("Unsafe update_shielded_balance entrypoint is still present");
  }
  const result = await provider.callContract({
    contractAddress: address,
    entrypoint: "get_strk_token",
    calldata: [],
  }, "latest");
  const configuredToken = `0x${BigInt(result[0]).toString(16)}`;
  if (BigInt(configuredToken) !== BigInt(process.env.STRK_TOKEN_ADDRESS || STRK_SEPOLIA)) {
    throw new Error(`Unexpected STRK token: ${configuredToken}`);
  }
  console.log("Secured IdentityContract verification passed:", address);
  console.log("Configured STRK token:", configuredToken);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
