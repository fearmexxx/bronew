import { constants } from "starknet";
import { STRK_TOKEN_ADDRESS } from "../constants";

export type PaymentTokenSymbol = "USDC" | "STRK";

export interface PaymentToken {
  symbol: PaymentTokenSymbol;
  decimals: number;
  mainnet: string;
  sepolia: string;
}

// Native Circle USDC addresses from https://developers.circle.com/stablecoins/usdc-contract-addresses
export const PAYMENT_TOKENS: Record<PaymentTokenSymbol, PaymentToken> = {
  USDC: {
    symbol: "USDC",
    decimals: 6,
    mainnet: "0x033068f6539f8e6e6b131e6b2b814e6c34a5224bc66947c47dab9dfee93b35fb",
    sepolia: "0x0512feac6339ff7889822cb5aa2a86c848e9d392bb0e3e237c008674feed8343",
  },
  STRK: {
    symbol: "STRK",
    decimals: 18,
    mainnet: STRK_TOKEN_ADDRESS,
    sepolia: STRK_TOKEN_ADDRESS,
  },
};

export const PAYMENT_TOKEN_SYMBOLS = Object.keys(PAYMENT_TOKENS) as PaymentTokenSymbol[];

export const tokenAddressForChain = (token: PaymentToken, chainId?: string): string =>
  chainId === constants.StarknetChainId.SN_MAIN ? token.mainnet : token.sepolia;

export const formatTokenAmount = (amount: bigint, decimals: number, maxFractionDigits = 6): string => {
  const unit = 10n ** BigInt(decimals);
  const whole = amount / unit;
  const fraction = (amount % unit).toString().padStart(decimals, "0").slice(0, maxFractionDigits).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
};
