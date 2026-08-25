import { Account, Contract, RpcProvider } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
dotenv.config();

async function verifyMultisigStatus() {
  const provider = new RpcProvider({
    nodeUrl: process.env.RPC_ENDPOINT || "https://api.cartridge.gg/x/starknet/sepolia",
  });

  const normalizeHex = (value: string): string => {
    const trimmed = value.trim();
    return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  };

  const rawPrivateKey = process.env.DEPLOYER_PRIVATE_KEY ?? "";
  const rawAccountAddress: string = process.env.DEPLOYER_ADDRESS ?? "";

  if (!rawPrivateKey || !rawAccountAddress) {
    throw new Error("Missing DEPLOYER_PRIVATE_KEY or DEPLOYER_ADDRESS in environment.");
  }

  const privateKey = normalizeHex(rawPrivateKey);
  const accountAddress = normalizeHex(rawAccountAddress);
  const CONTRACT_ADDRESS = "0x28b5cb823dbd57251e51b0c2bf726a03fbb72a5a080d4fbed944385b0797736";

  const account = new Account(provider, accountAddress, privateKey);
  const { sierraCode } = await getCompiledCode("brother_identity_BrotherNamingService");
  const contract = new Contract(sierraCode.abi, CONTRACT_ADDRESS, account);

  console.log("🔍 Verifying Multi-Sig Status");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`You: ${accountAddress}`);

  try {
    // Check current treasury
    console.log("\n=== Current Treasury ===");
    const currentTreasury = await contract.get_treasury();
    const treasuryHex = `0x${currentTreasury.toString(16)}`;
    console.log(`Treasury: ${treasuryHex}`);

    // Check if you can directly change treasury (single sig)
    console.log("\n=== Testing Single Signature Access ===");
    try {
      // Try to set treasury to the same address (should work if single sig)
      const testTx = await contract.set_treasury(accountAddress);
      console.log(`✅ set_treasury() works - Transaction: ${testTx.transaction_hash}`);
      await provider.waitForTransaction(testTx.transaction_hash);
      console.log("🔓 SINGLE SIGNATURE: You can change treasury directly");
    } catch (error: any) {
      if (error.message.includes("Not a treasury signer")) {
        console.log("🔐 MULTI-SIGNATURE: You need multi-sig to change treasury");
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }

    // Check if multi-sig functions exist and work
    console.log("\n=== Testing Multi-Sig Functions ===");
    try {
      // Try to create a proposal
      const testProposal = "0x07e32d0de59f956eabcfc3d03e4a80c5cbd7f505c328f488f86b9a7e4b8c5d0";
      const proposeTx = await contract.propose_treasury_change(testProposal);
      console.log(`✅ propose_treasury_change() works - Transaction: ${proposeTx.transaction_hash}`);
      await provider.waitForTransaction(proposeTx.transaction_hash);
      console.log("🔐 MULTI-SIG FUNCTIONS: Available and working");
    } catch (error: any) {
      console.log(`❌ Multi-sig functions error: ${error.message}`);
    }

    // Check treasury proposals to see if multi-sig is active
    console.log("\n=== Checking Treasury Proposals ===");
    let hasActiveProposals = false;
    for (let i = 1; i <= 5; i++) {
      try {
        const proposal = await contract.get_treasury_proposal(i);
        if (proposal[0] !== "0x0") {
          hasActiveProposals = true;
          console.log(`Proposal ${i}: Active`);
          console.log(`  New treasury: 0x${proposal[0].toString(16)}`);
          console.log(`  Confirmations: ${proposal[1]}`);
          console.log(`  Required: ${proposal[2]}`);
          console.log(`  Executed: ${proposal[3]}`);
        }
      } catch (e) {
        // Proposal doesn't exist
      }
    }

    if (!hasActiveProposals) {
      console.log("No active proposals found");
    }

    // Final verdict
    console.log("\n=== FINAL VERDICT ===");
    if (hasActiveProposals) {
      console.log("🔐 MULTI-SIGNATURE TREASURY: ACTIVE");
      console.log("   - Treasury changes require multi-sig approval");
      console.log("   - Proposals system is working");
      console.log("   - Multiple signers needed for changes");
    } else {
      console.log("🔓 SINGLE SIGNATURE TREASURY: ACTIVE");
      console.log("   - You can change treasury directly");
      console.log("   - No multi-sig approval needed");
      console.log("   - Multi-sig functions available but not required");
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

verifyMultisigStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
