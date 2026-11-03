import type { WALLET_API } from "@starknet-io/types-js";
import { constants, hash, num, shortString } from "starknet";
import { withdrawAction } from "../strk20/actions";
import { PAYMENT_TOKENS, type PaymentTokenSymbol } from "./tokens";

// Must match CLAIM_TAG in contracts/claim_escrow/src/claim_escrow.cairo.
export const CLAIM_TAG = shortString.encodeShortString("BROTHER_CLAIM:V1");

const ESCROW_DEPOSIT = "0x0";
const ESCROW_CLAIM = "0x1";

const env = (import.meta as any).env ?? {};

// contracts/claim_escrow deployed on Sepolia against the Sepolia STRK20 pool.
export const SEPOLIA_CLAIM_ESCROW = "0x0645bdc0e3d6e4a8d4b74fbd6b66fc608b7d0c0c3fd71ab64ec530e82c3941e7";

/**
 * The claim escrow is only configured where it has been deployed. Mainnet stays
 * unset until the contract has had an external review.
 */
export const claimEscrowAddress = (chainId?: string): string | null => {
  const address = chainId === constants.StarknetChainId.SN_MAIN
    ? env.VITE_CLAIM_ESCROW_MAINNET
    : chainId === constants.StarknetChainId.SN_SEPOLIA
      ? env.VITE_CLAIM_ESCROW_SEPOLIA || SEPOLIA_CLAIM_ESCROW
      : undefined;
  return address ? num.toHex(address) : null;
};

/** A random 248-bit secret, always below the field prime. */
export const newClaimSecret = (random: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes)): string => {
  const bytes = random(new Uint8Array(31));
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

export const claimCommitment = (secret: string): string =>
  hash.computePoseidonHashOnElements([CLAIM_TAG, secret]);

export interface ClaimLinkEntry {
  secret: string;
  amount: bigint;
}

/**
 * Actions that move `entries` out of the payer's private balance and park each
 * one in the escrow under its own secret, in the same transaction as any
 * direct transfers. The pool allows one external invoke per transaction, so
 * every link is parked by a single invoke.
 */
export const parkClaimLinksActions = (
  token: string,
  escrow: string,
  entries: ClaimLinkEntry[],
): WALLET_API.STRK20_ACTION[] => {
  if (entries.length === 0) return [];
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0n);
  return [
    withdrawAction(token, total, escrow),
    {
      type: "invoke",
      contract: escrow,
      calldata: [
        ESCROW_DEPOSIT,
        token,
        num.toHex(entries.length),
        ...entries.flatMap((entry) => [claimCommitment(entry.secret), num.toHex(entry.amount)]),
        "0x0",
        "0x0",
      ],
    },
  ];
};

/** Actions that claim a link into a new open note owned by `claimer`. */
export const claimActions = (token: string, escrow: string, secret: string, claimer: string): WALLET_API.STRK20_ACTION[] => [
  { type: "transfer", token, amount: "OPEN", recipient: claimer },
  {
    type: "invoke",
    contract: escrow,
    calldata: [ESCROW_CLAIM, "0x0", "0x0", secret, "${openNoteIds[0]}"],
  },
];

export interface ClaimLinkDetails {
  secret: string;
  token: PaymentTokenSymbol;
  amount: string;
  network: "mainnet" | "sepolia";
}

/**
 * The secret travels in the URL fragment, which browsers never send to the
 * server, so it stays out of hosting logs and analytics.
 */
export const buildClaimLink = (base: string, details: ClaimLinkDetails): string => {
  const params = new URLSearchParams({ claim: details.secret, t: details.token, a: details.amount, n: details.network });
  return `${base}#${params.toString()}`;
};

export const parseClaimLink = (fragment: string): ClaimLinkDetails | null => {
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  const secret = params.get("claim");
  const token = params.get("t") as PaymentTokenSymbol | null;
  const network = params.get("n");
  if (!secret || !/^0x[0-9a-f]{1,62}$/i.test(secret)) return null;
  if (!token || !(token in PAYMENT_TOKENS)) return null;
  if (network !== "mainnet" && network !== "sepolia") return null;
  return { secret, token, amount: params.get("a") || "", network };
};
