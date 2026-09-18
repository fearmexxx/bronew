import { track } from "@vercel/analytics";

export const ANALYTICS_CONSENT_KEY = "brother_analytics_consent_v1";
export const ANALYTICS_CONSENT_EVENT = "brother:analytics-consent";

export type AnalyticsConsent = "granted" | "denied" | "unknown";

export type FunnelEvent =
  | "analytics_opted_in"
  | "private_wallet_opened"
  | "wallet_connect_opened"
  | "wallet_connected"
  | "privacy_activated"
  | "shield_confirmed"
  | "recipient_resolved"
  | "private_send_confirmed"
  | "unshield_confirmed"
  | "payment_link_copied"
  | "activation_invite_copied";

type SafeDimension = "network" | "recipient_type" | "entry";
type SafeValue = "mainnet" | "sepolia" | "unknown" | "address" | "starknet_id" | "brother_id" | "navigation" | "payment_link" | "activation_invite";
export type FunnelDimensions = Partial<Record<SafeDimension, SafeValue>>;

const safeDimensions = new Set<SafeDimension>(["network", "recipient_type", "entry"]);
const safeValues = new Set<SafeValue>([
  "mainnet", "sepolia", "unknown", "address", "starknet_id", "brother_id",
  "navigation", "payment_link", "activation_invite",
]);

export const getAnalyticsConsent = (): AnalyticsConsent => {
  if (typeof window === "undefined") return "unknown";
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : "unknown";
  } catch {
    return "unknown";
  }
};

export const setAnalyticsConsent = (consent: AnalyticsConsent): boolean => {
  try {
    if (consent === "unknown") window.localStorage.removeItem(ANALYTICS_CONSENT_KEY);
    else window.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
    window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: consent }));
    return true;
  } catch {
    // Fail closed: storage-restricted browsers remain untracked.
    return false;
  }
};

export const sanitizeFunnelDimensions = (dimensions: Record<string, unknown> = {}): FunnelDimensions =>
  Object.fromEntries(Object.entries(dimensions).filter(([key, value]) =>
    safeDimensions.has(key as SafeDimension) && safeValues.has(value as SafeValue),
  )) as FunnelDimensions;

export const trackFunnel = (event: FunnelEvent, dimensions: FunnelDimensions = {}) => {
  if (getAnalyticsConsent() !== "granted") return;
  track(event, sanitizeFunnelDimensions(dimensions));
};
