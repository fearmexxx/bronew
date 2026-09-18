import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

import { track } from "@vercel/analytics";
import {
  ANALYTICS_CONSENT_KEY,
  getAnalyticsConsent,
  sanitizeFunnelDimensions,
  trackFunnel,
} from "./funnel";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
});

describe("privacy-safe funnel analytics", () => {
  it("defaults to no consent", () => {
    expect(getAnalyticsConsent()).toBe("unknown");
  });

  it("does not send events before explicit opt-in", () => {
    trackFunnel("wallet_connected", { network: "mainnet" });
    expect(track).not.toHaveBeenCalled();
  });

  it("allows only fixed, non-identifying dimensions", () => {
    storage.set(ANALYTICS_CONSENT_KEY, "granted");
    trackFunnel("recipient_resolved", {
      network: "mainnet",
      recipient_type: "starknet_id",
      ...({ address: "0x123", amount: "100" } as any),
    });
    expect(track).toHaveBeenCalledWith("recipient_resolved", {
      network: "mainnet",
      recipient_type: "starknet_id",
    });
  });

  it("drops unexpected values even on allowed keys", () => {
    expect(sanitizeFunnelDimensions({ network: "0xprivate", entry: "payment_link" })).toEqual({ entry: "payment_link" });
  });

  it("fails closed when browser storage is unavailable", async () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => { throw new Error("blocked"); } } });
    const { setAnalyticsConsent } = await import("./funnel");
    expect(getAnalyticsConsent()).toBe("unknown");
    expect(setAnalyticsConsent("granted")).toBe(false);
  });
});
