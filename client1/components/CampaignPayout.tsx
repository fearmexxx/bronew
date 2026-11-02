import React, { useState } from "react";
import { AlertTriangle, Check, Users } from "lucide-react";
import { resolveRecipient, recipientSourceLabel } from "../src/payments/resolveRecipient";
import { MAX_PAYOUT_RECIPIENTS, parsePayoutList, preparePayout, type PreparedPayout, type PreparedPayoutRow } from "../src/payments/payoutList";
import { formatTokenAmount, type PaymentToken } from "../src/payments/tokens";

interface CampaignPayoutProps {
  token: PaymentToken;
  chainId?: string;
  privateBalance: bigint;
  canTransact: boolean;
  isProcessing: boolean;
  onPay: (rows: PreparedPayoutRow[]) => Promise<void>;
}

const PLACEHOLDER = "alice.stark, 250\nbob.stark, 120\n0x04a1…c9f2, 75";

export const CampaignPayout: React.FC<CampaignPayoutProps> = ({ token, chainId, privateBalance, canTransact, isProcessing, onPay }) => {
  const [listText, setListText] = useState("");
  const [prepared, setPrepared] = useState<PreparedPayout | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkRecipients = async () => {
    setIsChecking(true);
    try {
      setPrepared(await preparePayout(parsePayoutList(listText), token.decimals, (recipient) => resolveRecipient(recipient, chainId)));
    } finally {
      setIsChecking(false);
    }
  };

  const amount = (value: bigint) => `${formatTokenAmount(value, token.decimals)} ${token.symbol}`;
  const overBalance = Boolean(prepared && prepared.total > privateBalance);
  const canPay = Boolean(prepared && prepared.rows.length > 0 && prepared.errors.length === 0 && !overBalance && canTransact);

  return (
    <div className="space-y-5">
      <div className="flex gap-3 text-sm text-gray-400">
        <Users className="w-5 h-5 text-orange-400 flex-none mt-0.5" />
        <p>Paste one recipient and one {token.symbol} amount per line, straight from a spreadsheet. Every recipient is checked before anything is signed, then the whole list is paid privately in one wallet approval. Up to {MAX_PAYOUT_RECIPIENTS} recipients.</p>
      </div>
      <label className="block text-sm text-gray-300">Recipients and amounts
        <textarea
          value={listText}
          onChange={(e) => { setListText(e.target.value); setPrepared(null); }}
          placeholder={PLACEHOLDER}
          rows={7}
          className="mt-2 w-full rounded-xl bg-black border border-white/10 p-4 text-white font-mono text-sm"
        />
      </label>
      <button onClick={() => void checkRecipients()} disabled={!listText.trim() || isChecking} className="w-full py-3 rounded-xl border border-white/15 text-white font-semibold disabled:opacity-40">
        {isChecking ? "Checking recipients…" : "Check recipients"}
      </button>

      {prepared && (
        <div className="space-y-3">
          {prepared.rows.length > 0 && (
            <div className="rounded-xl border border-white/10 divide-y divide-white/5 text-sm">
              {prepared.rows.map((row) => (
                <div key={row.line} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0 truncate text-white"><Check className="inline w-4 h-4 mr-2 text-emerald-400" />{row.recipient.label}
                    <span className="ml-2 text-xs text-gray-500">{recipientSourceLabel(row.recipient.source)} · {row.recipient.network}</span>
                  </span>
                  <span className="font-mono text-gray-200 whitespace-nowrap">{amount(row.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-2.5 font-semibold text-white">
                <span>{prepared.rows.length} recipient{prepared.rows.length === 1 ? "" : "s"}</span>
                <span className="font-mono">{amount(prepared.total)}</span>
              </div>
            </div>
          )}
          {prepared.errors.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100 space-y-1">
              <p className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Fix these lines before paying</p>
              {prepared.errors.map((error) => <p key={`${error.line}-${error.message}`} className="text-red-100/80">Line {error.line}: {error.message}</p>)}
            </div>
          )}
          {overBalance && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              The total is more than your private balance of {amount(privateBalance)}. Shield more {token.symbol} first.
            </p>
          )}
        </div>
      )}

      <button onClick={() => prepared && void onPay(prepared.rows)} disabled={!canPay} className="w-full py-4 rounded-xl bg-emerald-400 text-black font-bold disabled:opacity-40 flex items-center justify-center gap-2">
        <Users className="w-5 h-5" />
        {isProcessing ? "Generating proof…" : prepared?.rows.length ? `Pay ${prepared.rows.length} recipient${prepared.rows.length === 1 ? "" : "s"} privately` : "Check recipients first"}
      </button>
    </div>
  );
};

export default CampaignPayout;
