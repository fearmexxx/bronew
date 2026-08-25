import { Account, RpcProvider, Contract, hash, CallData } from "starknet";
import { getCompiledCode } from "./utils";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const provider = new RpcProvider({
    nodeUrl: process.env.RPC_ENDPOINT || "https://api.cartridge.gg/x/starknet/sepolia",
  });

  const account0 = new Account({
    provider,
    address: process.env.DEPLOYER_ADDRESS!,
    signer: process.env.DEPLOYER_PRIVATE_KEY!,
  });

  console.log("✅ Provider and Account initialized");

  // 1. Declare BNS Implementation
  console.log("\n📦 Checking BrotherNamingService implementation...");
  const { sierraCode: bnsSierra, casmCode: bnsCasm } = await getCompiledCode("brother_identity_BrotherNamingService");
  const bnsClassHash = hash.computeContractClassHash(bnsSierra);
  
  let isBnsDeclared = false;
  try {
    await provider.getClassByHash(bnsClassHash);
    isBnsDeclared = true;
    console.log("⚠️ BNS implementation already declared:", bnsClassHash);
  } catch (e) {
    console.log("-> BNS not declared yet.");
  }

  if (!isBnsDeclared) {
    console.log("📦 Declaring BrotherNamingService...");
    try {
      const declareBns = await account0.declare({
          contract: bnsSierra,
          casm: bnsCasm,
      }, {
          resourceBounds: {
            l2_gas: { max_amount: 0xe876e800n, max_price_per_unit: 0x290759000n }, // 3.9B gas, 11 GWEI (~42.9 STRK)
            l1_gas: { max_amount: 0x1n, max_price_per_unit: 0x5af3107a4000n }, 
            l1_data_gas: { max_amount: 0x200n, max_price_per_unit: 0x174876e800n },
          }
      });
      console.log("-> BNS implementation declared:", declareBns.class_hash);
      await provider.waitForTransaction(declareBns.transaction_hash);
    } catch (e: any) {
      if (e.message?.includes("already declared")) {
          console.log("⚠️ BNS implementation already declared.");
      } else {
          throw e;
      }
    }
  }

  // 2. Declare Proxy Implementation
  console.log("\n📦 Checking UpgradeableContract (Proxy) implementation...");
  const { sierraCode: proxySierra, casmCode: proxyCasm } = await getCompiledCode("brother_identity_UpgradeableContract");
  const proxyClassHash = hash.computeContractClassHash(proxySierra);
  
  let isProxyDeclared = false;
  try {
    await provider.getClassByHash(proxyClassHash);
    isProxyDeclared = true;
    console.log("⚠️ Proxy implementation already declared:", proxyClassHash);
  } catch (e) {
    console.log("-> Proxy not declared yet.");
  }

  if (!isProxyDeclared) {
    console.log("📦 Declaring UpgradeableContract...");
    try {
      const declareProxy = await account0.declare({
          contract: proxySierra,
          casm: proxyCasm,
      }, {
          resourceBounds: {
            l2_gas: { max_amount: 0x1dcd6500n, max_price_per_unit: 0x290759000n }, // 500M gas, 11 GWEI
            l1_gas: { max_amount: 0x1n, max_price_per_unit: 0x5af3107a4000n },
            l1_data_gas: { max_amount: 0x200n, max_price_per_unit: 0x174876e800n },
          }
      });
      console.log("-> Proxy implementation declared:", declareProxy.class_hash);
      await provider.waitForTransaction(declareProxy.transaction_hash);
    } catch (e: any) {
      if (e.message?.includes("already declared")) {
          console.log("⚠️ Proxy implementation already declared.");
      } else {
          throw e;
      }
    }
  }

  // 3. Deploy Proxy Instance
  console.log("\n🚀 Deploying UpgradeableContract instance...");
  const deployProxy = await account0.deployContract({
    classHash: proxyClassHash,
    constructorCalldata: [account0.address], // admin
  });
  console.log("-> Proxy deployed at:", deployProxy.address);
  await provider.waitForTransaction(deployProxy.transaction_hash);

  // 4. Initial Upgrade to BNS
  console.log("\n🔄 Upgrading Proxy to BNS...");
  const proxyContract = new Contract({
    abi: proxySierra.abi,
    address: deployProxy.address,
    providerOrAccount: account0
  });

  const upgradeTx = await proxyContract.upgrade_to(bnsClassHash);
  console.log("-> Upgrade call sent:", upgradeTx.transaction_hash);
  await provider.waitForTransaction(upgradeTx.transaction_hash);

  // 5. Call Initialize on BNS
  console.log("\n🛠️ Initializing BrotherNamingService state...");
  const bnsContract = new Contract({
    abi: bnsSierra.abi,
    address: deployProxy.address,
    providerOrAccount: account0
  });

  try {
    const initTx = await bnsContract.initialize(
        "Brother Real", 
        "REAL", 
        "1000000000000000000", // 1 unit as base price
        account0.address,     // treasury
        account0.address      // payment_token placeholder
    );
    console.log("-> Initialization call sent:", initTx.transaction_hash);
    await provider.waitForTransaction(initTx.transaction_hash);
  } catch (e: any) {
    console.error("❌ Initialization failed:", e.message);
  }

  console.log("\n✨ V3 Deployment Successful!");
  console.log("====================================");
  console.log("NEW PROXY ADDRESS: ", deployProxy.address);
  console.log("BNS CLASS HASH:    ", bnsClassHash);
  console.log("PROXY CLASS HASH:  ", proxyClassHash);
  console.log("====================================");
}

main().catch(console.error);
