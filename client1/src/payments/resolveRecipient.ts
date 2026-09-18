import { constants, num, shortString, validateAndParseAddress } from "starknet";
import { BNS_CONTRACT_ADDRESS, provider, providerForChain } from "../constants";

export type RecipientSource = "address" | "starknet-id" | "brother-id";

export interface ResolvedRecipient {
  address: string;
  label: string;
  source: RecipientSource;
  network: "Mainnet" | "Sepolia";
}

interface ResolverDependencies {
  resolveStarkName?: (name: string, chainId?: string) => Promise<string>;
  resolveBrotherName?: (name: string) => Promise<string>;
}

const networkLabel = (chainId?: string): "Mainnet" | "Sepolia" =>
  chainId === constants.StarknetChainId.SN_MAIN ? "Mainnet" : "Sepolia";

const assertResolvedAddress = (address: string, name: string): string => {
  if (!address || num.toBigInt(address) === 0n) throw new Error(`${name} is not registered.`);
  return validateAndParseAddress(address);
};

export const resolveRecipient = async (
  rawInput: string,
  chainId?: string,
  dependencies: ResolverDependencies = {},
): Promise<ResolvedRecipient> => {
  const input = rawInput.trim().toLowerCase();
  if (!input) throw new Error("Enter a Starknet address, .stark name, or .real name.");

  if (input.startsWith("0x")) {
    const address = assertResolvedAddress(input, "The recipient address");
    return {
      address,
      label: `${input.slice(0, 8)}…${input.slice(-6)}`,
      source: "address",
      network: networkLabel(chainId),
    };
  }

  if (input.endsWith(".stark")) {
    const resolveStarkName = dependencies.resolveStarkName ?? ((name, targetChainId) =>
      providerForChain(targetChainId).getAddressFromStarkName(name));
    const address = assertResolvedAddress(await resolveStarkName(input, chainId), input);
    return { address, label: input, source: "starknet-id", network: networkLabel(chainId) };
  }

  if (input.endsWith(".real")) {
    if (chainId === constants.StarknetChainId.SN_MAIN) {
      throw new Error(".real names are currently a Sepolia beta and cannot be used for Mainnet payments. Use a .stark name or Starknet address.");
    }
    const domain = input.slice(0, -".real".length);
    if (!domain || domain.length > 31) throw new Error("Enter a valid .real name.");
    const resolveBrotherName = dependencies.resolveBrotherName ?? (async (name) => {
      const resolved = await provider.callContract({
        contractAddress: BNS_CONTRACT_ADDRESS,
        entrypoint: "resolve_domain",
        calldata: [shortString.encodeShortString(name)],
      });
      return resolved[0];
    });
    const address = assertResolvedAddress(await resolveBrotherName(domain), input);
    return { address, label: input, source: "brother-id", network: "Sepolia" };
  }

  throw new Error("Unknown recipient format. Use a .stark name, .real name, or full 0x Starknet address.");
};

export const recipientSourceLabel = (source: RecipientSource): string => ({
  address: "Direct address",
  "starknet-id": "Starknet ID",
  "brother-id": "Brother ID beta",
})[source];
