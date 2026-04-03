import { Abi, RpcProvider } from "starknet";

export const STRK_TOKEN_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

export const voyagerScanBaseUrl = "https://sepolia.voyager.online";

const NODE_URL = (import.meta as any).env?.VITE_STARKNET_RPC || "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/qXU4ta4yLmxUhIoLb-cZ7KtsNn808Pjw";
export const provider = new RpcProvider({ nodeUrl: NODE_URL });

export const BNS_CONTRACT_ADDRESS =
  "0xfad69cad592fc44fe3673717a643929eb5a62689eb2abeb7a1a0d3ae105371";
export const BROTHER_TOKEN_ADDRESS = STRK_TOKEN_ADDRESS;

export const ERC20Abi: Abi = [];


