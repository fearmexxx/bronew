import React, { useCallback, useEffect, useState } from "react";
import { Shield, Lock, Unlock, Send, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";
import { constants, num, shortString, validateAndParseAddress } from "starknet";
import type { WALLET_API } from "@starknet-io/types-js";
import { useAccount } from "../src/starknet/StarknetProvider";
import { STRK_TOKEN_ADDRESS, BNS_CONTRACT_ADDRESS, provider, providerForChain, voyagerTxUrl } from "../src/constants";
import { depositAction, parseTokenAmount, transferAction, withdrawAction } from "../src/strk20/actions";

interface PrivateWalletProps {
  walletAddress: string | null;
  domain?: string;
  initialRecipient?: string;
}

const formatStrk = (amount: bigint): string => {
  const whole = amount / 10n ** 18n;
  const fraction = (amount % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction.slice(0, 6)}` : whole.toString();
};

const privacyError = (error: any): string => {
  const message = error?.message || error?.toString?.() || String(error);
  if (/NOT_REGISTERED/i.test(message)) {
    return "Privacy is not activated for this wallet yet. In Xverse, open Starknet and turn on the shield toggle, approve the one-time activation, then return here and retry.";
  }
  if (/not supported|method not found|unsupported/i.test(message)) {
    return "This wallet does not expose STRK20 Wallet API v0.10.3. Connect a privacy-enabled Xverse or Ready wallet.";
  }
  return message;
};

export const PrivateWallet: React.FC<PrivateWalletProps> = ({ walletAddress, initialRecipient }) => {
  const [activeTab, setActiveTab] = useState<"shield" | "unshield" | "send">(initialRecipient ? "send" : "shield");
  const [shieldAmount, setShieldAmount] = useState("1");
  const [unshieldAmount, setUnshieldAmount] = useState("1");
  const [sendToDomain, setSendToDomain] = useState(initialRecipient || "");
  const [sendAmount, setSendAmount] = useState("1");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [needsPrivacyActivation, setNeedsPrivacyActivation] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [privateBalance, setPrivateBalance] = useState<bigint>(0n);
  const { account, chainId, isConnected, isPrivacyCapable, supportedSpecs, switchNetwork, walletName } = useAccount();
  const isMainnet = chainId === constants.StarknetChainId.SN_MAIN;

  useEffect(() => {
    if (initialRecipient) {
      setSendToDomain(initialRecipient);
      setActiveTab("send");
    }
  }, [initialRecipient]);

  const loadPrivateBalance = useCallback(async () => {
    if (!account || !isPrivacyCapable) {
      setPrivateBalance(0n);
      return;
    }
    setIsRefreshing(true);
    try {
      const balances = await account.strk20Balances([STRK_TOKEN_ADDRESS]);
      const entry: any = balances?.[0];
      setPrivateBalance(entry ? num.toBigInt(entry.balance ?? entry.amount ?? entry[1] ?? 0) : 0n);
      setNeedsPrivacyActivation(false);
    } catch (error: any) {
      setNeedsPrivacyActivation(/NOT_REGISTERED/i.test(error?.message || String(error)));
      setStatusMsg(privacyError(error));
      setPrivateBalance(0n);
    } finally {
      setIsRefreshing(false);
    }
  }, [account, isPrivacyCapable]);

  useEffect(() => {
    void loadPrivateBalance();
  }, [loadPrivateBalance, walletAddress]);

  const submit = async (actions: WALLET_API.STRK20_ACTION[], pendingMessage: string) => {
    if (!isConnected || !account) throw new Error("Connect a Starknet wallet first.");
    if (!isPrivacyCapable) throw new Error("Connect a wallet supporting STRK20 Wallet API v0.10.3.");
    setStatusMsg(pendingMessage);
    const response = await account.strk20InvokeTransaction(actions);
    setTxHash(response.transaction_hash);
    setStatusMsg("Privacy proof submitted. Waiting for Starknet confirmation…");
    await providerForChain(chainId).waitForTransaction(response.transaction_hash, { retries: 400, retryInterval: 3000 });
    const stored = JSON.parse(localStorage.getItem("brother_strk20_transactions") || "[]");
    localStorage.setItem("brother_strk20_transactions", JSON.stringify([
      { hash: response.transaction_hash, chainId, createdAt: new Date().toISOString() },
      ...stored.filter((entry: any) => entry?.hash !== response.transaction_hash),
    ].slice(0, 20)));
    await loadPrivateBalance();
    return response.transaction_hash;
  };

  const runAction = async (operation: () => Promise<void>) => {
    setIsProcessing(true);
    setStatusMsg(null);
    setTxHash(null);
    try {
      await operation();
    } catch (error: any) {
      setNeedsPrivacyActivation(/NOT_REGISTERED/i.test(error?.message || String(error)));
      setStatusMsg(privacyError(error));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShield = () => runAction(async () => {
    const amount = parseTokenAmount(shieldAmount);
    await submit(
      [depositAction(STRK_TOKEN_ADDRESS, amount)],
      "Confirm shielding in your privacy-enabled wallet. Proof generation can take several minutes…",
    );
    setStatusMsg(`Shielded ${shieldAmount} STRK into the STRK20 privacy pool.`);
  });

  const handleUnshield = () => runAction(async () => {
    if (!walletAddress) throw new Error("Connect a wallet first.");
    const amount = parseTokenAmount(unshieldAmount);
    if (amount > privateBalance) throw new Error("Cannot unshield more than your private STRK balance.");
    await submit(
      [withdrawAction(STRK_TOKEN_ADDRESS, amount, walletAddress)],
      "Confirm the STRK20 withdrawal in your wallet. The public recipient will be visible…",
    );
    setStatusMsg(`Unshielded ${unshieldAmount} STRK to your public wallet.`);
  });

  const handlePrivateSend = () => runAction(async () => {
    const amount = parseTokenAmount(sendAmount);
    if (amount > privateBalance) throw new Error("Insufficient private STRK balance.");
    const input = sendToDomain.trim().toLowerCase();
    let recipient: string;
    let recipientLabel: string;
    if (input.startsWith("0x")) {
      recipient = validateAndParseAddress(input);
      recipientLabel = `${recipient.slice(0, 8)}…${recipient.slice(-6)}`;
    } else {
      const domain = input.replace(/\.real$/, "");
      if (!domain || domain.length > 31) throw new Error("Enter a valid .real name or Starknet address.");
      setStatusMsg(`Resolving ${domain}.real on Sepolia…`);
      const resolved = await provider.callContract({
        contractAddress: BNS_CONTRACT_ADDRESS,
        entrypoint: "resolve_domain",
        calldata: [shortString.encodeShortString(domain)],
      });
      recipient = resolved[0];
      recipientLabel = `${domain}.real`;
      if (!recipient || num.toBigInt(recipient) === 0n) throw new Error(`${domain}.real is not registered.`);
    }
    await submit(
      [transferAction(STRK_TOKEN_ADDRESS, amount, recipient)],
      `Confirm the private transfer to ${recipientLabel}. Sender, recipient, and amount are protected by STRK20…`,
    );
    setStatusMsg(`Privately transferred ${sendAmount} STRK to ${recipientLabel}.`);
  });

  const canTransact = Boolean(isConnected && account && isPrivacyCapable && !isProcessing);

  const handleSwitchToMainnet = async () => {
    setIsSwitchingNetwork(true);
    setStatusMsg("Confirm the Mainnet switch in your wallet…");
    try {
      await switchNetwork(constants.StarknetChainId.SN_MAIN);
      setStatusMsg("Wallet connected to Starknet Mainnet.");
    } catch (error: any) {
      setStatusMsg(privacyError(error));
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Lock className="w-3.5 h-3.5" /> STRK20 · {isMainnet ? "Mainnet" : "Sepolia"}
        </div>
        <h2 className="text-3xl font-bold font-display text-white">Private STRK Wallet</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Encrypted-note balances and STARK-proven transfers managed by your privacy-enabled wallet. Brother ID never receives your viewing key.
        </p>
      </div>

      {!isPrivacyCapable && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3 text-sm text-amber-100">
          <AlertTriangle className="w-5 h-5 flex-none mt-0.5" />
          <div>
            <p className="font-semibold">STRK20-compatible wallet required</p>
            <p className="text-amber-200/80 mt-1">
              {isConnected
                ? `${walletName || "The connected wallet"} does not expose the STRK20 balance and transaction methods to this page. Update the wallet, reconnect it, and make sure Starknet support is enabled.`
                : "Connect Xverse, Ready, or another wallet exposing STRK20 Wallet API v0.10.3+."}
            </p>
          </div>
        </div>
      )}

      {isPrivacyCapable && supportedSpecs.length === 0 && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center text-xs text-emerald-200/80">
          STRK20 methods detected from {walletName || "your wallet"}; optional version metadata was not reported.
        </div>
      )}

      {needsPrivacyActivation && (
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5 text-sm text-orange-100 space-y-3">
          <p className="font-bold text-base">Activate privacy once in {walletName || "your wallet"}</p>
          <ol className="list-decimal pl-5 space-y-1 text-orange-100/80">
            <li>Open Xverse and select your Starknet account.</li>
            <li>Make sure Mainnet is selected and keep a small public STRK balance for gas.</li>
            <li>Turn on the shield icon/toggle and approve the one-time privacy activation.</li>
            <li>Return here and press “Check activation”.</li>
          </ol>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => void loadPrivateBalance()} disabled={isRefreshing} className="rounded-xl bg-orange-400 px-4 py-2 font-bold text-black disabled:opacity-50">
              {isRefreshing ? "Checking…" : "Check activation"}
            </button>
            <a href="https://www.starknet.io/blog/strkbtc-user-guide/" target="_blank" rel="noreferrer" className="rounded-xl border border-orange-400/30 px-4 py-2 font-semibold text-orange-200">
              Xverse shield guide
            </a>
          </div>
        </div>
      )}

      {isConnected && !isMainnet && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 flex items-center justify-between gap-4 text-sm text-blue-100">
          <span>You are using Sepolia test funds. Switch to Mainnet for Sprint-eligible STRK20 transactions.</span>
          <button onClick={handleSwitchToMainnet} disabled={isSwitchingNetwork} className="rounded-xl bg-blue-400 px-4 py-2 font-bold text-black whitespace-nowrap disabled:opacity-50">{isSwitchingNetwork ? "Waiting for wallet…" : "Switch to Mainnet"}</button>
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500">Private STRK balance</p>
            <p className="text-3xl font-mono font-bold text-white mt-1">{formatStrk(privateBalance)} STRK</p>
          </div>
          <button onClick={() => void loadPrivateBalance()} disabled={!isPrivacyCapable || isRefreshing} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40">
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex rounded-2xl bg-white/[0.03] border border-white/10 p-1">
        {(["shield", "send", "unshield"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 rounded-xl capitalize font-semibold transition ${activeTab === tab ? "bg-orange-500 text-black" : "text-gray-400 hover:text-white"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#0d0d0d] p-6 sm:p-8 space-y-6">
        {activeTab === "shield" && <>
          <label className="block text-sm text-gray-300">STRK to shield<input value={shieldAmount} onChange={(e) => setShieldAmount(e.target.value)} className="mt-2 w-full rounded-xl bg-black border border-white/10 p-4 text-white font-mono" /></label>
          <button onClick={handleShield} disabled={!canTransact} className="w-full py-4 rounded-xl bg-orange-500 text-black font-bold disabled:opacity-40 flex items-center justify-center gap-2"><Shield className="w-5 h-5" />{isProcessing ? "Generating proof…" : "Shield with STRK20"}</button>
        </>}
        {activeTab === "send" && <>
          <label className="block text-sm text-gray-300">Recipient .real name or Starknet address<input value={sendToDomain} onChange={(e) => setSendToDomain(e.target.value)} placeholder="alice.real or 0x…" className="mt-2 w-full rounded-xl bg-black border border-white/10 p-4 text-white" /></label>
          <label className="block text-sm text-gray-300">Private STRK amount<input value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} className="mt-2 w-full rounded-xl bg-black border border-white/10 p-4 text-white font-mono" /></label>
          <button onClick={handlePrivateSend} disabled={!canTransact} className="w-full py-4 rounded-xl bg-emerald-400 text-black font-bold disabled:opacity-40 flex items-center justify-center gap-2"><Send className="w-5 h-5" />{isProcessing ? "Generating proof…" : "Private transfer"}</button>
        </>}
        {activeTab === "unshield" && <>
          <label className="block text-sm text-gray-300">STRK to unshield<input value={unshieldAmount} onChange={(e) => setUnshieldAmount(e.target.value)} className="mt-2 w-full rounded-xl bg-black border border-white/10 p-4 text-white font-mono" /></label>
          <button onClick={handleUnshield} disabled={!canTransact} className="w-full py-4 rounded-xl bg-white text-black font-bold disabled:opacity-40 flex items-center justify-center gap-2"><Unlock className="w-5 h-5" />{isProcessing ? "Generating proof…" : "Unshield to public wallet"}</button>
        </>}
      </div>

      {statusMsg && <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-gray-200">{statusMsg}</div>}
      {txHash && <a href={voyagerTxUrl(chainId, txHash)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-sm text-orange-400 hover:text-orange-300">View privacy transaction <ExternalLink className="w-4 h-4" /></a>}
      <p className="text-xs text-center text-gray-500">Direct addresses work on the connected network. `.real` names currently resolve through the Brother ID Sepolia registry; STRK20 settlement uses the network shown above.</p>
      <p className="text-xs text-center text-gray-600">The former Brother Identity escrow remains deployed for historical withdrawals but is not used by this STRK20 interface.</p>
    </div>
  );
};

export default PrivateWallet;
