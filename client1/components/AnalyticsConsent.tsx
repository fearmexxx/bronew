import React, { useEffect, useState } from "react";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/react";
import {
  ANALYTICS_CONSENT_EVENT,
  getAnalyticsConsent,
  setAnalyticsConsent,
  trackFunnel,
  type AnalyticsConsent as Consent,
} from "../src/analytics/funnel";

const redactUrl = (event: BeforeSendEvent): BeforeSendEvent => {
  try {
    const url = new URL(event.url, window.location.origin);
    url.search = "";
    url.hash = "";
    return { ...event, url: url.toString() };
  } catch {
    return { ...event, url: window.location.origin + window.location.pathname };
  }
};

const AnalyticsConsent: React.FC = () => {
  const [consent, setConsent] = useState<Consent>(() => getAnalyticsConsent());

  useEffect(() => {
    const updateConsent = (event: Event) => setConsent((event as CustomEvent<Consent>).detail);
    window.addEventListener(ANALYTICS_CONSENT_EVENT, updateConsent);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, updateConsent);
  }, []);

  const choose = (next: Exclude<Consent, "unknown">) => {
    if (!setAnalyticsConsent(next)) return;
    setConsent(next);
    if (next === "granted") window.setTimeout(() => trackFunnel("analytics_opted_in"), 0);
  };

  return (
    <>
      {consent === "granted" && <Analytics mode="production" beforeSend={redactUrl} />}
      {consent === "unknown" && (
        <aside className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#111]/95 p-4 shadow-2xl backdrop-blur-xl" aria-label="Analytics preference">
          <p className="text-sm font-semibold text-white">Help improve private payments?</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">Share anonymous funnel events such as “wallet connected” or “private send completed.” We never include wallet addresses, amounts, names, transaction hashes, or viewing keys.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => choose("granted")} className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-black hover:bg-orange-400">Allow anonymous analytics</button>
            <button onClick={() => choose("denied")} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5">No thanks</button>
          </div>
        </aside>
      )}
      {consent !== "unknown" && (
        <button onClick={() => { if (setAnalyticsConsent("unknown")) setConsent("unknown"); }} className="fixed bottom-3 left-3 z-[90] rounded-lg border border-white/10 bg-black/70 px-2.5 py-1.5 text-[10px] text-gray-500 hover:text-gray-300" aria-label="Change analytics preference">
          Privacy
        </button>
      )}
    </>
  );
};

export default AnalyticsConsent;
