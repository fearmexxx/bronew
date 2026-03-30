import { Account, CallData, Contract, RpcProvider, uint256, shortString, hash } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
dotenv.config();

// Helper to normalize hex-prefixed addresses
const normalizeHex = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return trimmed;
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
};

// Encode an ASCII/utf-8 domain label into the felt252 representation expected by the contract
// The contract stores domain as felt252 using custom base-38 encoding in _get_chars_len logic.
// For testing, we accept a pre-encoded hex felt via ENV DOMAIN_FELT, else we try shortString.encodeShortString.
// NOTE: If domain contains chars beyond shortString, provide DOMAIN_FELT instead.
function getDomainFelt(): string {
  const envFelt = process.env.DOMAIN_FELT?.trim();
  const envStr = process.env.DOMAIN_LABEL?.trim();
  if (envFelt) return normalizeHex(envFelt);
  if (!envStr) throw new Error("Provide DOMAIN_LABEL or DOMAIN_FELT in env");
  // shortString only supports up to 31 ASCII chars; contract requires len > 3
  return shortString.encodeShortString(envStr);
}

async function main() {
  const provider = new RpcProvider({
    nodeUrl:
      process.env.RPC_ENDPOINT ||
      "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
  });

  const rawPrivateKey = process.env.DEPLOYER_PRIVATE_KEY ?? "";
  const rawAccountAddress: string = process.env.DEPLOYER_ADDRESS ?? "";
  if (!rawPrivateKey || !rawAccountAddress) {
    throw new Error(
      "Missing DEPLOYER_PRIVATE_KEY or DEPLOYER_ADDRESS in environment."
    );
  }
  const privateKey0 = normalizeHex(rawPrivateKey);
  const accountAddress0: string = normalizeHex(rawAccountAddress);

  const rawBnsAddress = process.env.BNS_ADDRESS ?? "";
  if (!rawBnsAddress) throw new Error("Missing BNS_ADDRESS env var");
  const bnsAddress = normalizeHex(rawBnsAddress);

  // Payment token used by BNS. Default to STRK unless overridden
  const defaultStrk = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
  const rawTokenAddress = defaultStrk;
  const tokenAddress = normalizeHex(rawTokenAddress);

  // Registration params
  const domainFelt = getDomainFelt();
  const years = parseInt(process.env.REGISTER_YEARS ?? "1", 10); // 1..3
  const rawResolver = normalizeHex(
    (process.env.RESOLVER_ADDRESS ?? accountAddress0) as string
  );
  console.log("Params:", {
    BNS_ADDRESS: bnsAddress,
    TOKEN_ADDRESS: tokenAddress,
    DOMAIN_LABEL: process.env.DOMAIN_LABEL,
    DOMAIN_FELT: domainFelt,
    REGISTER_YEARS: years,
    RESOLVER: rawResolver,
    APPROVE_AMOUNT: process.env.APPROVE_AMOUNT,
  });

  console.log("ACCOUNT_ADDRESS=", accountAddress0);
  const account0 = new Account(provider, accountAddress0, privateKey0);
  console.log("Account connected.\n");

  // Load ABIs
  let bnsSierra;
  try {
    ({ sierraCode: bnsSierra } = await getCompiledCode(
      "brother_identity_BrotherNamingService"
    ));
    console.log("✅ BNS ABI loaded");
  } catch (e: any) {
    console.error("❌ Failed loading BNS ABI:", e.message);
    process.exit(1);
  }

  const bns = new Contract(bnsSierra.abi, bnsAddress, account0);
  try {
    const bnsClass: any = await provider.getClassAt(bnsAddress);
    const selector = hash.getSelectorFromName("register_domain");
    const externals = (bnsClass.entry_points_by_type?.EXTERNAL || []).map((e: any) =>
      (e.selector || "")?.toLowerCase()
    );
    console.log("register_domain selector:", selector);
    console.log("BNS has register_domain?", externals.includes(selector?.toLowerCase()));
  } catch (e: any) {
    console.log("Unable to inspect BNS class:", e?.message || e);
  }

  // Helpers - Convert u256 to BigInt using proper Starknet.js method
  const u256ToBigInt = (u: any): bigint => {
    // Handle different u256 formats
    if (typeof u === 'bigint') {
      return u;
    }
    if (typeof u === 'string' || typeof u === 'number') {
      return BigInt(u);
    }
    // Handle u256 object with low/high properties
    if (u && typeof u === 'object') {
      const low = BigInt(u.low ?? u.lowValue ?? 0);
      const high = BigInt(u.high ?? u.highValue ?? 0);
      // Use bit shift for better performance and accuracy
      return (high << BigInt(128)) + low;
    }
    return BigInt(0);
  };

  // Check STRK balance before registration
  let balanceBefore = BigInt(0);
  let price = BigInt(0);
  
  try {
    const balanceResult = await provider.callContract({
      contractAddress: tokenAddress,
      entrypoint: "balanceOf",
      calldata: [accountAddress0]
    });
    console.log("balance result:", balanceResult);
    // balanceResult is [low, high] as hex strings
    const low = BigInt(balanceResult[0]);
    const high = BigInt(balanceResult[1]);
    balanceBefore = (high << BigInt(128)) + low;
    console.log("STRK balance BEFORE registration (wei):", balanceBefore.toString());
    console.log("STRK balance BEFORE registration (STRK):", (balanceBefore / BigInt(10**18)).toString());
  } catch (e: any) {
    console.log("Could not check balance:", e?.message || e);
  }

  // Preflight checks: availability, price, balances, allowances
  try {
    const available = await (bns as any).is_domain_available(domainFelt);
    console.log("is_domain_available:", available);
    if (!available) {
      console.log("Domain not available. Aborting.");
      return;
    }

    const priceU256 = await (bns as any).get_domain_price(domainFelt, years);
    console.log("price result:", priceU256);
    price = typeof priceU256 === 'bigint' ? priceU256 : u256ToBigInt(priceU256);
    console.log("price (wei):", price.toString());
    console.log("price (STRK):", (price / BigInt(10**18)).toString());

    // Check if account has enough STRK balance
    if (balanceBefore < price) {
      console.log("❌ Insufficient STRK balance!");
      console.log(`Required: ${(price / BigInt(10**18)).toString()} STRK`);
      console.log(`Available: ${(balanceBefore / BigInt(10**18)).toString()} STRK`);
      console.log("Please fund your account with STRK tokens first.");
      return;
    }

    // Check allowance using direct contract call
    let allowance = BigInt(0);
    try {
      const allowanceResult = await provider.callContract({
        contractAddress: tokenAddress,
        entrypoint: "allowance",
        calldata: [accountAddress0, bnsAddress]
      });
      allowance = u256ToBigInt(allowanceResult[0]);
      console.log("allowance (wei):", allowance.toString());
    } catch (e: any) {
      console.log("Could not check allowance:", e?.message || e);
    }

    // Approve exact price if needed
    let approveNeeded = allowance < price ? price : BigInt(0);
    if (approveNeeded > BigInt(0)) {
      const mask = (BigInt(1) << BigInt(128)) - BigInt(1);
      const amountLow = "0x" + (approveNeeded & mask).toString(16);
      const amountHigh = "0x" + (approveNeeded >> BigInt(128)).toString(16);
      console.log(`Approving required allowance ${approveNeeded.toString()} to BNS ${bnsAddress}...`);
      const approveCalldataDynamic = [bnsAddress, amountLow, amountHigh];
      const approveTx2 = await account0.execute({
        contractAddress: tokenAddress,
        entrypoint: "approve",
        calldata: approveCalldataDynamic,
      }, {
        resourceBounds: {
          l1_gas: { max_amount: "0x1189", max_price_per_unit: "0x56ce69332261" },
          l2_gas: { max_amount: "0x141720", max_price_per_unit: "0x2309ee097" },
          l1_data_gas: { max_amount: "0x400", max_price_per_unit: "0x100000" },
        },
      });
      console.log("approve tx:", approveTx2.transaction_hash);
      await provider.waitForTransaction(approveTx2.transaction_hash);
    }
  } catch (e: any) {
    console.log("Preflight checks failed:", e?.message || e);
  }
  // Token ABI may not expose approve in our local artifact; we'll send raw calldata
  // using account.execute instead of relying on a generated method.

  // Step 1: compute price for the domain and years
  // The BNS contract computes price via compute_buy_price(domain_len, years)
  // But we can also just approve a generous allowance and let transferFrom check actual price
  // Here we query details to estimate domain length requirement; if not trivial, we approve high allowance.

  // Approve allowance: approve(spender, amount)
  const approveAmountDecimal = process.env.APPROVE_AMOUNT ?? "1000000000000000000000"; // default 1000 BRO wei
  const amountBI = BigInt(approveAmountDecimal);
  const mask = (BigInt(1) << BigInt(128)) - BigInt(1);
  const amountLow = "0x" + (amountBI & mask).toString(16);
  const amountHigh = "0x" + (amountBI >> BigInt(128)).toString(16);

  // If APPROVE_AMOUNT explicitly set, still perform that approval upfront (optional)
  if (process.env.APPROVE_AMOUNT) {
    console.log(`Approving allowance on token ${tokenAddress} to BNS ${bnsAddress}...`);
    const approveCalldata = [bnsAddress, amountLow, amountHigh];
    const approveTx = await account0.execute({
      contractAddress: tokenAddress,
      entrypoint: "approve",
      calldata: approveCalldata,
    });
    console.log("approve tx:", approveTx.transaction_hash);
    await provider.waitForTransaction(approveTx.transaction_hash);
    console.log("✅ Approval successful");

    // Check balance after approval to see the payment
    let balanceAfterApprove = BigInt(0);
    try {
      const balanceResult = await provider.callContract({
        contractAddress: tokenAddress,
        entrypoint: "balanceOf",
        calldata: [accountAddress0]
      });
      const low = BigInt(balanceResult[0]);
      const high = BigInt(balanceResult[1]);
      balanceAfterApprove = (high << BigInt(128)) + low;
      console.log("STRK balance AFTER approval (wei):", balanceAfterApprove.toString());
      console.log("STRK balance AFTER approval (STRK):", (balanceAfterApprove / BigInt(10**18)).toString());
      
      const paymentAmount = balanceBefore - balanceAfterApprove;
      console.log("Payment amount (wei):", paymentAmount.toString());
      console.log("Payment amount (STRK):", (paymentAmount / BigInt(10**18)).toString());
    } catch (e: any) {
      console.log("Could not check balance after approval:", e?.message || e);
    }
  }

  // Step 2: call register_domain(domain: felt252, years: u8, resolver: ContractAddress)
  console.log(
    `Registering domain felt=${domainFelt} years=${years} resolver=${rawResolver} ...`
  );
  const yearsHex = "0x" + years.toString(16);
  const flatRegister = [domainFelt, yearsHex, rawResolver];
  console.log("register_domain calldata (flat-hex):", flatRegister);
  const registerTx = await account0.execute({
    contractAddress: bnsAddress,
    entrypoint: "register_domain",
    calldata: flatRegister,
  });

  console.log("register tx:", registerTx.transaction_hash);
  await provider.waitForTransaction(registerTx.transaction_hash);
  console.log("✅ Domain registered");

  // Wait a bit for all transactions to be processed
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check STRK balance after registration
  let balanceAfter = BigInt(0);
  try {
    const balanceResult = await provider.callContract({
      contractAddress: tokenAddress,
      entrypoint: "balanceOf",
      calldata: [accountAddress0]
    });
    // balanceResult is [low, high] as hex strings
    const low = BigInt(balanceResult[0]);
    const high = BigInt(balanceResult[1]);
    balanceAfter = (high << BigInt(128)) + low;
    console.log("STRK balance AFTER registration (wei):", balanceAfter.toString());
    console.log("STRK balance AFTER registration (STRK):", (balanceAfter / BigInt(10**18)).toString());
    
    // Calculate difference
    const balanceDiff = balanceBefore - balanceAfter;
    console.log("Total STRK deducted (wei):", balanceDiff.toString());
    console.log("Total STRK deducted (STRK):", (balanceDiff / BigInt(10**18)).toString());
    console.log("Expected payment (STRK):", (price / BigInt(10**18)).toString());
    
    // The balance difference includes both payment and gas fees
    // Payment should be exactly the price, gas fees are additional
    if (balanceDiff >= price) {
      console.log("✅ STRK payment correctly deducted!");
      console.log("Gas fees (STRK):", ((balanceDiff - price) / BigInt(10**18)).toString());
    } else {
      console.log("❌ STRK payment amount mismatch!");
    }
  } catch (e: any) {
    console.log("Could not check balance after:", e?.message || e);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

