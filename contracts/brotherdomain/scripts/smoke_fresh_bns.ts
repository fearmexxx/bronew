import { Account, CallData, RpcProvider, cairo, shortString } from "starknet";
import { readFileSync } from "fs";

const STRK = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

async function main() {
  const accountFile = process.env.STARKLI_ACCOUNT_FILE;
  const privateKey = process.env.STARKNET_PRIVATE_KEY;
  const bns = process.env.BNS_CONTRACT_ADDRESS;
  const domainName = process.env.SMOKE_DOMAIN || "smoke825";
  if (!accountFile || !privateKey || !bns) {
    throw new Error("Set STARKLI_ACCOUNT_FILE, STARKNET_PRIVATE_KEY, and BNS_CONTRACT_ADDRESS");
  }
  const config = JSON.parse(readFileSync(accountFile, "utf8"));
  const address = config.deployment.address;
  const provider = new RpcProvider({
    nodeUrl: process.env.RPC_ENDPOINT || "https://api.cartridge.gg/x/starknet/sepolia",
  });
  const account = new Account({ provider, address, signer: privateKey });
  const domain = shortString.encodeShortString(domainName);
  const priceResult = await provider.callContract({
    contractAddress: bns,
    entrypoint: "get_domain_price",
    calldata: [domain, "0x1"],
  }, "latest");
  const price = BigInt(priceResult[0]) + (BigInt(priceResult[1] || 0) << 128n);

  const response = await account.execute([
    {
      contractAddress: STRK,
      entrypoint: "approve",
      calldata: CallData.compile({ spender: bns, amount: cairo.uint256(price) }),
    },
    {
      contractAddress: bns,
      entrypoint: "register_domain",
      calldata: CallData.compile({
        domain,
        years: 1,
        resolver: address,
        has_strkdomain: false,
        has_brother_domain: false,
        referrer: 0,
      }),
    },
  ]);
  console.log("Registration transaction:", response.transaction_hash);
  await provider.waitForTransaction(response.transaction_hash);
  const resolved = await provider.callContract({
    contractAddress: bns,
    entrypoint: "resolve_domain",
    calldata: [domain],
  }, "latest");
  if (BigInt(resolved[0]) !== BigInt(address)) throw new Error("Resolution mismatch after registration");
  console.log("Fresh BNS smoke test passed:", `${domainName}.real`);
  console.log("Resolved owner:", resolved[0]);
  console.log("Registration price (wei):", price.toString());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
