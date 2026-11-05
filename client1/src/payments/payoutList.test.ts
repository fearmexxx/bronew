import { describe, expect, it } from "vitest";
import { MAX_PAYOUT_RECIPIENTS, parsePayoutList, planPayout, preparePayout } from "./payoutList";
import type { ResolvedRecipient } from "./resolveRecipient";

const recipient = (label: string, address: string): ResolvedRecipient => ({
  address,
  label,
  source: "starknet-id",
  network: "Mainnet",
});

const directory: Record<string, ResolvedRecipient> = {
  "alice.stark": recipient("alice.stark", "0x1"),
  "bob.stark": recipient("bob.stark", "0x2"),
  "bob-alt.stark": recipient("bob-alt.stark", "0x2"),
};

const resolve = async (input: string) => {
  const found = directory[input];
  if (!found) throw new Error(`${input} is not registered.`);
  return found;
};

describe("parsePayoutList", () => {
  it("accepts comma, tab, semicolon and space separators and skips headers, comments and blanks", () => {
    const parsed = parsePayoutList("recipient,amount\nalice.stark, 25\n\n# ambassadors\nbob.stark\t10.5\ncarol.stark;3\ndave.stark 1");
    expect(parsed.errors).toEqual([]);
    expect(parsed.lines).toEqual([
      { line: 2, recipient: "alice.stark", amount: "25" },
      { line: 5, recipient: "bob.stark", amount: "10.5" },
      { line: 6, recipient: "carol.stark", amount: "3" },
      { line: 7, recipient: "dave.stark", amount: "1" },
    ]);
  });

  it("reports malformed lines with their line number", () => {
    const parsed = parsePayoutList("alice.stark\nbob.stark, 1, extra");
    expect(parsed.lines).toEqual([]);
    expect(parsed.errors.map((error) => error.line)).toEqual([1, 2]);
  });

  it("rejects lists over the recipient limit", () => {
    const text = Array.from({ length: MAX_PAYOUT_RECIPIENTS + 1 }, (_, i) => `user${i}.stark, 1`).join("\n");
    const parsed = parsePayoutList(text);
    expect(parsed.errors).toEqual([{ line: MAX_PAYOUT_RECIPIENTS + 1, message: expect.stringContaining(`${MAX_PAYOUT_RECIPIENTS}`) }]);
  });
});

describe("preparePayout", () => {
  it("resolves recipients, parses amounts with token decimals and totals them", async () => {
    const prepared = await preparePayout(parsePayoutList("alice.stark, 25\nbob.stark, 0.5"), 6, resolve);
    expect(prepared.errors).toEqual([]);
    expect(prepared.rows.map((row) => [row.recipient.label, row.amount])).toEqual([
      ["alice.stark", 25_000_000n],
      ["bob.stark", 500_000n],
    ]);
    expect(prepared.total).toBe(25_500_000n);
  });

  it("reports unresolvable recipients and invalid amounts per line without dropping valid rows", async () => {
    const prepared = await preparePayout(parsePayoutList("ghost.stark, 1\nalice.stark, abc\nbob.stark, 2"), 6, resolve);
    expect(prepared.rows.map((row) => row.recipient.label)).toEqual(["bob.stark"]);
    expect(prepared.errors.map((error) => error.line)).toEqual([1, 2]);
    expect(prepared.errors[0].message).toContain("ghost.stark is not registered");
  });

  it("rejects amounts with more decimals than the token supports", async () => {
    const prepared = await preparePayout(parsePayoutList("alice.stark, 1.0000001"), 6, resolve);
    expect(prepared.rows).toEqual([]);
    expect(prepared.errors[0].message).toContain("6 decimal places");
  });

  it("flags two lines that resolve to the same address", async () => {
    const prepared = await preparePayout(parsePayoutList("bob.stark, 1\nbob-alt.stark, 2"), 6, resolve);
    expect(prepared.rows).toHaveLength(1);
    expect(prepared.errors).toEqual([{ line: 2, message: expect.stringContaining("same address as line 1") }]);
    expect(prepared.total).toBe(1_000_000n);
  });
});

describe("planPayout", () => {
  it("pays ready recipients directly and sends claim links to the rest", async () => {
    const prepared = await preparePayout(
      parsePayoutList("alice.stark, 1\nbob.stark, 2"),
      6,
      resolve,
      async (recipient) => recipient.label === "alice.stark" ? "ready" : "unknown",
    );
    const plan = planPayout(prepared.rows, true);
    expect(plan.direct.map((row) => row.recipient.label)).toEqual(["alice.stark"]);
    expect(plan.links.map((row) => row.recipient.label)).toEqual(["bob.stark"]);
  });

  it("pays everyone directly when claim links are off", async () => {
    const prepared = await preparePayout(parsePayoutList("alice.stark, 1\nbob.stark, 2"), 6, resolve);
    expect(prepared.rows.every((row) => row.readiness === "unknown")).toBe(true);
    expect(planPayout(prepared.rows, false)).toEqual({ direct: prepared.rows, links: [] });
  });
});
