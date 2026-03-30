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

async function main() {
  const provider = new RpcProvider({
    nodeUrl:
      process.env.RPC_ENDPOINT ||
      "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
  });

  // Try alternative RPC endpoint
  const provider2 = new RpcProvider({
    nodeUrl: "https://starknet-sepolia.public.blastapi.io/rpc/v0_7",
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

  // Test domain
  const domainName = "alice";
  const domainFelt = shortString.encodeShortString(domainName);
  console.log(`Testing domain: ${domainName}`);
  console.log(`Domain felt: ${domainFelt}`);

  try {
    // Check base price using Contract instance
    console.log("\n=== Checking Base Price ===");
    const basePriceResult = await (bns as any).get_base_price();
    console.log("Base price result:", basePriceResult);
    const basePrice = typeof basePriceResult === 'bigint' ? basePriceResult : u256ToBigInt(basePriceResult);
    console.log("Base price (wei):", basePrice.toString());
    console.log("Base price (STRK):", (basePrice / BigInt(10**18)).toString());

    // Also try direct provider call for comparison
    console.log("\n=== Checking Base Price (Direct Provider Call) ===");
    const basePriceDirectResult = await provider.callContract({
      contractAddress: bnsAddress,
      entrypoint: "get_base_price",
      calldata: []
    });
    const basePriceDirect = u256ToBigInt(basePriceDirectResult[0]);
    console.log("Base price direct (wei):", basePriceDirect.toString());
    console.log("Base price direct (STRK):", (basePriceDirect / BigInt(10**18)).toString());

    // Try with alternative RPC endpoint
    console.log("\n=== Checking Base Price (Alternative RPC v0_7) ===");
    const basePriceAltResult = await provider2.callContract({
      contractAddress: bnsAddress,
      entrypoint: "get_base_price",
      calldata: []
    });
    const basePriceAlt = u256ToBigInt(basePriceAltResult[0]);
    console.log("Base price alt (wei):", basePriceAlt.toString());
    console.log("Base price alt (STRK):", (basePriceAlt / BigInt(10**18)).toString());

    // Check domain length calculation
    console.log("\n=== Checking Domain Length ===");
    const domainLength = domainName.length;
    console.log(`Domain "${domainName}" length: ${domainLength}`);

    // Check domain price for different years using Contract instance
    console.log("\n=== Checking Domain Prices (Contract Instance) ===");
    for (let years = 1; years <= 3; years++) {
      try {
        const priceResult = await (bns as any).get_domain_price(domainFelt, years);
        console.log(`Price result for ${years} year(s):`, priceResult);
        const price = typeof priceResult === 'bigint' ? priceResult : u256ToBigInt(priceResult);
        console.log(`Price for ${years} year(s) (wei): ${price.toString()}`);
        console.log(`Price for ${years} year(s) (STRK): ${(price / BigInt(10**18)).toString()}`);
      } catch (e: any) {
        console.log(`Error getting price for ${years} year(s):`, e.message);
      }
    }

    // Check domain price for different years using direct provider call
    console.log("\n=== Checking Domain Prices (Direct Provider Call) ===");
    for (let years = 1; years <= 3; years++) {
      try {
        const priceResult = await provider.callContract({
          contractAddress: bnsAddress,
          entrypoint: "get_domain_price",
          calldata: [domainFelt, years.toString()]
        });
        const price = u256ToBigInt(priceResult[0]);
        console.log(`Price for ${years} year(s) (wei): ${price.toString()}`);
        console.log(`Price for ${years} year(s) (STRK): ${(price / BigInt(10**18)).toString()}`);
      } catch (e: any) {
        console.log(`Error getting price for ${years} year(s):`, e.message);
      }
    }

    // Check if domain is available
    console.log("\n=== Checking Domain Availability ===");
    const availableResult = await provider.callContract({
      contractAddress: bnsAddress,
      entrypoint: "is_domain_available",
      calldata: [domainFelt]
    });
    console.log("Domain available:", availableResult[0]);

    // Check domain info
    console.log("\n=== Checking Domain Info ===");
    try {
      const domainInfoResult = await provider.callContract({
        contractAddress: bnsAddress,
        entrypoint: "get_domain_info",
        calldata: [domainFelt]
      });
      console.log("Domain info result:", domainInfoResult);
    } catch (e: any) {
      console.log("Domain info error:", e.message);
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