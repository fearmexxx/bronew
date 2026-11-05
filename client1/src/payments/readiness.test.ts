import { describe, expect, it } from "vitest";
import { shortString } from "starknet";
import { BNS_CONTRACT_ADDRESS } from "../constants";
import { publishReadinessCall, readReadiness } from "./readiness";
import type { ResolvedRecipient } from "./resolveRecipient";

const realName: ResolvedRecipient = { address: "0x1", label: "alice.real", source: "brother-id", network: "Sepolia" };

describe("recipient readiness", () => {
  it("is ready when the recipient published strk20=ready on their name", async () => {
    const calls: string[][] = [];
    const getText = async (domain: string, key: string) => {
      calls.push([domain, key]);
      return shortString.encodeShortString("ready");
    };
    expect(await readReadiness(realName, getText)).toBe("ready");
    expect(calls).toEqual([[shortString.encodeShortString("alice"), shortString.encodeShortString("strk20")]]);
  });

  it("is unknown when the record is missing or the lookup fails", async () => {
    expect(await readReadiness(realName, async () => "0x0")).toBe("unknown");
    expect(await readReadiness(realName, async () => { throw new Error("rpc down"); })).toBe("unknown");
  });

  it("is unknown for names and addresses that cannot publish readiness", async () => {
    const getText = async () => shortString.encodeShortString("ready");
    expect(await readReadiness({ ...realName, source: "starknet-id", label: "alice.stark" }, getText)).toBe("unknown");
    expect(await readReadiness({ ...realName, source: "address", label: "0x1…" }, getText)).toBe("unknown");
  });

  it("builds the set_text call that publishes readiness", () => {
    expect(publishReadinessCall("Alice.real")).toEqual({
      contractAddress: BNS_CONTRACT_ADDRESS,
      entrypoint: "set_text",
      calldata: [
        shortString.encodeShortString("alice"),
        shortString.encodeShortString("strk20"),
        shortString.encodeShortString("ready"),
      ],
    });
  });
});
