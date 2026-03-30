import { RpcProvider, Contract } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
import { shortString } from "starknet";
dotenv.config();

// Helper to normalize hex-prefixed addresses
const normalizeHex = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return trimmed;
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
};

// Helper to convert u256 to BigInt using proper Starknet.js method
const u256ToBigInt = (u: any): bigint => {
  // Handle different u256 formats
  if (typeof u === 'bigint') {
    return u;
  }
  if (typeof u === 'string' || typeof u === 'number') {
    return BigInt(u);
  }
  // Handle u256 object with low/high properties
  if (u && typeof u === 'object') {
    const low = BigInt(u.low ?? u.lowValue ?? 0);
    const high = BigInt(u.high ?? u.highValue ?? 0);
    // Use bit shift for better performance and accuracy
    return (high << BigInt(128)) + low;
  }
  return BigInt(0);
};

// Helper to safely convert u256 to hex
const safeU256ToHex = (u256: any): string => {
  try {
    if (typeof u256 === 'bigint') {
      return "0x" + u256.toString(16);
    }
    if (typeof u256 === 'string') {
      return u256;
    }
    if (u256 && typeof u256 === 'object') {
      const low = BigInt(u256.low ?? u256.lowValue ?? 0);
      const high = BigInt(u256.high ?? u256.highValue ?? 0);
      const value = (high << BigInt(128)) + low;
      return "0x" + value.toString(16);
    }
    return "0x0";
  } catch (error) {
    console.log('Error converting u256:', error);
    return "0x0";
  }
};

async function main() {
  const provider = new RpcProvider({
    nodeUrl:
      process.env.RPC_ENDPOINT ||
      "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
  });

  const rawBnsAddress = process.env.BNS_ADDRESS ?? "";
  if (!rawBnsAddress) throw new Error("Missing BNS_ADDRESS env var");
  const bnsAddress = normalizeHex(rawBnsAddress);

  console.log("BNS_ADDRESS:", bnsAddress);

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

  const bns = new Contract(bnsSierra.abi, bnsAddress, provider);

  // Test with the actual wallet address from the user
  const testAddresses = [
    "0x0793feb8c8e0557bbbf6370c0e316091bd9553da5c05de854d78d22859b88454" // Actual wallet address
  ];
  for (const testAddress of testAddresses) {
    console.log(`\n=== Testing with wallet address: ${testAddress} ===`);

    try {
      // Get domains of the user
      console.log("\n=== Getting User Domains ===");
      const domains: any = await (bns as any).get_domains_of(testAddress);
    console.log("Raw domains response:", domains);
    console.log("Domains array:", Array.isArray(domains) ? domains : domains?.length || 0);

    if (Array.isArray(domains) && domains.length > 0) {
      console.log(`Found ${domains.length} domains for this address`);
      
      for (let i = 0; i < domains.length; i++) {
        const domainFelt = domains[i];
        console.log(`\n--- Domain ${i + 1} ---`);
        console.log("Domain felt:", domainFelt);
        
        try {
          const domainName = shortString.decodeShortString(domainFelt);
          console.log("Domain name:", domainName);
        } catch (e) {
          console.log("Could not decode domain name");
        }

        // Get domain info
        console.log("\n=== Getting Domain Info ===");
        try {
          const domainInfo: any = await (bns as any).get_domain_info(domainFelt);
          console.log("Raw domain info:", domainInfo);
          
          // Safely convert token_id
          const tokenIdHex = safeU256ToHex(domainInfo.token_id);
          console.log("Token ID (hex):", tokenIdHex);
          
          console.log("Resolver:", domainInfo.resolver);
          console.log("Expiry date:", domainInfo.expiry_date);
          
        } catch (e: any) {
          console.error("Error getting domain info:", e.message);
        }
      }
      } else {
        console.log("No domains found for this address");
      }

    } catch (e: any) {
      console.error("Error testing address:", e.message);
    }
  }

  // Test with a known domain that might exist
  console.log("\n=== Testing with known domains ===");
  const testDomains = ["alice", "test", "demo"];
  
  for (const domainName of testDomains) {
    try {
      const domainFelt = shortString.encodeShortString(domainName);
      console.log(`\nTesting domain: ${domainName} (${domainFelt})`);
      
      const isAvailable = await (bns as any).is_domain_available(domainFelt);
      console.log(`Available: ${isAvailable}`);
      
      if (!isAvailable) {
        const domainInfo: any = await (bns as any).get_domain_info(domainFelt);
        console.log("Domain info:", {
          resolver: domainInfo.resolver,
          tokenId: safeU256ToHex(domainInfo.token_id),
          expiryDate: domainInfo.expiry_date
        });
      }
    } catch (e: any) {
      console.error(`Error testing domain ${domainName}:`, e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });