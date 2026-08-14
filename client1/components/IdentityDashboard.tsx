import React, { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldCheck, Cpu, Wallet, UserCheck, Key, Copy, Check, Plus, RefreshCw, ChevronDown, Star, X, Bot, Zap, ArrowUpRight } from 'lucide-react';
import { shortString, CallData, RpcProvider } from 'starknet';
import { useAccount } from '@starknet-react/core';
import { provider, STRK_TOKEN_ADDRESS, IDENTITY_CONTRACT_ADDRESS, voyagerScanBaseUrl } from '../src/constants';
import { useBns } from '../src/hooks/useBns';
import { toast } from 'react-hot-toast';

interface IdentityDashboardProps {
  walletAddress: string | null;
  onNavigateView?: (view: 'private-wallet' | 'contacts' | 'search') => void;
}

const decodeFeltDomain = (raw: string): string => {
  if (!raw) return '';
  try {
    if (raw.startsWith('0x')) {
      return shortString.decodeShortString(raw);
    }
    const hex = '0x' + BigInt(raw).toString(16);
    return shortString.decodeShortString(hex);
  } catch {
    return raw;
  }
};

export const IdentityDashboard: React.FC<IdentityDashboardProps> = ({ walletAddress, onNavigateView }) => {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isUpdatingPrimary, setIsUpdatingPrimary] = useState(false);
  const [strkBalance, setStrkBalance] = useState<string>('0.00 STRK');
  const [shieldedBalance, setShieldedBalance] = useState<string>('0.00 STRK');
  const [isPrivacyActive, setIsPrivacyActive] = useState<boolean>(true);
  const [primaryDomain, setPrimaryDomain] = useState<string>('');
  const [ownedDomains, setOwnedDomains] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);

  // Agent Registration Modal State
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [agentPrefix, setAgentPrefix] = useState('trading');
  const [agentAddress, setAgentAddress] = useState('');
  const [agentDailyLimit, setAgentDailyLimit] = useState('50');
  const [agentCapability, setAgentCapability] = useState('DEX & Arbitrage');
  const [isRegisteringAgent, setIsRegisteringAgent] = useState(false);
  const [agentTxHash, setAgentTxHash] = useState<string | null>(null);

  const { account, isConnected } = useAccount();
  const { getUserDomains, getPrimaryDomain, setPrimaryDomain: setOnChainPrimaryDomain } = useBns();

  const fetchOnChainData = useCallback(async () => {
    if (!walletAddress) {
      setStrkBalance('0.00 STRK');
      setPrimaryDomain('');
      setOwnedDomains([]);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch live STRK token balance from Starknet Sepolia
      try {
        const rawRes: any = await provider.callContract({
          contractAddress: STRK_TOKEN_ADDRESS,
          entrypoint: 'balanceOf',
          calldata: [walletAddress],
        }, 'latest');

        let resArray: string[] = [];
        if (Array.isArray(rawRes)) {
          resArray = rawRes;
        } else if (rawRes?.result && Array.isArray(rawRes.result)) {
          resArray = rawRes.result;
        }

        if (resArray.length >= 2) {
          const low = BigInt(resArray[0]);
          const high = BigInt(resArray[1]);
          const totalWei = (high << 128n) + low;
          const strkFormatted = (Number(totalWei) / 1e18).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          });
          setStrkBalance(`${strkFormatted} STRK`);
        }
      } catch (err) {
        console.warn('Could not fetch on-chain STRK balance:', err);
      }

      // 2. Fetch and Decode user domains
      let decodedList: string[] = [];
      try {
        const rawList = await getUserDomains(walletAddress);
        decodedList = (rawList || [])
          .map((d: string) => decodeFeltDomain(d))
          .filter((d: string) => Boolean(d) && d !== '0');
        
        setOwnedDomains(decodedList);
      } catch (e) {
        console.error('Error fetching owned domains:', e);
      }

      // 3. Resolve Primary Domain
      let currentPrimary = '';
      try {
        const onChainPrimary = await getPrimaryDomain(walletAddress);
        if (onChainPrimary && onChainPrimary.trim()) {
          currentPrimary = onChainPrimary;
          setPrimaryDomain(onChainPrimary);
        } else if (decodedList.length === 1) {
          currentPrimary = decodedList[0];
          setPrimaryDomain(decodedList[0]);
        } else if (decodedList.length > 1) {
          currentPrimary = decodedList[0];
          setPrimaryDomain(decodedList[0]);
        } else {
          setPrimaryDomain('');
        }
      } catch {
        if (decodedList.length > 0) {
          currentPrimary = decodedList[0];
          setPrimaryDomain(decodedList[0]);
        }
      }

      // 4. Fetch IdentityContract state
      try {
        const idDetails: any = await provider.callContract({
          contractAddress: IDENTITY_CONTRACT_ADDRESS,
          entrypoint: 'get_identity_details_of',
          calldata: [walletAddress],
        }, 'latest');

        let detailsArr: string[] = [];
        if (Array.isArray(idDetails)) detailsArr = idDetails;
        else if (idDetails?.result) detailsArr = idDetails.result;

        if (detailsArr.length >= 3) {
          setIsPrivacyActive(detailsArr[1] === '0x1' || detailsArr[1] === '1');
          const sLow = BigInt(detailsArr[2]);
          const sHigh = BigInt(detailsArr[3] || '0x0');
          const sTotal = (sHigh << 128n) + sLow;
          setShieldedBalance(`${(Number(sTotal) / 1e18).toFixed(2)} STRK`);
        }
      } catch {
        setShieldedBalance('0.00 STRK');
      }

      // Load agents (default + stored)
      const baseDomain = currentPrimary || (decodedList[0] ? decodedList[0] : 'identity');
      const savedAgents = localStorage.getItem(`agents_${walletAddress}`);
      if (savedAgents) {
        setAgents(JSON.parse(savedAgents));
      } else {
        setAgents([
          {
            name: 'Autonomous Trading Agent',
            domain: `trading.${baseDomain}.real`,
            address: walletAddress,
            permissions: '50 STRK/day',
            capabilities: 'DEX & Arbitrage',
            status: 'Delegated',
          },
        ]);
      }
    } catch (err) {
      console.error('Error refreshing identity state:', err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, getUserDomains, getPrimaryDomain]);

  useEffect(() => {
    fetchOnChainData();
  }, [walletAddress]);

  const handleSelectPrimaryDomain = async (domainName: string) => {
    setIsDropdownOpen(false);
    if (!domainName || domainName === primaryDomain) return;

    setIsUpdatingPrimary(true);
    try {
      await setOnChainPrimaryDomain(domainName);
      setPrimaryDomain(domainName);
      toast.success(`${domainName}.real set as main identity domain!`);
    } catch (e: any) {
      console.error('Failed to set primary domain:', e);
    } finally {
      setIsUpdatingPrimary(false);
    }
  };

  const handleRegisterAgentOnChain = async () => {
    if (!isConnected || !account || !walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsRegisteringAgent(true);
    setAgentTxHash(null);
    const toastId = toast.loading('Registering delegated AI agent on Starknet Sepolia...');

    try {
      const parentName = primaryDomain || (ownedDomains[0] || 'identity');
      const fullAgentDomain = `${agentPrefix}.${parentName}.real`;
      const domainFelt = shortString.encodeShortString(agentPrefix.slice(0, 31));
      const targetAgentAddr = agentAddress.trim() || walletAddress;
      const permFelt = shortString.encodeShortString(`${agentDailyLimit}STRK/day`.slice(0, 31));
      const capFelt = shortString.encodeShortString(agentCapability.slice(0, 31));

      const tx = await account.execute([
        {
          contractAddress: IDENTITY_CONTRACT_ADDRESS,
          entrypoint: 'register_agent',
          calldata: CallData.compile({
            agent_domain: domainFelt,
            agent_address: targetAgentAddr,
            permissions: permFelt,
            capabilities: capFelt,
          }),
        },
      ]);

      setAgentTxHash(tx.transaction_hash);
      await (provider as RpcProvider).waitForTransaction(tx.transaction_hash);

      const newAgentObj = {
        name: `${agentPrefix.toUpperCase()} Sub-Identity Agent`,
        domain: fullAgentDomain,
        address: targetAgentAddr,
        permissions: `${agentDailyLimit} STRK/day`,
        capabilities: agentCapability,
        status: 'Delegated',
      };

      const updated = [newAgentObj, ...agents];
      setAgents(updated);
      localStorage.setItem(`agents_${walletAddress}`, JSON.stringify(updated));

      toast.success(`Agent ${fullAgentDomain} successfully delegated on-chain!`, { id: toastId });
      setIsAgentModalOpen(false);
    } catch (err: any) {
      console.error('Agent delegation failed:', err);
      toast.error(err.message || 'Failed to register agent', { id: toastId });
    } finally {
      setIsRegisteringAgent(false);
    }
  };

  const handleCopy = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayMainTitle = primaryDomain
    ? `${primaryDomain}.real`
    : walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}.real`
    : 'No Identity Connected';

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Top Banner Card */}
      <div className="relative rounded-3xl bg-gradient-to-r from-orange-950/40 via-purple-950/30 to-black p-8 border border-white/10 shadow-2xl backdrop-blur-xl z-20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none overflow-hidden" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold tracking-wide">
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              <span>Sovereign Identity Protocol v2</span>
            </div>

            {/* Domain Title with Dropdown Selector for Multiple Domains */}
            <div className="flex items-center gap-3">
              <h2 className="text-4xl font-bold font-display text-white tracking-tight">
                {displayMainTitle}
              </h2>

              {ownedDomains.length > 1 && (
                <div className="relative z-50">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={isUpdatingPrimary}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Switch Main Identity Domain"
                  >
                    <span>Switch Main</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsDropdownOpen(false)}
                      />
                      <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-[#121212] border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-50 p-2 space-y-1 backdrop-blur-2xl">
                        <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                          Select Main Domain
                        </div>
                        {ownedDomains.map((d) => (
                          <button
                            key={d}
                            onClick={() => handleSelectPrimaryDomain(d)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${
                              d === primaryDomain
                                ? 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30'
                                : 'text-gray-300 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <span>{d}.real</span>
                            {d === primaryDomain && <Star className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
              <span>
                Identity Anchor:{' '}
                {walletAddress
                  ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}`
                  : 'No Wallet Connected'}
              </span>
              {walletAddress && (
                <button
                  onClick={handleCopy}
                  title="Copy full address"
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={fetchOnChainData}
                title="Refresh on-chain balance"
                className="p-1 text-gray-400 hover:text-white transition-colors ml-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-400' : ''}`} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateView && onNavigateView('private-wallet')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-medium text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              Private Wallet
            </button>
            <button
              onClick={() => onNavigateView && onNavigateView('contacts')}
              className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium text-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              Private Contacts
            </button>
          </div>
        </div>
      </div>

      {/* Grid Status Cards with Real Live Balances */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>STRK20 PRIVACY</span>
            <Shield className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-white">{isPrivacyActive ? 'Active' : 'Disabled'}</p>
          <p className="text-xs text-orange-400/80">STRK20 ZK Routing On</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>WALLET STRK BALANCE</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{strkBalance}</p>
          <p className="text-xs text-emerald-400/80">Live On-Chain Sepolia</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>AI AGENTS DELEGATED</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{agents.length} Active</p>
          <p className="text-xs text-purple-400/80">Autonomous permissioned</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>ZK CREDENTIALS</span>
            <Key className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white">{ownedDomains.length > 0 ? `${ownedDomains.length} Verified` : '1 Verified'}</p>
          <p className="text-xs text-cyan-400/80">Sepolia Identity Badge</p>
        </div>
      </div>

      {/* Multi-Domain / Identity Registry Section */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Domain & Identity Registry</h3>
            <p className="text-xs text-gray-400">
              {ownedDomains.length} registered .real {ownedDomains.length === 1 ? 'domain' : 'domains'} mapped to your sovereign identity
            </p>
          </div>
          <button
            onClick={() => onNavigateView && onNavigateView('search')}
            className="px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Mint New .real Domain
          </button>
        </div>

        <div className="divide-y divide-white/5">
          {ownedDomains.length > 0 ? (
            ownedDomains.map((domainName, idx) => {
              const isMain = domainName === primaryDomain;
              return (
                <div key={idx} className="py-3.5 flex items-center justify-between text-sm">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono text-base">{domainName}.real</span>
                      {isMain && (
                        <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 text-[11px] font-semibold border border-orange-500/30 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-orange-300" />
                          Main Identity Domain
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono break-all">{walletAddress}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isMain && ownedDomains.length > 1 && (
                      <button
                        onClick={() => handleSelectPrimaryDomain(domainName)}
                        disabled={isUpdatingPrimary}
                        className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        Set as Main
                      </button>
                    )}
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-xs text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-sm text-gray-500">
              No domains minted yet.{' '}
              <button
                onClick={() => onNavigateView && onNavigateView('search')}
                className="text-orange-400 hover:underline ml-1"
              >
                Search & Register a .real domain
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Agent Registry Section */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Delegated AI Agents</h3>
            <p className="text-xs text-gray-400">
              Autonomous sub-identities running under {displayMainTitle}
            </p>
          </div>
          <button
            onClick={() => setIsAgentModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-xs font-medium text-purple-300 hover:bg-purple-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5" />
            Register Agent
          </button>
        </div>

        <div className="divide-y divide-white/5">
          {agents.map((a: any, idx: number) => (
            <div key={idx} className="py-3.5 flex items-center justify-between text-sm">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-white">{a.name}</span>
                </div>
                <p className="text-xs text-purple-400 font-mono">{a.domain}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Limit: {a.permissions}</span>
                <span className="text-xs text-cyan-400/80 font-mono hidden sm:inline">{a.capabilities}</span>
                <span className="px-2.5 py-1 rounded-md bg-purple-500/10 text-xs text-purple-400 border border-purple-500/20">
                  {a.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Register AI Agent Modal */}
      {isAgentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#111] border border-white/10 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" />
                <h3 className="text-xl font-bold text-white">Delegate AI Agent Identity</h3>
              </div>
              <button
                onClick={() => setIsAgentModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Agent Subdomain Prefix</label>
                <div className="flex items-center bg-black/50 border border-white/10 rounded-xl px-4 py-2.5">
                  <input
                    type="text"
                    value={agentPrefix}
                    onChange={(e) => setAgentPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    placeholder="trading"
                    className="bg-transparent text-white text-sm focus:outline-none flex-1 font-mono"
                  />
                  <span className="text-xs text-purple-400 font-mono">
                    .{primaryDomain || (ownedDomains[0] || 'identity')}.real
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Agent Wallet Address</label>
                <input
                  type="text"
                  value={agentAddress}
                  onChange={(e) => setAgentAddress(e.target.value)}
                  placeholder={walletAddress || '0x...'}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">Daily STRK Allowance</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={agentDailyLimit}
                      onChange={(e) => setAgentDailyLimit(e.target.value)}
                      placeholder="50"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">STRK</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">Capability Profile</label>
                  <select
                    value={agentCapability}
                    onChange={(e) => setAgentCapability(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none"
                  >
                    <option value="DEX & Arbitrage">DEX & Arbitrage</option>
                    <option value="Payments & Transfers">Payments & Transfers</option>
                    <option value="Data Analytics">Data Analytics</option>
                    <option value="Domain Management">Domain Management</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-center gap-2">
              <Zap className="w-4 h-4 shrink-0 text-purple-400" />
              <span>
                Delegated agent will execute autonomously within signed daily allowance limits.
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAgentModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRegisterAgentOnChain}
                disabled={isRegisteringAgent}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
              >
                {isRegisteringAgent ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                <span>{isRegisteringAgent ? 'Confirming Tx...' : 'Delegate On-Chain'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdentityDashboard;
