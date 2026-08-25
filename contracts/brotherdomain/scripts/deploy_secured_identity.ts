import { Account, CallData, RpcProvider, hash } from "starknet";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { getCompiledCode } from "./utils";

dotenv.config();

const STRK_SEPOLIA =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

const walletFile = process.env.DEPLOYER_WALLET_FILE;
const wallet = walletFile
  ? JSON.parse(readFileSync(walletFile, "utf8"))
  : undefined;

const deploymentValue = (envName: string, walletKeys: string[]): string => {
  const fromEnv = process.env[envName]?.trim();
  const fromWallet = walletKeys.map((key) => wallet?.[key]).find(Boolean);
  const value = fromEnv || fromWallet;
  if (!value) throw new Error(`Missing ${envName}; set it directly or use DEPLOYER_WALLET_FILE`);
  return value.startsWith("0x") ? value : `0x${value}`;
};

async function main() {
  const rpcUrl = process.env.RPC_ENDPOINT ||
    "https://api.cartridge.gg/x/starknet/sepolia";
  const owner = deploymentValue("DEPLOYER_ADDRESS", ["account_address", "address"]);
  const strkToken = process.env.STRK_TOKEN_ADDRESS || STRK_SEPOLIA;
  const { sierraCode, casmCode } = await getCompiledCode(
    "brother_identity_IdentityContract"
  );
  const classHash = hash.computeContractClassHash(sierraCode);

  console.log("Secured IdentityContract deployment");
  console.log("RPC:", rpcUrl);
  console.log("Owner:", owner);
  console.log("STRK token:", strkToken);
  console.log("Class hash:", classHash);

  if (process.env.DRY_RUN === "1") {
    console.log("DRY_RUN=1: declaration and deployment skipped.");
    return;
  }

  const privateKey = deploymentValue("DEPLOYER_PRIVATE_KEY", ["private_key", "privateKey"]);
  const provider = new RpcProvider({ nodeUrl: rpcUrl });
  const account = new Account({ provider, address: owner, signer: privateKey });
  const constructorCalldata = CallData.compile({ owner, strk_token: strkToken });

  if (process.env.ESTIMATE_ONLY === "1") {
    const declaration = await account.estimateDeclareFee({
      contract: sierraCode,
      casm: casmCode,
    });
    console.log("Declaration estimated overall fee:", declaration.overall_fee.toString());
    console.log("ESTIMATE_ONLY=1: no transaction submitted.");
    return;
  }

  const result = await account.declareAndDeploy({
    contract: sierraCode,
    casm: casmCode,
    constructorCalldata,
  });
  await provider.waitForTransaction(result.deploy.transaction_hash);

  console.log("Identity address:", result.deploy.contract_address);
  console.log("Class hash:", result.declare.class_hash);
  console.log("Transaction:", result.deploy.transaction_hash);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
