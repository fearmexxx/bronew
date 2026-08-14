import { Abi, RpcProvider } from "starknet";

export const STRK_TOKEN_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

export const voyagerScanBaseUrl = "https://sepolia.voyager.online";

// RPC URL — set VITE_STARKNET_RPC in .env to override
const NODE_URL = (import.meta as any).env?.VITE_STARKNET_RPC || "https://starknet-sepolia.public.blastapi.io/rpc/v0_7";
export const provider = new RpcProvider({ nodeUrl: NODE_URL });

export const BNS_CONTRACT_ADDRESS =
  "0xfad69cad592fc44fe3673717a643929eb5a62689eb2abeb7a1a0d3ae105371";
export const BROTHER_TOKEN_ADDRESS = STRK_TOKEN_ADDRESS;

export const ERC20Abi: Abi = [];

// Brother Protocol v3 — Identity Contract with Real Token Escrow (Deployed on Starknet Sepolia)
export const IDENTITY_CONTRACT_ADDRESS =
  "0x07493f41c9d961e36c4973a787df6b035bf0b673d23623e811420df21c0547bd";
