import { Account, CallData, Contract, RpcProvider, stark } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
dotenv.config();

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

  const privateKey0 = normalizeHex(rawPrivateKey);
  const accountAddress0: string = normalizeHex(rawAccountAddress);

  console.log("ACCOUNT_ADDRESS=", accountAddress0);
  const account0 = new Account(provider, accountAddress0, privateKey0);
  console.log("Account connected.\n");

  let bnsSierraCode, bnsCasmCode, upgradableSierraCode, upgradableCasmCode;
  
  try {
    ({ sierraCode: bnsSierraCode, casmCode: bnsCasmCode } = await getCompiledCode(
      "brother_identity_BrotherNamingService"
    ));
    console.log("✅ BrotherNamingService artifacts loaded");
  } catch (error: any) {
    console.log("❌ Failed to read BNS contract files:", error.message);
    process.exit(1);
  }

  try {
    ({ sierraCode: upgradableSierraCode, casmCode: upgradableCasmCode } = await getCompiledCode(
      "brother_identity_UpgradeableContract"
    ));
    console.log("✅ UpgradeableContract artifacts loaded");
  } catch (error: any) {
    console.log("❌ Failed to read UpgradeableContract files:", error.message);
    process.exit(1);
  }

  // Step 1: Deploy the main BrotherNamingService implementation
  console.log("\n📦 Deploying BrotherNamingService implementation...");
  
  const bnsCallData = new CallData(bnsSierraCode.abi);
  // constructor(owner: ContractAddress, payment_token: ContractAddress, treasury: ContractAddress)
  const defaultStrk = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
  const brotherToken = normalizeHex(defaultStrk);
  console.log("PAYMENT_TOKEN_ADDRESS=", brotherToken);
  
  const bnsConstructor = bnsCallData.compile("constructor", {
    owner: accountAddress0,
    payment_token: brotherToken,
    treasury: accountAddress0,
  });

  const bnsDeployResponse = await account0.declareAndDeploy({
    contract: bnsSierraCode,
    casm: bnsCasmCode,
    salt: stark.randomAddress(),
    constructorCalldata: bnsConstructor,
  });

  console.log("✅ BrotherNamingService implementation deployed at:", bnsDeployResponse.deploy.contract_address);

  // Step 2: Deploy the upgradable contract (this will be the main contract users interact with)
  console.log("\n🔧 Deploying upgradable contract...");
  
  const upgradableCallData = new CallData(upgradableSierraCode.abi);
  // constructor(admin: ContractAddress)
  const upgradableConstructor = upgradableCallData.compile("constructor", {
    admin: accountAddress0,
  });

  const upgradableDeployResponse = await account0.declareAndDeploy({
    contract: upgradableSierraCode,
    casm: upgradableCasmCode,
    salt: stark.randomAddress(),
    constructorCalldata: upgradableConstructor,
  });

  console.log("✅ Upgradable contract deployed at:", upgradableDeployResponse.deploy.contract_address);

  // Step 3: Upgrade the upgradable contract to use the BrotherNamingService implementation
  console.log("\n🔄 Upgrading to BrotherNamingService implementation...");
  
  const upgradableContract = new Contract(
    upgradableSierraCode.abi,
    upgradableDeployResponse.deploy.contract_address,
    account0
  );

  // Get the class hash of the BrotherNamingService implementation
  const bnsClassHash = bnsDeployResponse.declare.class_hash;
  console.log("BNS Class Hash:", bnsClassHash);

  const upgradeTx = await upgradableContract.upgrade_to(bnsClassHash);
  console.log("Upgrade transaction:", upgradeTx.transaction_hash);
  await provider.waitForTransaction(upgradeTx.transaction_hash);

  console.log("✅ Contract upgraded to BrotherNamingService implementation");

  // Step 4: Initialize the contract settings
  console.log("\n🔧 Initializing contract settings...");
  
  // Create contract instance for the upgraded contract
  const finalContract = new Contract(
    bnsSierraCode.abi,
    upgradableDeployResponse.deploy.contract_address,
    account0
  );

  try {
    // Set base price to 1 token (wei-style 1e18)
    const setPriceTx = await finalContract.set_base_price("1000000000000000000");
    console.log("Set base price tx:", setPriceTx.transaction_hash);
    await provider.waitForTransaction(setPriceTx.transaction_hash);

    // Set treasury to deployer for now
    const setTreasuryTx = await finalContract.set_treasury(accountAddress0);
    console.log("Set treasury tx:", setTreasuryTx.transaction_hash);
    await provider.waitForTransaction(setTreasuryTx.transaction_hash);

    // Enable minting
    const setMintTx = await finalContract.set_mint_active(true);
    console.log("Enable minting tx:", setMintTx.transaction_hash);
    await provider.waitForTransaction(setMintTx.transaction_hash);

    console.log("✅ Initialization complete");
  } catch (e: any) {
    console.log("⚠️ Post-deploy initialization failed:", e.message);
  }

  // Step 5: Test the setup
  console.log("\n🧪 Testing contract setup...");
  
  try {
    const admin = await upgradableContract.get_admin();
    console.log("✅ Admin address:", admin);
    
    const treasury = await finalContract.get_treasury();
    console.log("✅ Treasury address:", treasury);
    
    const basePrice = await finalContract.get_base_price();
    console.log("✅ Base price:", basePrice.toString());
    
  } catch (e: any) {
    console.log("⚠️ Testing failed:", e.message);
  }

  console.log("\n🎉 Deployment completed successfully!");
  console.log("📋 Deployment Summary:");
  console.log(`   BrotherNamingService Implementation: ${bnsDeployResponse.deploy.contract_address}`);
  console.log(`   Upgradable Contract (Main): ${upgradableDeployResponse.deploy.contract_address}`);
  console.log(`   Admin: ${accountAddress0}`);
  console.log(`   Payment Token: ${brotherToken}`);
  
  console.log(`\n📝 MAIN CONTRACT ADDRESS: ${upgradableDeployResponse.deploy.contract_address}`);
  console.log("Users should interact with this address for domain registration.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
