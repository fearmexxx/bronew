import { Account, Contract, RpcProvider, hash } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
dotenv.config();

/**
 * Upgrade script for BrotherNamingService contract
 * This script upgrades the existing proxy contract to a new implementation
 * without changing the contract address.
 * 
 * Uses starknet.js v8+ for robust V3 transaction support.
 */

async function main() {
  const provider = new RpcProvider({
    nodeUrl:
      process.env.RPC_ENDPOINT ||
      "https://starknet-sepolia-rpc.publicnode.com/",
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
    "0xfad69cad592fc44fe3673717a643929eb5a62689eb2abeb7a1a0d3ae105371";

  const privateKey0 = normalizeHex(rawPrivateKey);
  const accountAddress0: string = normalizeHex(rawAccountAddress);

  console.log("ACCOUNT_ADDRESS =", accountAddress0);
  console.log("PROXY_CONTRACT_ADDRESS =", PROXY_CONTRACT_ADDRESS);

  // v8 Account constructor uses object syntax
  const account0 = new Account({
    provider,
    address: accountAddress0,
    signer: privateKey0
  });

  console.log("Account connected.\n");

  // Step 1: Load the new BrotherNamingService implementation
  let bnsSierraCode, bnsCasmCode;

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

  // Step 2: Declare the new implementation
  let newClassHash: string;
  try {
    // Compute the expected class hash locally so we can use it even if declare fails
    newClassHash = hash.computeContractClassHash(bnsSierraCode);
    console.log("-> Local class hash computed:", newClassHash);

    console.log("\n📦 Declaring new BrotherNamingService implementation...");
    const declareResponse = await account0.declare({
      contract: bnsSierraCode,
      casm: bnsCasmCode,
    });

    console.log("Declare transaction:", declareResponse.transaction_hash);
    console.log("⏳ Waiting for declaration confirmation...");
    await provider.waitForTransaction(declareResponse.transaction_hash);

    console.log("✅ New class hash declared:", declareResponse.class_hash);
  } catch (e: any) {
    if (e.message?.includes("already declared")) {
      // Recalculate hash just in case of any weird SDK response shifts
      newClassHash = hash.computeContractClassHash(bnsSierraCode);
      console.log("⚠️ Class already declared. Proceeding with upgrade using hash:", newClassHash);
    } else {
      console.error("❌ Declaration failed:", e.message);
      process.exit(1);
    }
  }

  // Step 3: Connect to the existing proxy contract
  console.log("\n🔗 Connecting to proxy contract...");
  const proxyContract = new Contract({
    abi: bnsSierraCode.abi,
    address: PROXY_CONTRACT_ADDRESS,
    providerOrAccount: account0
  });

  // Step 4: Upgrade the proxy to use the new implementation
  console.log("\n🔄 Upgrading proxy contract to new implementation...");
  console.log("   New implementation hash:", newClassHash);

  try {
    const upgradeCall = {
      contractAddress: PROXY_CONTRACT_ADDRESS,
      entrypoint: "upgrade_to",
      calldata: [newClassHash]
    };

    const upgradeTx = await account0.execute(upgradeCall);
    console.log("Upgrade transaction:", upgradeTx.transaction_hash);
    console.log("⏳ Waiting for upgrade confirmation...");

    await provider.waitForTransaction(upgradeTx.transaction_hash);

    console.log("✅ Contract upgraded successfully!");
    console.log("\n📋 Upgrade Summary:");
    console.log(`   Proxy Contract Address: ${PROXY_CONTRACT_ADDRESS}`);
    console.log(`   New Class Hash: ${newClassHash}`);
    console.log(`   Transaction Hash: ${upgradeTx.transaction_hash}`);

  } catch (e: any) {
    console.error("❌ Upgrade failed:", e.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
