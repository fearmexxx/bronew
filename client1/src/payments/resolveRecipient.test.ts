import { describe, expect, it, vi } from "vitest";
import { constants } from "starknet";
import { resolveRecipient } from "./resolveRecipient";

const ADDRESS = "0x123";

describe("payment recipient resolver", () => {
  it("accepts a direct address on the connected network", async () => {
    const result = await resolveRecipient(ADDRESS, constants.StarknetChainId.SN_MAIN);
    expect(result.source).toBe("address");
    expect(result.network).toBe("Mainnet");
    expect(BigInt(result.address)).toBe(0x123n);
  });

  it("resolves .stark through the connected network provider", async () => {
    const resolveStarkName = vi.fn().mockResolvedValue(ADDRESS);
    const result = await resolveRecipient("alice.stark", constants.StarknetChainId.SN_MAIN, { resolveStarkName });
    expect(resolveStarkName).toHaveBeenCalledWith("alice.stark", constants.StarknetChainId.SN_MAIN);
    expect(result).toMatchObject({ label: "alice.stark", source: "starknet-id", network: "Mainnet" });
  });

  it("resolves .real only on Sepolia and reports its provenance", async () => {
    const resolveBrotherName = vi.fn().mockResolvedValue(ADDRESS);
    const result = await resolveRecipient("alice.real", constants.StarknetChainId.SN_SEPOLIA, { resolveBrotherName });
    expect(resolveBrotherName).toHaveBeenCalledWith("alice");
    expect(result).toMatchObject({ label: "alice.real", source: "brother-id", network: "Sepolia" });
  });

  it("blocks Sepolia .real resolution for Mainnet payments", async () => {
    await expect(resolveRecipient("alice.real", constants.StarknetChainId.SN_MAIN)).rejects.toThrow(/Sepolia beta/);
  });

  it("rejects unknown and zero-address recipients", async () => {
    await expect(resolveRecipient("alice", constants.StarknetChainId.SN_MAIN)).rejects.toThrow(/Unknown recipient format/);
    await expect(resolveRecipient("0x0", constants.StarknetChainId.SN_MAIN)).rejects.toThrow(/not registered/);
    await expect(resolveRecipient("alice.stark", constants.StarknetChainId.SN_MAIN, {
      resolveStarkName: async () => "0x0",
    })).rejects.toThrow(/not registered/);
  });
});
