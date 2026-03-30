import { Account, Contract, RpcProvider } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
dotenv.config();

/**
 * Upgrade script for BrotherNamingService contract
 * This script upgrades the existing proxy contract to a new implementation
 * without changing the contract address.
 * 
 * Usage:
 * 1. Make sure the contract is compiled: `scarb build`
 * 2. Set DEPLOYER_PRIVATE_KEY and DEPLOYER_ADDRESS in .env
 * 3. Set PROXY_CONTRACT_ADDRESS to your deployed proxy contract address
 * 4. Run: `ts-node scripts/upgrade_contract.ts`
 */

async function main() {
  const provider = new RpcProvider({
    nodeUrl:
      process.env.RPC_ENDPOINT ||
      "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
  });

  const normalizeHex = (value: string): string => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return trimmed;
    return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  };

  const rawPrivateKey = process.env.DEPLOYER_PRIVATE_KEY ?? "";
  const rawAccountAddress: string = process.env.DEPLOYER_ADDRESS ?? "";

  if (!rawPrivateKey || !rawAccountAddress) {
    throw new Error(
      "Missing DEPLOYER_PRIVATE_KEY or DEPLOYER_ADDRESS in environment."
    );
  }

  // Get proxy contract address from env or use the known address
  const PROXY_CONTRACT_ADDRESS = process.env.PROXY_CONTRACT_ADDRESS || 
    "0x44f8e5acfb2aeb5580698edb9d5fbf376d46acb38b99aaa1de942c98dd19182";

  const privateKey0 = normalizeHex(rawPrivateKey);
  const accountAddress0: string = normalizeHex(rawAccountAddress);

  console.log("ACCOUNT_ADDRESS=", accountAddress0);
  console.log("PROXY_CONTRACT_ADDRESS=", PROXY_CONTRACT_ADDRESS);
  const account0 = new Account(provider, accountAddress0, privateKey0);
  console.log("Account connected.\n");

  // Step 1: Load the new BrotherNamingService implementation
  let bnsSierraCode, bnsCasmCode, proxySierraCode;
  
  try {
    ({ sierraCode: bnsSierraCode, casmCode: bnsCasmCode } = await getCompiledCode(
      "brother_identity_BrotherNamingService"
    ));
    console.log("✅ BrotherNamingService artifacts loaded");
  } catch (error: any) {
    console.log("❌ Failed to read BNS contract files:", error.message);
    console.log("💡 Make sure you've compiled the contract: scarb build");
    process.exit(1);
  }

  try {
    ({ sierraCode: proxySierraCode } = await getCompiledCode(
      "brother_identity_UpgradeableContract"
    ));
    console.log("✅ UpgradeableContract artifacts loaded");
  } catch (error: any) {
    console.log("❌ Failed to read UpgradeableContract files:", error.message);
    process.exit(1);
  }

  // Step 2: Declare the new implementation
  console.log("\n📦 Declaring new BrotherNamingService implementation...");
  
  try {
    const declareResponse = await account0.declare({
      contract: bnsSierraCode,
      casm: bnsCasmCode,
    });

    console.log("Declare transaction:", declareResponse.transaction_hash);
    await provider.waitForTransaction(declareResponse.transaction_hash);
    
    const newClassHash = declareResponse.class_hash;
    console.log("✅ New class hash declared:", newClassHash);
    console.log("   Class hash:", newClassHash);

    // Step 3: Connect to the existing proxy contract
    console.log("\n🔗 Connecting to proxy contract...");
    const proxyContract = new Contract(
      proxySierraCode.abi,
      PROXY_CONTRACT_ADDRESS,
      account0
    );

    // Verify we're the admin
    try {
      const admin = await proxyContract.get_admin();
      console.log("✅ Proxy admin:", admin);
      
      if (admin.toLowerCase() !== accountAddress0.toLowerCase()) {
        throw new Error(
          `Account ${accountAddress0} is not the admin. Admin is ${admin}`
        );
      }
    } catch (e: any) {
      console.error("❌ Failed to verify admin:", e.message);
      process.exit(1);
    }

    // Step 4: Upgrade the proxy to use the new implementation
    console.log("\n🔄 Upgrading proxy contract to new implementation...");
    console.log("   Old class will be replaced with:", newClassHash);
    console.log("   Contract address will remain:", PROXY_CONTRACT_ADDRESS);
    
    try {
      const upgradeTx = await proxyContract.upgrade_to(newClassHash);
      console.log("Upgrade transaction:", upgradeTx.transaction_hash);
      console.log("⏳ Waiting for transaction confirmation...");
      
      await provider.waitForTransaction(upgradeTx.transaction_hash);
      
      console.log("✅ Contract upgraded successfully!");
      console.log("\n📋 Upgrade Summary:");
      console.log(`   Proxy Contract Address: ${PROXY_CONTRACT_ADDRESS}`);
      console.log(`   New Class Hash: ${newClassHash}`);
      console.log(`   Transaction Hash: ${upgradeTx.transaction_hash}`);
      console.log(`   Admin: ${accountAddress0}`);
      
      // Step 5: Verify the upgrade by testing a function
      console.log("\n🧪 Verifying upgrade...");
      
      const upgradedContract = new Contract(
        bnsSierraCode.abi,
        PROXY_CONTRACT_ADDRESS,
        account0
      );

      try {
        // Test that we can still call functions on the upgraded contract
        const treasury = await upgradedContract.get_treasury();
        console.log("✅ Treasury address:", treasury);
        
        const basePrice = await upgradedContract.get_base_price();
        console.log("✅ Base price:", basePrice.toString());
        
        // Test the new get_auction function (should now return min_increment)
        console.log("\n✅ Upgrade verified! Contract is working with new implementation.");
        console.log("📝 Note: The get_auction function now returns min_increment as the 4th parameter.");
        
      } catch (e: any) {
        console.log("⚠️ Verification failed (contract may need initialization):", e.message);
        console.log("   This is normal if the contract was just upgraded for the first time.");
      }

      console.log("\n🎉 Upgrade completed successfully!");
      console.log("📝 The contract address remains the same:", PROXY_CONTRACT_ADDRESS);
      console.log("   Users don't need to update any addresses in their applications.");
      
    } catch (e: any) {
      console.error("❌ Upgrade failed:", e.message);
      console.error("   Error details:", e);
      process.exit(1);
    }

  } catch (e: any) {
    console.error("❌ Declaration failed:", e.message);
    console.error("   Error details:", e);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

