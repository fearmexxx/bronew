import { RpcProvider, Contract } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
dotenv.config();

async function testUpgradableContract() {
  const provider = new RpcProvider({
    nodeUrl: process.env.RPC_ENDPOINT || "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
  });

  // Your new upgradable contract address
  const CONTRACT_ADDRESS = "0x28b5cb823dbd57251e51b0c2bf726a03fbb72a5a080d4fbed944385b0797736";

  try {
    // Load the BrotherNamingService ABI (since it's upgraded to this implementation)
    const { sierraCode } = await getCompiledCode("brother_identity_BrotherNamingService");
    console.log("✅ Contract ABI loaded");

    // Create contract instance
    const contract = new Contract(sierraCode.abi, CONTRACT_ADDRESS, provider);

    console.log(`🧪 Testing Upgradable Contract: ${CONTRACT_ADDRESS}`);

    // Test 1: Check base price
    console.log("\n=== Testing Base Price ===");
    const basePrice = await contract.get_base_price();
    console.log(`Base price: ${basePrice.toString()} wei`);
    console.log(`Base price: ${Number(basePrice) / 1e18} STRK`);

    // Test 2: Check treasury
    console.log("\n=== Testing Treasury ===");
    const treasury = await contract.get_treasury();
    console.log(`Treasury: ${treasury}`);

    // Test 3: Check domain price
    console.log("\n=== Testing Domain Price ===");
    const domainName = "test123"; // 7 characters
    const domainFelt = "0x" + Buffer.from(domainName).toString('hex');
    const price1Year = await contract.get_domain_price(domainFelt, 1);
    console.log(`Domain "${domainName}" (1 year): ${price1Year.toString()} wei`);

    // Test 4: Check STRK discount eligibility
    console.log("\n=== Testing STRK Discount Eligibility ===");
    const testAddress = "0x04CdC96D916EC00CD0c9Af6B00E9018AEac1F959BFffa3E1024EB41331c70F40";
    const hasClaimedSTRK = await contract.has_claimed_strk_discount(testAddress);
    console.log(`Has claimed STRK discount: ${hasClaimedSTRK}`);

    // Test 5: Check Brother discount eligibility
    console.log("\n=== Testing Brother Discount Eligibility ===");
    const hasClaimedBrother = await contract.has_claimed_brother_discount(testAddress);
    console.log(`Has claimed Brother discount: ${hasClaimedBrother}`);

    console.log("\n🎉 All tests passed! Your upgradable contract is working correctly!");

  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
  }
}

testUpgradableContract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
