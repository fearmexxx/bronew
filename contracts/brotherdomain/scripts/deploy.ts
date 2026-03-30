import { Account, CallData, Contract, RpcProvider, stark } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
dotenv.config();

async function main() {
  const provider = new RpcProvider({
    nodeUrl:
      process.env.RPC_ENDPOINT ||
      "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
  });

  const normalizeHex = (value: string): string => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return trimmed;
    return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  };

  // initialize existing predeployed account 0
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

  // Declare & deploy contract
  let sierraCode, casmCode;

  try {
    ({ sierraCode, casmCode } = await getCompiledCode("tictactoe_TicTacToe"));
    // console.log({sierraCode,casmCode})
  } catch (error: any) {
    console.log("Failed to read contract files");
    process.exit(1);
  }

  const myCallData = new CallData(sierraCode.abi);
  // const constructor = myCallData.compile("constructor", {
  //   pragma_vrf_contract_address:
  //     "0x060c69136b39319547a4df303b6b3a26fab8b2d78de90b6bd215ce82e9cb515c",
  //   owner: process.env.DEPLOYER_ADDRESS || "",
  //   token_address:
  //     "0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D",
  // });

  // console.log({constructor})
  const deployResponse = await account0.declareAndDeploy({
    contract: sierraCode,
    casm: casmCode,
    salt: stark.randomAddress(),
  });



  console.log({ deployResponse })

  // Connect the new contract instance :
  const myTestContract = new Contract(
    sierraCode.abi,
    deployResponse.deploy.contract_address,
    provider
  );
  console.log(
    `✅ Contract has been deploy with the address: ${myTestContract.address}`
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
