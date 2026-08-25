import { Account, Contract, RpcProvider, hash } from "starknet";
import { readFileSync } from "fs";
import { getCompiledCode } from "./utils";

const STRK_SEPOLIA =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

async function ensureDeclared(
  provider: RpcProvider,
  account: Account,
  name: string,
  sierra: any,
  casm: any,
): Promise<string> {
  const classHash = hash.computeContractClassHash(sierra);
  try {
    await provider.getClassByHash(classHash);
    console.log(`${name} already declared:`, classHash);
    return classHash;
  } catch {
    const response = await account.declare({ contract: sierra, casm });
    console.log(`${name} declaration transaction:`, response.transaction_hash);
    await provider.waitForTransaction(response.transaction_hash);
    console.log(`${name} declared:`, classHash);
    return classHash;
  }
}

async function main() {
  const accountFile = process.env.STARKLI_ACCOUNT_FILE;
  const privateKey = process.env.STARKNET_PRIVATE_KEY;
  if (!accountFile || !privateKey) {
    throw new Error("Set STARKLI_ACCOUNT_FILE and STARKNET_PRIVATE_KEY");
  }
  const config = JSON.parse(readFileSync(accountFile, "utf8"));
  const admin = config.deployment?.address;
  if (!admin || config.deployment?.status !== "deployed") {
    throw new Error("Fresh admin account is not marked deployed");
  }
  const provider = new RpcProvider({
    nodeUrl: process.env.RPC_ENDPOINT || "https://api.cartridge.gg/x/starknet/sepolia",
  });
  const account = new Account({ provider, address: admin, signer: privateKey });
  const { sierraCode: proxySierra, casmCode: proxyCasm } =
    await getCompiledCode("brother_identity_UpgradeableContract");
  const { sierraCode: bnsSierra, casmCode: bnsCasm } =
    await getCompiledCode("brother_identity_BrotherNamingService");

  const proxyClassHash = await ensureDeclared(
    provider, account, "Proxy", proxySierra, proxyCasm,
  );
  const bnsClassHash = await ensureDeclared(
    provider, account, "BNS", bnsSierra, bnsCasm,
  );

  const deployment = await account.deployContract({
    classHash: proxyClassHash,
    constructorCalldata: [admin],
  });
  console.log("Proxy deployment transaction:", deployment.transaction_hash);
  console.log("Proxy address:", deployment.contract_address);
  await provider.waitForTransaction(deployment.transaction_hash);

  const proxy = new Contract({
    abi: proxySierra.abi,
    address: deployment.contract_address,
    providerOrAccount: account,
  });
  const upgrade = await proxy.upgrade_to(bnsClassHash);
  console.log("Initial upgrade transaction:", upgrade.transaction_hash);
  await provider.waitForTransaction(upgrade.transaction_hash);

  const bns = new Contract({
    abi: bnsSierra.abi,
    address: deployment.contract_address,
    providerOrAccount: account,
  });
  const initialization = await bns.initialize(
    "Brother Real",
    "REAL",
    1_000_000_000_000_000_000n,
    admin,
    STRK_SEPOLIA,
  );
  console.log("Initialization transaction:", initialization.transaction_hash);
  await provider.waitForTransaction(initialization.transaction_hash);

  console.log("Fresh BNS deployment complete.");
  console.log("BNS proxy:", deployment.contract_address);
  console.log("Admin/treasury:", admin);
  console.log("Payment token:", STRK_SEPOLIA);
  console.log("BNS class hash:", bnsClassHash);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
