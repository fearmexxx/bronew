import type { WALLET_API } from "@starknet-io/types-js";
import { num } from "starknet";

export const supportsStrk20Spec = (version: string): boolean => {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  return major > 0 || minor > 10 || (minor === 10 && patch >= 3);
};

export const parseTokenAmount = (amount: string, decimals = 18): bigint => {
  const normalized = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) throw new Error("Enter a valid positive token amount.");
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) throw new Error(`Token supports at most ${decimals} decimal places.`);
  const value = BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt((fraction + "0".repeat(decimals)).slice(0, decimals));
  if (value <= 0n) throw new Error("Amount must be greater than zero.");
  return value;
};

export const depositAction = (token: string, amount: bigint): WALLET_API.STRK20_ACTION => ({
  type: "deposit",
  token,
  amount: num.toHex(amount),
});

export const withdrawAction = (
  token: string,
  amount: bigint,
  recipient: string,
): WALLET_API.STRK20_ACTION => ({
  type: "withdraw",
  token,
  amount: num.toHex(amount),
  recipient,
});

export const transferAction = (
  token: string,
  amount: bigint,
  recipient: string,
): WALLET_API.STRK20_ACTION => ({
  type: "transfer",
  token,
  amount: num.toHex(amount),
  recipient,
});
