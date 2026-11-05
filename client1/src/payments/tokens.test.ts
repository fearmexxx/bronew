import { describe, expect, it } from "vitest";
import { constants } from "starknet";
import { PAYMENT_TOKENS, formatTokenAmount, tokenAddressForChain } from "./tokens";

describe("payment tokens", () => {
  it("uses native USDC on Mainnet and the Circle test token on Sepolia", () => {
    expect(tokenAddressForChain(PAYMENT_TOKENS.USDC, constants.StarknetChainId.SN_MAIN))
      .toBe("0x033068f6539f8e6e6b131e6b2b814e6c34a5224bc66947c47dab9dfee93b35fb");
    expect(tokenAddressForChain(PAYMENT_TOKENS.USDC, constants.StarknetChainId.SN_SEPOLIA))
      .toBe(PAYMENT_TOKENS.USDC.sepolia);
  });

  it("formats amounts using the token's decimals", () => {
    expect(formatTokenAmount(25_500_000n, 6)).toBe("25.5");
    expect(formatTokenAmount(1_000_000n, 6)).toBe("1");
    expect(formatTokenAmount(1_234_567_890_000_000_000n, 18)).toBe("1.234567");
    expect(formatTokenAmount(0n, 18)).toBe("0");
  });
});
