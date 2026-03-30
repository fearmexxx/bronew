import { Contract, RpcProvider } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
import { shortString } from "starknet";
dotenv.config();

async function testMetadata() {
  const provider = new RpcProvider({
    nodeUrl: process.env.RPC_ENDPOINT || "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
  });

  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
  if (!CONTRACT_ADDRESS) {
    console.error("❌ CONTRACT_ADDRESS not set in environment");
    process.exit(1);
  }

  try {
    // Hardcoded ABI for testing purposes to bypass missing local artifacts
    const ABI = [
      {
        "name": "get_domain_svg",
        "type": "function",
        "inputs": [
          { "name": "domain", "type": "core::felt252" }
        ],
        "outputs": [
          { "type": "core::byte_array::ByteArray" }
        ],
        "state_mutability": "view"
      },
      {
        "name": "get_full_profile",
        "type": "function",
        "inputs": [
          { "name": "domain", "type": "core::felt252" }
        ],
        "outputs": [
          { "type": "FullProfile" }
        ],
        "state_mutability": "view"
      }
    ];

    const contract = new Contract(ABI, CONTRACT_ADDRESS, provider);

    console.log(`🧪 Testing Metadata for contract: ${CONTRACT_ADDRESS}`);

    // Test Domain
    const domainName = "test123"; 
    const domainFelt = shortString.encodeShortString(domainName);
    console.log(`\n1. Testing for domain: "${domainName}" (${domainFelt})`);

    // Test get_domain_svg
    console.log("\n2. Calling get_domain_svg...");
    try {
        const svg = await contract.get_domain_svg(domainFelt);
        console.log("✅ SVG Generated:");
        console.log(svg);
        
        if (typeof svg === 'string' && svg.includes("<svg") && svg.includes(domainName)) {
            console.log("✅ SVG content looks valid (contains <svg tag and domain name)");
        } else {
            console.warn("⚠️ SVG content might be malformed");
        }
    } catch (e: any) {
        console.error("❌ Failed to get SVG:", e.message);
    }

    // Test get_full_profile
    console.log("\n3. Calling get_full_profile...");
    try {
        const profile = await contract.get_full_profile(domainFelt);
        console.log("✅ Full Profile fetched:");
        console.log(profile);
    } catch (e: any) {
        console.error("❌ Failed to get full profile:", e.message);
    }

  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
  }
}

testMetadata()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });