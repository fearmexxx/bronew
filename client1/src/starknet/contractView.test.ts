import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { callLatest } from "./contractView";

describe("Starknet.js v10 contract view adapter", () => {
  it("keeps block options separate from ABI calldata", async () => {
    const call = vi.fn().mockResolvedValue(true);
    const result = await callLatest({ call } as any, "is_domain_available", ["0x123"]);

    expect(result).toBe(true);
    expect(call).toHaveBeenCalledWith(
      "is_domain_available",
      ["0x123"],
      { blockIdentifier: "latest" },
    );
  });

  it("uses an empty argument array for zero-input view methods", async () => {
    const call = vi.fn().mockResolvedValue(3n);
    await callLatest({ call } as any, "get_param_proposal_count");
    expect(call).toHaveBeenCalledWith(
      "get_param_proposal_count",
      [],
      { blockIdentifier: "latest" },
    );
  });

  it("prevents call options from being appended to generated ABI methods", () => {
    const hookFiles = ["../hooks/useBns.ts", "../hooks/useAuction.ts"];
    for (const relativePath of hookFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
      expect(source).not.toMatch(/contract\.[a-zA-Z_]\w*\([^;]*blockIdentifier/s);
      expect(source).not.toMatch(/tokenContract\.[a-zA-Z_]\w*\([^;]*blockIdentifier/s);
    }
  });
});
