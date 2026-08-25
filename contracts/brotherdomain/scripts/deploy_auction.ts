import { Account, CallData, Contract, RpcProvider, stark } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
dotenv.config();

async function main() {
  const provider = new RpcProvider({
    nodeUrl:
      process.env.RPC_ENDPOINT ||
      "https://api.cartridge.gg/x/starknet/sepolia",
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

  // Get BNS address from env or prompt
  const bnsAddress = process.env.BNS_CONTRACT_ADDRESS || "";
  if (!bnsAddress) {
    throw new Error("Missing BNS_CONTRACT_ADDRESS in environment. Deploy BNS first.");
  }

  let sierraCode, casmCode;
  try {
    ({ sierraCode, casmCode } = await getCompiledCode(
      "brother_identity_AuctionHouse"
    ));
    console.log("✅ AuctionHouse artifacts loaded");
  } catch (error: any) {
    console.log("❌ Failed to read AuctionHouse contract files:", error.message);
    process.exit(1);
  }

  const myCallData = new CallData(sierraCode.abi);
  // constructor(owner: ContractAddress, fee_bps: u16, fee_recipient: ContractAddress)
  const feeBps = parseInt(process.env.AUCTION_FEE_BPS || "200"); // 2% default
  const feeRecipient = normalizeHex(process.env.AUCTION_FEE_RECIPIENT || accountAddress0);
  
  console.log("FEE_BPS=", feeBps);
  console.log("FEE_RECIPIENT=", feeRecipient);
  console.log("BNS_ADDRESS=", normalizeHex(bnsAddress));
  
  const constructor = myCallData.compile("constructor", {
    owner: accountAddress0,
    fee_bps: feeBps,
    fee_recipient: feeRecipient,
  });

  console.log("Deploying AuctionHouse on Sepolia...");
  const deployResponse = await account0.declareAndDeploy({
    contract: sierraCode,
    casm: casmCode,
    salt: stark.randomAddress(),
    constructorCalldata: constructor,
  });

  console.log("✅ Deployment Response:", deployResponse);

  const contract = new Contract(
    sierraCode.abi,
    deployResponse.deploy.contract_address,
    account0
  );

  console.log(`✅ AuctionHouse deployed at: ${contract.address}`);
  console.log(`\n📝 Save these addresses:`);
  console.log(`AUCTION_CONTRACT_ADDRESS=${contract.address}`);
  console.log(`BNS_CONTRACT_ADDRESS=${normalizeHex(bnsAddress)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

