import { num, shortString, type Call } from "starknet";
import { BNS_CONTRACT_ADDRESS, provider } from "../constants";
import type { ResolvedRecipient } from "./resolveRecipient";

/**
 * The privacy pool has no safe public "is this address registered?" query, so
 * recipients publish it themselves as a text record on their Brother name.
 * The record is a promise from the recipient, not a protocol guarantee: a
 * payout still fails closed if it turns out to be wrong.
 */
export const READINESS_KEY = "strk20";
export const READY_VALUE = "ready";

export type Readiness = "ready" | "unknown";

const domainFelt = (label: string): string => {
  const domain = label.trim().toLowerCase().replace(/\.real$/, "");
  if (!domain || domain.length > 31) throw new Error("Enter a valid .real name.");
  return shortString.encodeShortString(domain);
};

export const readReadiness = async (
  recipient: ResolvedRecipient,
  getText: (domain: string, key: string) => Promise<string> = async (domain, key) =>
    (await provider.callContract({ contractAddress: BNS_CONTRACT_ADDRESS, entrypoint: "get_text", calldata: [domain, key] }))[0],
): Promise<Readiness> => {
  if (recipient.source !== "brother-id") return "unknown";
  try {
    const value = await getText(domainFelt(recipient.label), shortString.encodeShortString(READINESS_KEY));
    return num.toBigInt(value) === num.toBigInt(shortString.encodeShortString(READY_VALUE)) ? "ready" : "unknown";
  } catch {
    return "unknown";
  }
};

export const publishReadinessCall = (name: string): Call => ({
  contractAddress: BNS_CONTRACT_ADDRESS,
  entrypoint: "set_text",
  calldata: [domainFelt(name), shortString.encodeShortString(READINESS_KEY), shortString.encodeShortString(READY_VALUE)],
});
