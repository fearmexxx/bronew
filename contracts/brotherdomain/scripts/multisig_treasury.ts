import { Account, Contract, RpcProvider } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
dotenv.config();

async function multisigTreasury() {
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

  console.log("🔐 Multi-Signature Treasury Manager");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`You: ${accountAddress}`);

  try {
    // Step 1: Show current treasury
    console.log("\n=== Current Treasury ===");
    const currentTreasury = await contract.get_treasury();
    console.log(`Current treasury: ${currentTreasury}`);

    // Step 2: Add treasury signers
    console.log("\n=== Adding Treasury Signers ===");
    const signers = [
      "0x0793Feb8C8E0557BBbf6370c0e316091BD9553da5C05De854D78d22859B88454" // Second signer
    ];

    for (const signer of signers) {
      console.log(`Adding signer: ${signer}`);
      const tx = await contract.add_treasury_signer(signer);
      console.log(`✅ Transaction: ${tx.transaction_hash}`);
      await provider.waitForTransaction(tx.transaction_hash);
    }

    console.log(`✅ Added ${signers.length} treasury signer(s)`);

    // Step 3: Create a treasury proposal
    console.log("\n=== Creating Treasury Proposal ===");
    const newTreasury = "0x07e32d0de59f956eabcfc3d03e4a80c5cbd7f505c328f488f86b9a7e4b8c5d0";
    console.log(`Proposing new treasury: ${newTreasury}`);
    
    const proposeTx = await contract.propose_treasury_change(newTreasury);
    console.log(`✅ Proposal created: ${proposeTx.transaction_hash}`);
    await provider.waitForTransaction(proposeTx.transaction_hash);

    // Step 4: Check proposal status
    console.log("\n=== Proposal Status ===");
    const proposal = await contract.get_treasury_proposal(1);
    console.log(`Proposal 1:`);
    console.log(`  New treasury: ${proposal[0]}`);
    console.log(`  Confirmations: ${proposal[1]}/${proposal[2]}`);
    console.log(`  Executed: ${proposal[3]}`);

    // Step 5: Confirm proposal
    console.log("\n=== Confirming Proposal ===");
    const confirmTx = await contract.confirm_treasury_change(1);
    console.log(`✅ Confirmed: ${confirmTx.transaction_hash}`);
    await provider.waitForTransaction(confirmTx.transaction_hash);

    // Step 6: Execute proposal
    console.log("\n=== Executing Proposal ===");
    const executeTx = await contract.execute_treasury_change(1);
    console.log(`✅ Executed: ${executeTx.transaction_hash}`);
    await provider.waitForTransaction(executeTx.transaction_hash);

    // Step 7: Verify treasury change
    console.log("\n=== Verification ===");
    const finalTreasury = await contract.get_treasury();
    console.log(`Final treasury: ${finalTreasury}`);
    
    if (finalTreasury === newTreasury) {
      console.log("🎉 Treasury successfully changed!");
    } else {
      console.log("⚠️ Treasury change verification failed");
    }

    console.log("\n✅ Multi-sig treasury setup complete!");
    console.log("📋 Available functions:");
    console.log("  - propose_treasury_change(address)");
    console.log("  - confirm_treasury_change(id)");
    console.log("  - execute_treasury_change(id)");
    console.log("  - add_treasury_signer(address)");
    console.log("  - remove_treasury_signer(address)");

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

multisigTreasury()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
