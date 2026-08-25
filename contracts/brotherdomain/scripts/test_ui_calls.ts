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

async function main() {
  const provider = new RpcProvider({
    nodeUrl:
      process.env.RPC_ENDPOINT ||
      "https://api.cartridge.gg/x/starknet/sepolia",
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

  const walletAddress = "0x0793feb8c8e0557bbbf6370c0e316091bd9553da5c05de854d78d22859b88454";
  
  try {
    console.log("\n=== Testing UI-style calls ===");
    
    // Step 1: Get user domains (like getUserDomains)
    console.log("\n1. Getting user domains...");
    const domains: any = await (bns as any).get_domains_of(walletAddress);
    console.log("Raw domains response:", domains);
    console.log("Domains array:", Array.isArray(domains) ? domains : domains?.length || 0);

    if (Array.isArray(domains) && domains.length > 0) {
      // Step 2: Process each domain (like the UI does)
      for (const domainFelt of domains) {
        console.log(`\n2. Processing domain felt: ${domainFelt} (Type: ${typeof domainFelt})`);
        
        // Convert to string like getUserDomains does
        let domainFeltString: string;
        if (typeof domainFelt === 'bigint') {
          domainFeltString = domainFelt.toString();
        } else {
          domainFeltString = String(domainFelt);
        }
        console.log("Converted to string:", domainFeltString);
        
        // Step 3: Get domain info (like getDomainInfo)
        console.log("\n3. Getting domain info...");
        try {
          // Try with string first
          console.log("Trying with string:", domainFeltString);
          const infoString: any = await (bns as any).get_domain_info(domainFeltString);
          console.log("Info with string:", infoString);
          
          // Try with BigInt
          console.log("Trying with BigInt:", BigInt(domainFeltString));
          const infoBigInt: any = await (bns as any).get_domain_info(BigInt(domainFeltString));
          console.log("Info with BigInt:", infoBigInt);
          
          // Try with original BigInt
          console.log("Trying with original BigInt:", domainFelt);
          const infoOriginal: any = await (bns as any).get_domain_info(domainFelt);
          console.log("Info with original:", infoOriginal);
          
        } catch (e: any) {
          console.error("Error getting domain info:", e.message);
        }
        
        // Step 4: Decode domain name
        console.log("\n4. Decoding domain name...");
        try {
          const domainName = shortString.decodeShortString(domainFeltString);
          console.log("Decoded domain name:", domainName);
        } catch (e: any) {
          console.error("Error decoding domain name:", e.message);
        }
      }
    }

  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });