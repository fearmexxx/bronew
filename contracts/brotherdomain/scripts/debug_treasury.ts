import { Account, Contract, RpcProvider } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
dotenv.config();

async function debugTreasury() {
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

  console.log("🔍 Debugging Treasury Address");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`You: ${accountAddress}`);

  try {
    // Check what get_treasury() actually returns
    console.log("\n=== Raw Treasury Data ===");
    const treasuryRaw = await contract.get_treasury();
    console.log(`Raw treasury result: ${treasuryRaw}`);
    console.log(`Type: ${typeof treasuryRaw}`);
    
    // Try to convert it to hex
    console.log("\n=== Converting to Hex ===");
    if (typeof treasuryRaw === 'bigint') {
      const hexString = treasuryRaw.toString(16);
      console.log(`As hex: 0x${hexString}`);
      console.log(`Length: ${hexString.length} characters`);
    }
    
    // Check if it's actually your address in a different format
    console.log("\n=== Comparing with Your Address ===");
    const yourAddressBigInt = BigInt(accountAddress);
    console.log(`Your address as BigInt: ${yourAddressBigInt}`);
    console.log(`Treasury as BigInt: ${treasuryRaw}`);
    console.log(`Are they equal? ${treasuryRaw === yourAddressBigInt}`);
    
    // Check if it's the same address but different format
    console.log("\n=== Address Format Analysis ===");
    console.log(`Your address: ${accountAddress}`);
    console.log(`Your address length: ${accountAddress.length}`);
    console.log(`Treasury raw: ${treasuryRaw}`);
    console.log(`Treasury length: ${treasuryRaw.toString().length}`);
    
    // Let's see what happens when we try to use it as an address
    console.log("\n=== Testing Treasury as Address ===");
    try {
      const treasuryHex = `0x${treasuryRaw.toString(16)}`;
      console.log(`Treasury as hex address: ${treasuryHex}`);
      console.log(`This looks like a valid Starknet address format: ${treasuryHex.length === 66}`);
    } catch (e) {
      console.log(`Error converting to hex: ${e}`);
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

debugTreasury()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
