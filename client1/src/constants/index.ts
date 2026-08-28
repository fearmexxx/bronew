import { Abi, constants, RpcProvider } from "starknet";

export const STRK_TOKEN_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

const SEPOLIA_NODE_URL =
  (import.meta as any).env?.VITE_STARKNET_SEPOLIA_RPC ||
  (import.meta as any).env?.VITE_STARKNET_RPC ||
  "https://api.cartridge.gg/x/starknet/sepolia";
const MAINNET_NODE_URL =
  (import.meta as any).env?.VITE_STARKNET_MAINNET_RPC ||
  "https://api.cartridge.gg/x/starknet/mainnet";

export const sepoliaProvider = new RpcProvider({ nodeUrl: SEPOLIA_NODE_URL });
export const mainnetProvider = new RpcProvider({ nodeUrl: MAINNET_NODE_URL });

// Naming and identity contracts currently live on Sepolia. Keep this alias for
// existing read paths until their mainnet deployments are configured.
export const provider = sepoliaProvider;
export const voyagerScanBaseUrl = "https://sepolia.voyager.online";

export const isSupportedChain = (chainId?: string) =>
  chainId === constants.StarknetChainId.SN_MAIN ||
  chainId === constants.StarknetChainId.SN_SEPOLIA;

export const isMainnetChain = (chainId?: string) =>
  chainId === constants.StarknetChainId.SN_MAIN;

export const providerForChain = (chainId?: string) =>
  isMainnetChain(chainId) ? mainnetProvider : sepoliaProvider;

export const voyagerBaseUrlForChain = (chainId?: string) =>
  isMainnetChain(chainId) ? "https://voyager.online" : voyagerScanBaseUrl;

export const voyagerTxUrl = (chainId: string | undefined, transactionHash: string) =>
  `${voyagerBaseUrlForChain(chainId)}/tx/${transactionHash}`;

export const BNS_CONTRACT_ADDRESS =
  "0x0797edc2bfaa44fcf46aa55a0f9210d5c698de8553a144e69038dfd5ba4592b8";
export const BROTHER_TOKEN_ADDRESS = STRK_TOKEN_ADDRESS;

export const ERC20Abi: Abi = [];

// Secured escrow deployment. Intentionally fail closed until a new contract is deployed;
// the previous Sepolia address exposes unsafe balance-mutation entrypoints.
export const IDENTITY_CONTRACT_ADDRESS =
  (import.meta as any).env?.VITE_IDENTITY_CONTRACT_ADDRESS ||
  "0x0789d496b1257bff236a722df1243c4d26210dac453f431538d44c669487e07e";
