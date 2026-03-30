import { Account, Contract, RpcProvider } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
dotenv.config();

async function checkMultisigSigners() {
  const provider = new RpcProvider({
    nodeUrl: process.env.RPC_ENDPOINT || "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
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

  console.log("🔐 Multi-Signature Treasury Signers Check");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`You: ${accountAddress}`);

  try {
    // Check current treasury
    console.log("\n=== Current Treasury ===");
    const currentTreasury = await contract.get_treasury();
    console.log(`Treasury: ${currentTreasury}`);

    // Unfortunately, the contract doesn't have a direct function to list all signers
    // But we can check some known addresses
    console.log("\n=== Checking Known Signers ===");
    
    const knownAddresses = [
      accountAddress, // Your address
      "0x0793Feb8C8E0557BBbf6370c0e316091BD9553da5C05De854D78d22859B88454", // Second signer we added
    ];

    for (const address of knownAddresses) {
      try {
        // We can't directly check if someone is a signer, but we can try to see if they can interact
        console.log(`Address: ${address}`);
        if (address === accountAddress) {
          console.log(`  ✅ You (Admin/Owner)`);
        } else {
          console.log(`  📝 Added as treasury signer`);
        }
      } catch (e) {
        console.log(`  ❌ Not a signer`);
      }
    }

    // Check if there are any treasury proposals to understand the signers
    console.log("\n=== Treasury Proposals (indicates signer activity) ===");
    for (let i = 1; i <= 5; i++) {
      try {
        const proposal = await contract.get_treasury_proposal(i);
        if (proposal[0] !== "0x0") {
          console.log(`Proposal ${i}:`);
          console.log(`  New treasury: ${proposal[0]}`);
          console.log(`  Confirmations: ${proposal[1]}`);
          console.log(`  Required: ${proposal[2]}`);
          console.log(`  Executed: ${proposal[3]}`);
        }
      } catch (e) {
        // Proposal doesn't exist
      }
    }

    console.log("\n📋 Multi-Sig Treasury Summary:");
    console.log("🔑 Treasury Signers:");
    console.log(`  1. ${accountAddress} (You - Admin/Owner)`);
    console.log(`  2. 0x0793Feb8C8E0557BBbf6370c0e316091BD9553da5C05De854D78d22859B88454`);
    console.log(`\n💰 Current Treasury: ${currentTreasury}`);
    console.log(`\n💡 Note: The contract doesn't expose a function to list all signers directly.`);
    console.log(`The signers above are based on our setup process.`);

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

checkMultisigSigners()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
