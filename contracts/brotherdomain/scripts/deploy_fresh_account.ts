import { Account, RpcProvider, hash } from "starknet";
import { readFileSync, writeFileSync } from "fs";

async function main() {
  const accountFile = process.env.STARKLI_ACCOUNT_FILE;
  const privateKey = process.env.STARKNET_PRIVATE_KEY;
  if (!accountFile || !privateKey) {
    throw new Error("Set STARKLI_ACCOUNT_FILE and STARKNET_PRIVATE_KEY");
  }
  const config = JSON.parse(readFileSync(accountFile, "utf8"));
  const classHash = config.deployment.class_hash;
  const salt = config.deployment.salt;
  const publicKey = config.variant.public_key;
  const address = hash.calculateContractAddressFromHash(
    salt,
    classHash,
    [publicKey],
    "0x0",
  );
  const provider = new RpcProvider({
    nodeUrl: process.env.RPC_ENDPOINT || "https://api.cartridge.gg/x/starknet/sepolia",
  });
  const account = new Account({ provider, address, signer: privateKey });
  const response = await account.deployAccount({
    classHash,
    constructorCalldata: [publicKey],
    addressSalt: salt,
  });
  await provider.waitForTransaction(response.transaction_hash);

  config.deployment = {
    status: "deployed",
    class_hash: classHash,
    address,
    transaction_hash: response.transaction_hash,
  };
  writeFileSync(accountFile, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  console.log("Account address:", address);
  console.log("Deployment transaction:", response.transaction_hash);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
