import { describe, expect, it } from "vitest";
import {
  depositAction,
  hasStrk20WalletMethods,
  parseTokenAmount,
  supportsStrk20Spec,
  transferAction,
  withdrawAction,
} from "./actions";

describe("STRK20 Wallet API adapter", () => {
  it.each(["0.10.3", "0.10.4-rc.1", "0.11.0", "1.0.0"])("accepts compatible spec %s", (version) => {
    expect(supportsStrk20Spec(version)).toBe(true);
  });

  it.each(["0.10.2", "0.9.9", "invalid", "0.10"])("rejects incompatible spec %s", (version) => {
    expect(supportsStrk20Spec(version)).toBe(false);
  });

  it("detects STRK20 support from the wallet methods when specs are not reported", () => {
    expect(hasStrk20WalletMethods({
      strk20Balances: () => [],
      strk20InvokeTransaction: () => ({ transaction_hash: "0x1" }),
    })).toBe(true);
    expect(hasStrk20WalletMethods({ strk20Balances: () => [] })).toBe(false);
  });

  it("parses token values without floating-point precision loss", () => {
    expect(parseTokenAmount("1.000000000000000001")).toBe(1000000000000000001n);
    expect(parseTokenAmount("0.5")).toBe(500000000000000000n);
  });

  it.each(["0", "-1", "NaN", "1.0000000000000000001"])("rejects invalid amount %s", (amount) => {
    expect(() => parseTokenAmount(amount)).toThrow();
  });

  it("encodes all standardized action variants", () => {
    expect(depositAction("0x123", 16n)).toEqual({ type: "deposit", token: "0x123", amount: "0x10" });
    expect(withdrawAction("0x123", 16n, "0x456")).toEqual({
      type: "withdraw", token: "0x123", amount: "0x10", recipient: "0x456",
    });
    expect(transferAction("0x123", 16n, "0x456")).toEqual({
      type: "transfer", token: "0x123", amount: "0x10", recipient: "0x456",
    });
  });
});
