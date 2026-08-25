import { Account, RpcProvider, Contract } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
dotenv.config();

// Helper to normalize hex-prefixed addresses
const normalizeHex = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return trimmed;
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
};

async function main() {
  const provider = new RpcProvider({
    nodeUrl:
      process.env.RPC_ENDPOINT ||
      "https://api.cartridge.gg/x/starknet/sepolia",
  });

  const rawPrivateKey = process.env.DEPLOYER_PRIVATE_KEY ?? "";
  const rawAccountAddress: string = process.env.DEPLOYER_ADDRESS ?? "";
  if (!rawPrivateKey || !rawAccountAddress) {
    throw new Error(
      "Missing DEPLOYER_PRIVATE_KEY or DEPLOYER_ADDRESS in environment."
    );
  }
  const privateKey0 = normalizeHex(rawPrivateKey);
  const accountAddress0: string = normalizeHex(rawAccountAddress);

  const rawBnsAddress = process.env.BNS_ADDRESS ?? "";
  if (!rawBnsAddress) throw new Error("Missing BNS_ADDRESS env var");
  const bnsAddress = normalizeHex(rawBnsAddress);

  console.log("ACCOUNT_ADDRESS=", accountAddress0);
  console.log("BNS_ADDRESS=", bnsAddress);
  
  const account0 = new Account(provider, accountAddress0, privateKey0);
  console.log("Account connected.\n");

  // Load BNS ABI
  let bnsSierra;
  try {
    ({ sierraCode: bnsSierra } = await getCompiledCode(
      "brother_identity_BrotherNamingService"
    ));
    console.log("✅ BNS ABI loaded");
  } catch (e: any) {
    console.error("❌ Failed loading BNS ABI:", e.message);
    process.exit(1);
  }

  const bns = new Contract(bnsSierra.abi, bnsAddress, account0);

  try {
    // Set base price to 1 STRK (1e18 wei)
    const basePriceWei = "1000000000000000000"; // 1 STRK
    console.log(`Setting base price to ${basePriceWei} wei (1 STRK)...`);
    
    const setPriceTx = await bns.set_base_price(basePriceWei);
    console.log("Set base price tx:", setPriceTx.transaction_hash);
    await provider.waitForTransaction(setPriceTx.transaction_hash);
    
    // Verify the base price was set
    const basePriceResult = await provider.callContract({
      contractAddress: bnsAddress,
      entrypoint: "get_base_price",
      calldata: []
    });
    
    const basePrice = BigInt(basePriceResult[0]);
    console.log("✅ Base price set successfully!");
    console.log("Base price (wei):", basePrice.toString());
    console.log("Base price (STRK):", (basePrice / BigInt(10**18)).toString());
    
  } catch (e: any) {
    console.error("❌ Failed to set base price:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });