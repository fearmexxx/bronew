import { Account, CallData, Contract, RpcProvider, stark } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
dotenv.config();

async function main() {
  const rpcUrl = 
    "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/3S-9NEC4IdEbT_sx5zfRd";
  
  console.log("Using RPC URL:", rpcUrl);
  
  const provider = new RpcProvider({
    nodeUrl: rpcUrl,
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

  let sierraCode, casmCode;
  try {
    ({ sierraCode, casmCode } = await getCompiledCode(
      "brother_identity_BrotherNamingService"
    ));
    console.log("✅ BrotherNamingService artifacts loaded");
  } catch (error: any) {
    console.log("❌ Failed to read BNS contract files:", error.message);
    process.exit(1);
  }

  const myCallData = new CallData(sierraCode.abi);
  // constructor(owner: ContractAddress, payment_token: ContractAddress, treasury: ContractAddress)
  // Use TOKEN env if provided, otherwise default STRK on Sepolia
  const defaultStrk = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
  const envToken = process.env.TOKEN || process.env.PAYMENT_TOKEN || defaultStrk;
  const brotherToken = normalizeHex(envToken);
  console.log("PAYMENT_TOKEN_ADDRESS=", brotherToken);
  const constructor = myCallData.compile("constructor", {
    owner: accountAddress0,
    payment_token: brotherToken,
    treasury: accountAddress0, // Use deployer as treasury initially
  });

  console.log("Deploying BrotherNamingService on Sepolia...");
  const deployResponse = await account0.declareAndDeploy({
    contract: sierraCode,
    casm: casmCode,
    salt: stark.randomAddress(),
    constructorCalldata: constructor,
  });

  console.log("✅ Deployment Response:", deployResponse);

  // Use the signer account for write operations
  const contract = new Contract(
    sierraCode.abi,
    deployResponse.deploy.contract_address,
    account0
  );

  console.log(`✅ BrotherNamingService deployed at: ${contract.address}`);

  // Optional post-deploy init using owner-only methods
  try {
    console.log("\n🔧 Initializing contract settings...");
    // Set base price to 1 token (wei-style 1e18) adjust as needed
    const setPriceTx = await contract.set_base_price("1000000000000000000");
    console.log("Set base price tx:", setPriceTx.transaction_hash);
    await provider.waitForTransaction(setPriceTx.transaction_hash);

    // Set treasury to deployer for now
    const setTreasuryTx = await contract.set_treasury(accountAddress0);
    console.log("Set treasury tx:", setTreasuryTx.transaction_hash);
    await provider.waitForTransaction(setTreasuryTx.transaction_hash);

    // Enable minting
    const setMintTx = await contract.set_mint_active(true);
    console.log("Enable minting tx:", setMintTx.transaction_hash);
    await provider.waitForTransaction(setMintTx.transaction_hash);

    console.log("✅ Initialization complete");
  } catch (e: any) {
    console.log("⚠️ Post-deploy initialization failed:", e.message);
  }

  console.log(`\n📝 Save this address: ${contract.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

