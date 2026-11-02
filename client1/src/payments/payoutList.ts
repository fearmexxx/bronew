import { parseTokenAmount } from "../strk20/actions";
import type { ResolvedRecipient } from "./resolveRecipient";

// One wallet approval covers the whole batch; keep it within what a single
// privacy proof can reasonably carry until wallets publish a limit.
export const MAX_PAYOUT_RECIPIENTS = 50;

export interface PayoutLine {
  line: number;
  recipient: string;
  amount: string;
}

export interface PayoutLineError {
  line: number;
  message: string;
}

export interface ParsedPayoutList {
  lines: PayoutLine[];
  errors: PayoutLineError[];
}

export interface PreparedPayoutRow {
  line: number;
  recipient: ResolvedRecipient;
  amount: bigint;
}

export interface PreparedPayout {
  rows: PreparedPayoutRow[];
  errors: PayoutLineError[];
  total: bigint;
}

const HEADER = /^(recipient|handle|name|address)\s*[,;\t ]\s*amount$/i;

/**
 * Parses pasted "recipient, amount" lines. Accepts comma, semicolon, tab or
 * whitespace separators so rows can come straight from a spreadsheet. Blank
 * lines, `#` comments and a header row are ignored.
 */
export const parsePayoutList = (text: string): ParsedPayoutList => {
  const lines: PayoutLine[] = [];
  const errors: PayoutLineError[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#") || HEADER.test(trimmed)) return;
    const parts = trimmed.split(/\s*[,;\t]\s*|\s+/).filter(Boolean);
    if (parts.length !== 2) {
      errors.push({ line, message: "Use one recipient and one amount per line, e.g. alice.stark, 25" });
      return;
    }
    lines.push({ line, recipient: parts[0], amount: parts[1] });
  });
  if (lines.length > MAX_PAYOUT_RECIPIENTS) {
    errors.push({ line: lines[MAX_PAYOUT_RECIPIENTS].line, message: `A payout can include at most ${MAX_PAYOUT_RECIPIENTS} recipients.` });
  }
  return { lines, errors };
};

/**
 * Resolves every recipient and parses every amount before anything is signed.
 * Lines that fail are reported individually so the payer can fix them; the
 * batch is only payable when `errors` is empty.
 */
export const preparePayout = async (
  parsed: ParsedPayoutList,
  decimals: number,
  resolve: (recipient: string) => Promise<ResolvedRecipient>,
): Promise<PreparedPayout> => {
  const errors = [...parsed.errors];
  const settled = await Promise.all(parsed.lines.map(async (entry) => {
    try {
      const amount = parseTokenAmount(entry.amount, decimals);
      const recipient = await resolve(entry.recipient);
      return { line: entry.line, recipient, amount } satisfies PreparedPayoutRow;
    } catch (error: any) {
      errors.push({ line: entry.line, message: `${entry.recipient}: ${error?.message || String(error)}` });
      return null;
    }
  }));

  const rows: PreparedPayoutRow[] = [];
  const seen = new Map<string, number>();
  for (const row of settled) {
    if (!row) continue;
    const firstLine = seen.get(row.recipient.address);
    if (firstLine !== undefined) {
      errors.push({ line: row.line, message: `${row.recipient.label} resolves to the same address as line ${firstLine}. Combine them into one line.` });
      continue;
    }
    seen.set(row.recipient.address, row.line);
    rows.push(row);
  }

  errors.sort((a, b) => a.line - b.line);
  return { rows, errors, total: rows.reduce((sum, row) => sum + row.amount, 0n) };
};
