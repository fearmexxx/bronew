const fs = require("fs");
const path = require("path");
const { Account, RpcProvider, CallData, constants } = require("./client1/node_modules/starknet");

const wallet = JSON.parse(fs.readFileSync("dev_wallet.json", "utf8"));
const RPC_URL = process.env.STARKNET_RPC_URL || "https://api.cartridge.gg/x/starknet/sepolia";
const provider = new RpcProvider({ nodeUrl: RPC_URL });

async function deploy() {
  console.log("===========================================================");
  console.log("  Brother Protocol v2 — Deploying Multi-Tenant IdentityContract");
  console.log("===========================================================");
  console.log("Deployer Address:", wallet.account_address);

  const account = new Account(provider, wallet.account_address, wallet.private_key);

  console.log("\n📦 Step 1: Declaring new IdentityContract class...");
  const sierraPath = path.join(__dirname, "contracts/brotherdomain/target/dev/brother_identity_IdentityContract.contract_class.json");
  const sierra = JSON.parse(fs.readFileSync(sierraPath, "utf8"));

  const expectedCasmHash = "0x1f97479430cc151cc2606ace37976380332ceb15060028cf90516f8e8410a06";

  const declareRes = await account.declare({
    contract: sierra,
    compiledClassHash: expectedCasmHash,
  }, {
    version: constants.TRANSACTION_VERSION.V3,
  });

  console.log("   Declare Tx Hash:", declareRes.transaction_hash);
  console.log("   Class Hash     :", declareRes.class_hash);
  
  console.log("   Waiting for declare confirmation...");
  await provider.waitForTransaction(declareRes.transaction_hash);
  console.log("   ✅ Class declared!");

  console.log("\n🚀 Step 2: Deploying IdentityContract instance...");
  const constructorCalldata = CallData.compile({
    owner: wallet.account_address,
  });

  const deployRes = await account.deployContract({
    classHash: declareRes.class_hash,
    constructorCalldata: constructorCalldata,
  }, {
    version: constants.TRANSACTION_VERSION.V3,
  });

  console.log("   Deployment Tx Hash:", deployRes.transaction_hash);
  console.log("   Contract Address  :", deployRes.contract_address);

  console.log("   Waiting for deployment confirmation...");
  await provider.waitForTransaction(deployRes.transaction_hash);
  console.log("   ✅ IdentityContract deployed & active on Starknet Sepolia!");

  console.log("\n===========================================================");
  console.log("✨ SUCCESS: Multi-Tenant IdentityContract is live at:");
  console.log("   ", deployRes.contract_address);
  console.log("===========================================================");

  fs.writeFileSync("deployed_identity_address.txt", deployRes.contract_address);
}

deploy().catch(err => {
  console.error("Fatal deployment error:", err);
  process.exit(1);
});
