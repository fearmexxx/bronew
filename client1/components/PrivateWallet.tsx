import React, { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, Send, RefreshCw, ExternalLink, CheckCircle } from 'lucide-react';
import { useAccount } from '@starknet-react/core';
import { CallData, shortString, RpcProvider } from 'starknet';
import { IDENTITY_CONTRACT_ADDRESS, STRK_TOKEN_ADDRESS, BNS_CONTRACT_ADDRESS, provider, voyagerScanBaseUrl } from '../src/constants';

interface PrivateWalletProps {
  walletAddress: string | null;
  domain?: string;
  initialRecipient?: string;
}

export const PrivateWallet: React.FC<PrivateWalletProps> = ({ walletAddress, initialRecipient }) => {
  const [activeTab, setActiveTab] = useState<'shield' | 'unshield' | 'send'>(initialRecipient ? 'send' : 'shield');
  const [shieldAmount, setShieldAmount] = useState('10');
  const [unshieldAmount, setUnshieldAmount] = useState('5');
  const [sendToDomain, setSendToDomain] = useState(initialRecipient || 'alice.real');
  const [sendAmount, setSendAmount] = useState('5');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [shieldedOnChainBalance, setShieldedOnChainBalance] = useState<string>('0.00 STRK');
  const [currentShieldedWei, setCurrentShieldedWei] = useState<bigint>(0n);

  const { account, isConnected } = useAccount();

  // Sync initialRecipient when parent re-renders with a new contact target
  useEffect(() => {
    if (initialRecipient) {
      setSendToDomain(initialRecipient);
      setActiveTab('send');
    }
  }, [initialRecipient]);

  // Load real on-chain shielded state from deployed IdentityContract
  const loadShieldedState = async () => {
    if (!walletAddress) {
      setShieldedOnChainBalance('0.00 STRK');
      setCurrentShieldedWei(0n);
      return;
    }

    try {
      const res: any = await provider.callContract({
        contractAddress: IDENTITY_CONTRACT_ADDRESS,
        entrypoint: 'get_identity_details_of',
        calldata: [walletAddress],
      }, 'latest');

      let arr: string[] = [];
      if (Array.isArray(res)) arr = res;
      else if (res?.result) arr = res.result;

      if (arr.length >= 3) {
        const sLow = BigInt(arr[2]);
        const sHigh = BigInt(arr[3] || '0x0');
        const total = (sHigh << 128n) + sLow;
        setCurrentShieldedWei(total);
        setShieldedOnChainBalance(`${(Number(total) / 1e18).toFixed(2)} STRK`);
      }
    } catch (e) {
      console.warn('Could not read shielded balance:', e);
    }
  };

  useEffect(() => {
    loadShieldedState();
  }, [walletAddress]);

  // Cumulative Shield: Transfers STRK into identity escrow pool and records deposit
  const handleShieldOnChain = async () => {
    if (!isConnected || !account) {
      setStatusMsg('Please connect your Starknet wallet first.');
      return;
    }

    setIsProcessing(true);
    setStatusMsg('Signing real on-chain STRK transfer to privacy escrow pool...');
    setTxHash(null);

    try {
      const depositWei = BigInt(Math.floor(parseFloat(shieldAmount || '1') * 1e18));

      const depLow = (depositWei & ((1n << 128n) - 1n)).toString();
      const depHigh = (depositWei >> 128n).toString();

      // Multicall: 1. Transfer STRK tokens to Identity pool, 2. Enable privacy, 3. Record deposit
      const tx = await account.execute([
        {
          contractAddress: STRK_TOKEN_ADDRESS,
          entrypoint: 'transfer',
          calldata: CallData.compile({
            recipient: IDENTITY_CONTRACT_ADDRESS,
            amount: { low: depLow, high: depHigh },
          }),
        },
        {
          contractAddress: IDENTITY_CONTRACT_ADDRESS,
          entrypoint: 'enable_privacy',
          calldata: CallData.compile({ enabled: true }),
        },
        {
          contractAddress: IDENTITY_CONTRACT_ADDRESS,
          entrypoint: 'deposit',
          calldata: CallData.compile({ amount: { low: depLow, high: depHigh } }),
        },
      ]);

      setStatusMsg(`Transaction broadcasted! Waiting for Sepolia block confirmation...`);
      setTxHash(tx.transaction_hash);

      await (provider as RpcProvider).waitForTransaction(tx.transaction_hash);
      const expectedTotal = currentShieldedWei + depositWei;
      setStatusMsg(`Successfully shielded +${shieldAmount} STRK into Escrow Pool! Total pool balance: ${(Number(expectedTotal) / 1e18).toFixed(2)} STRK`);
      await loadShieldedState();
    } catch (err: any) {
      console.error('Shield tx error:', err);
      setStatusMsg(`Transaction failed or rejected: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Unshield: Contract's withdraw() sends STRK back to caller and decrements shielded balance
  const handleUnshieldOnChain = async () => {
    if (!isConnected || !account) {
      setStatusMsg('Please connect your Starknet wallet first.');
      return;
    }

    const withdrawWei = BigInt(Math.floor(parseFloat(unshieldAmount || '1') * 1e18));
    if (withdrawWei > currentShieldedWei) {
      setStatusMsg('Cannot unshield more than current shielded balance.');
      return;
    }

    setIsProcessing(true);
    setStatusMsg('Processing ZK Unshield — withdrawing STRK from escrow pool...');
    setTxHash(null);

    try {
      const wLow = (withdrawWei & ((1n << 128n) - 1n)).toString();
      const wHigh = (withdrawWei >> 128n).toString();

      const tx = await account.execute([
        {
          contractAddress: IDENTITY_CONTRACT_ADDRESS,
          entrypoint: 'withdraw',
          calldata: CallData.compile({ amount: { low: wLow, high: wHigh } }),
        },
      ]);

      setStatusMsg(`Unshield transaction broadcasted! Waiting for confirmation...`);
      setTxHash(tx.transaction_hash);

      await (provider as RpcProvider).waitForTransaction(tx.transaction_hash);
      setStatusMsg(`Successfully unshielded ${unshieldAmount} STRK back to your public wallet.`);
      await loadShieldedState();
    } catch (err: any) {
      console.error('Unshield error:', err);
      setStatusMsg(`Transaction failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Private Send: Resolves .real domain then calls contract's private_send() to transfer STRK
  const handlePrivateSendOnChain = async () => {
    if (!isConnected || !account) {
      setStatusMsg('Please connect your Starknet wallet first.');
      return;
    }

    const sendWei = BigInt(Math.floor(parseFloat(sendAmount || '1') * 1e18));
    if (sendWei > currentShieldedWei) {
      setStatusMsg('Insufficient shielded balance. Shield more STRK first.');
      return;
    }

    setIsProcessing(true);
    setStatusMsg(`Resolving ${sendToDomain} on-chain...`);
    setTxHash(null);

    try {
      // Resolve the .real domain to an address via BNS contract
      const domainClean = sendToDomain.replace('.real', '');
      const domainFelt = shortString.encodeShortString(domainClean);

      const resolveResult = await provider.callContract({
        contractAddress: BNS_CONTRACT_ADDRESS,
        entrypoint: 'resolve_domain',
        calldata: [domainFelt],
      });

      const recipientAddress = resolveResult[0];
      if (!recipientAddress || recipientAddress === '0x0') {
        setStatusMsg(`Could not resolve ${sendToDomain} — domain not found on-chain.`);
        setIsProcessing(false);
        return;
      }

      setStatusMsg(`Resolved ${sendToDomain} → ${recipientAddress.slice(0, 10)}... Sending ${sendAmount} STRK...`);

      const sLow = (sendWei & ((1n << 128n) - 1n)).toString();
      const sHigh = (sendWei >> 128n).toString();

      const tx = await account.execute([
        {
          contractAddress: IDENTITY_CONTRACT_ADDRESS,
          entrypoint: 'private_send',
          calldata: CallData.compile({
            recipient: recipientAddress,
            amount: { low: sLow, high: sHigh },
          }),
        },
      ]);

      setStatusMsg(`Private payment transaction submitted!`);
      setTxHash(tx.transaction_hash);

      await (provider as RpcProvider).waitForTransaction(tx.transaction_hash);
      setStatusMsg(`Private payment of ${sendAmount} STRK sent to ${sendToDomain}!`);
      await loadShieldedState();
    } catch (err: any) {
      console.error('Send error:', err);
      setStatusMsg(`Transaction failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Shield className="w-4 h-4" />
          <span>STRK20 Zero-Knowledge Privacy Engine</span>
        </div>
        <h2 className="text-3xl font-bold font-display text-white">Private Wallet & Shielded Pool</h2>
        <p className="text-gray-400 text-sm max-w-xl mx-auto">
          Cumulative zero-knowledge balance inside your sovereign identity layer. Shield assets, withdraw, and send private payments directly to{' '}
          <span className="text-orange-400">.real</span> identities.
        </p>
      </div>

      {/* Main Card */}
      <div className="rounded-3xl bg-white/[0.02] border border-white/10 p-8 backdrop-blur-xl shadow-2xl space-y-6">
        {/* On-chain Shielded Balance Display */}
        <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
              Total On-Chain Shielded Pool Balance
            </span>
            <p className="text-3xl font-bold text-white font-mono mt-0.5">{shieldedOnChainBalance}</p>
          </div>
          <a
            href={`${voyagerScanBaseUrl}/contract/${IDENTITY_CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-gray-400 hover:text-emerald-400 flex items-center gap-1.5 transition-colors p-2 rounded-xl bg-white/5 border border-white/10"
          >
            <span>View Identity Pool Contract</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Tab Selection */}
        <div className="flex rounded-xl bg-white/5 p-1 border border-white/5 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('shield')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'shield'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Shield (Deposit)
          </button>
          <button
            onClick={() => setActiveTab('unshield')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'unshield'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Unshield (Withdraw)
          </button>
          <button
            onClick={() => setActiveTab('send')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'send'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Private Send
          </button>
        </div>

        {/* Tab 1: Shield (Deposit) */}
        {activeTab === 'shield' && (
          <div className="space-y-5 max-w-md mx-auto">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">Amount to Shield into Pool (STRK)</label>
              <div className="relative">
                <input
                  type="number"
                  value={shieldAmount}
                  onChange={(e) => setShieldAmount(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-orange-500/50"
                  placeholder="10"
                />
                <span className="absolute right-4 top-3.5 text-xs text-gray-400 font-bold">STRK</span>
              </div>
            </div>

            <button
              onClick={handleShieldOnChain}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-semibold transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>{isProcessing ? 'Confirming on Sepolia...' : 'Shield Assets to Pool (Cumulative TX)'}</span>
            </button>
          </div>
        )}

        {/* Tab 2: Unshield (Withdraw) */}
        {activeTab === 'unshield' && (
          <div className="space-y-5 max-w-md mx-auto">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">Amount to Unshield to Public Wallet (STRK)</label>
              <div className="relative">
                <input
                  type="number"
                  value={unshieldAmount}
                  onChange={(e) => setUnshieldAmount(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-orange-500/50"
                  placeholder="5"
                />
                <span className="absolute right-4 top-3.5 text-xs text-gray-400 font-bold">STRK</span>
              </div>
            </div>

            <button
              onClick={handleUnshieldOnChain}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              <span>{isProcessing ? 'Unshielding on Sepolia...' : 'Unshield Back to Wallet (Real TX)'}</span>
            </button>
          </div>
        )}

        {/* Tab 3: Private Send */}
        {activeTab === 'send' && (
          <div className="space-y-5 max-w-md mx-auto">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">Recipient Identity (.real)</label>
              <input
                type="text"
                value={sendToDomain}
                onChange={(e) => setSendToDomain(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500/50 font-mono"
                placeholder="alice.real"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">Amount (STRK)</label>
              <input
                type="number"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-orange-500/50"
                placeholder="5"
              />
            </div>

            <button
              onClick={handlePrivateSendOnChain}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{isProcessing ? 'Broadcasting Tx...' : 'Send Private Payment from Pool'}</span>
            </button>
          </div>
        )}

        {/* Notification Banner & Voyager Explorer Link */}
        {statusMsg && (
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs font-mono text-center space-y-2 animate-fade-in">
            <p>{statusMsg}</p>
            {txHash && (
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 hover:underline">
                <CheckCircle className="w-3.5 h-3.5" />
                <a
                  href={`${voyagerScanBaseUrl}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1"
                >
                  <span>View TX on Voyager Explorer ({txHash.slice(0, 10)}...{txHash.slice(-6)})</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivateWallet;
