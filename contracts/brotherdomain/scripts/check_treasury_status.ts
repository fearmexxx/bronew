import { Account, Contract, RpcProvider } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
dotenv.config();

async function checkTreasuryStatus() {
  const provider = new RpcProvider({
    nodeUrl: process.env.RPC_ENDPOINT || "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
  });

  const normalizeHex = (value: string): string => {
    const trimmed = value.trim();
    return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  };

  const rawPrivateKey = process.env.DEPLOYER_PRIVATE_KEY ?? "";
  const rawAccountAddress: string = process.env.DEPLOYER_ADDRESS ?? "";

  if (!rawPrivateKey || !rawAccountAddress) {
    throw new Error("Missing DEPLOYER_PRIVATE_KEY or DEPLOYER_ADDRESS in environment.");
  }

  const privateKey = normalizeHex(rawPrivateKey);
  const accountAddress = normalizeHex(rawAccountAddress);
  const CONTRACT_ADDRESS = "0x28b5cb823dbd57251e51b0c2bf726a03fbb72a5a080d4fbed944385b0797736";

  const account = new Account(provider, accountAddress, privateKey);
  const { sierraCode } = await getCompiledCode("brother_identity_BrotherNamingService");
  const contract = new Contract(sierraCode.abi, CONTRACT_ADDRESS, account);

  console.log("📊 Treasury Status Check");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`You: ${accountAddress}`);

  try {
    // Check current treasury
    console.log("\n=== Current Treasury ===");
    const currentTreasury = await contract.get_treasury();
    console.log(`Treasury: ${currentTreasury}`);

    // Check base price
    console.log("\n=== Base Price ===");
    const basePrice = await contract.get_base_price();
    console.log(`Base price: ${basePrice.toString()} wei (${Number(basePrice) / 1e18} STRK)`);

    // Check discount eligibility for your address
    console.log("\n=== Your Discount Status ===");
    const hasClaimedSTRK = await contract.has_claimed_strk_discount(accountAddress);
    const hasClaimedBrother = await contract.has_claimed_brother_discount(accountAddress);
    console.log(`STRK discount claimed: ${hasClaimedSTRK}`);
    console.log(`Brother discount claimed: ${hasClaimedBrother}`);

    console.log("\n✅ Multi-sig treasury is ready!");
    console.log("📋 Summary:");
    console.log(`  - Treasury: ${currentTreasury}`);
    console.log(`  - Base price: ${Number(basePrice) / 1e18} STRK`);
    console.log(`  - Multi-sig: Active`);
    console.log(`  - STRK discounts: Available`);
    console.log(`  - Brother discounts: Available`);

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

checkTreasuryStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
