import { describe, expect, it } from "vitest";
import { constants } from "starknet";
import {
  SEPOLIA_CLAIM_ESCROW,
  buildClaimLink,
  claimEscrowAddress,
  claimActions,
  claimCommitment,
  newClaimSecret,
  parkClaimLinksActions,
  parseClaimLink,
} from "./claimLinks";

const TOKEN = "0x0512feac6339ff7889822cb5aa2a86c848e9d392bb0e3e237c008674feed8343";
const ESCROW = "0xe5c";

describe("claim links", () => {
  it("uses the deployed escrow on Sepolia and none on Mainnet", () => {
    expect(claimEscrowAddress(constants.StarknetChainId.SN_SEPOLIA)).toBe(SEPOLIA_CLAIM_ESCROW);
    expect(claimEscrowAddress(constants.StarknetChainId.SN_MAIN)).toBeNull();
  });

  it("hashes secrets exactly like the Cairo escrow", () => {
    // Same vector as contracts/claim_escrow/src/tests.cairo.
    expect(claimCommitment("0x1234")).toBe("0x5791f393f4ea2f6e646ed5acb82fb96fe78ec1cc4a3ce412e50701d38047bd8");
  });

  it("generates 31-byte secrets that fit in a felt", () => {
    const secret = newClaimSecret((bytes) => bytes.fill(0xff));
    expect(secret).toBe(`0x${"ff".repeat(31)}`);
    expect(newClaimSecret()).toMatch(/^0x[0-9a-f]{62}$/);
  });

  it("parks every link with one withdrawal of the total and one invoke", () => {
    const actions = parkClaimLinksActions(TOKEN, ESCROW, [
      { secret: "0x1234", amount: 10n },
      { secret: "0x99", amount: 20n },
    ]);
    expect(actions).toEqual([
      { type: "withdraw", token: TOKEN, amount: "0x1e", recipient: ESCROW },
      {
        type: "invoke",
        contract: ESCROW,
        calldata: [
          "0x0", TOKEN, "0x2",
          claimCommitment("0x1234"), "0xa",
          claimCommitment("0x99"), "0x14",
          "0x0", "0x0",
        ],
      },
    ]);
    expect(parkClaimLinksActions(TOKEN, ESCROW, [])).toEqual([]);
  });

  it("claims into an open note for the claimer", () => {
    expect(claimActions(TOKEN, ESCROW, "0x1234", "0xabc")).toEqual([
      { type: "transfer", token: TOKEN, amount: "OPEN", recipient: "0xabc" },
      { type: "invoke", contract: ESCROW, calldata: ["0x1", "0x0", "0x0", "0x1234", "${openNoteIds[0]}"] },
    ]);
  });

  it("round-trips link details through the URL fragment", () => {
    const link = buildClaimLink("https://bronew.vercel.app/", { secret: "0xabc", token: "USDC", amount: "25", network: "sepolia" });
    expect(link).toBe("https://bronew.vercel.app/#claim=0xabc&t=USDC&a=25&n=sepolia");
    expect(parseClaimLink(new URL(link).hash)).toEqual({ secret: "0xabc", token: "USDC", amount: "25", network: "sepolia" });
  });

  it.each(["", "#claim=nothex&t=USDC&n=sepolia", "#claim=0x1&t=DOGE&n=sepolia", "#claim=0x1&t=USDC&n=goerli"])(
    "rejects malformed link %s",
    (fragment) => expect(parseClaimLink(fragment)).toBeNull(),
  );
});
