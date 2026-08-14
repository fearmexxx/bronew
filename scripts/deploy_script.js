const fs = require("fs");
const path = require("path");
const { Account, RpcProvider, json, CallData, ec, stark } = require("./client1/node_modules/starknet");

const RPC_URL = "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/qXU4ta4yLmxUhIoLb-cZ7KtsNn808Pjw";
const provider = new RpcProvider({ nodeUrl: RPC_URL });

// Public key from starkli-wallets/account.json
const publicKey = "0x2f1afe84ec07b56ceeadcdd1c378b3c27105221d7d8291e58c225fd50a54f80";
const classHash = "0x5b4b537eaa2399e3aa99c4e2e0208ebd6c71bc1467938cd52c798c601e43564";
const salt = "0x55d5a6f4feb8b3a315eeafade2ece72ae03860be88eef8d7f9539a02235dc53";

async function main() {
  console.log("Checking RPC connection...");
  const chainId = await provider.getChainId();
  console.log("Connected to chain:", chainId);

  // Load contract artifacts
  const sierraPath = path.join(__dirname, "contracts/brotherdomain/target/dev/brother_identity_IdentityContract.contract_class.json");
  const casmPath = path.join(__dirname, "contracts/brotherdomain/target/dev/brother_identity_IdentityContract.compiled_contract_class.json");

  const sierra = JSON.parse(fs.readFileSync(sierraPath, "utf8"));
  const casm = JSON.parse(fs.readFileSync(casmPath, "utf8"));

  console.log("Sierra & Casm loaded successfully.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
