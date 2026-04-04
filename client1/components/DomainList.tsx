import React, { useEffect, useState, useCallback } from 'react';
import RenewalModal from './RenewalModal';
import ManageDomainModal from './ManageDomainModal';
import StartAuctionModal from './StartAuctionModal';
import { useAccount } from '@starknet-react/core';
import { useBns } from '../src/hooks/useBns';
import { useAuction } from '../src/hooks/useAuction';
import { shortString } from 'starknet';

export type OwnedDomain = {
    id: number;
    name: string;
    expires: string;
    creationDate: string;
    registrar: string;
    metadata: { [key: string]: string };
    feltStr?: string;
    isGracePeriod?: boolean;
    gracePeriodEnds?: number;
    isVerified?: boolean;
};

const VerifiedIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className || "w-4 h-4 text-blue-400"}>
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" fillOpacity="0.2"/>
        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const mockDomains: OwnedDomain[] = [];

const DomainIcon1: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className || "w-6 h-6 text-cyan-400"}>
        <path d="M9 20V14H15V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 4V10H15V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 10V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 9H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15 9H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 15H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15 15H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const DomainIcon2: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className || "w-6 h-6 text-cyan-400"}>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12 2V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 19V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M5 12H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M22 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M18.364 5.63604L16.2427 7.75736" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M7.75736 16.2427L5.63604 18.364" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
);

const DomainIcon3: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className || "w-6 h-6 text-cyan-400"}>
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const domainIcons = [DomainIcon1, DomainIcon2, DomainIcon3];

const ReloadIcon: React.FC<{ className?: string }>= ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className || "w-5 h-5"}>
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10" />
        <path d="M20.49 15a9 9 0 0 1-14.13 3.36L1 14" />
    </svg>
);

const DomainList: React.FC = () => {
    const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
    const [domainToRenew, setDomainToRenew] = useState<OwnedDomain | null>(null);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [domainToManage, setDomainToManage] = useState<OwnedDomain | null>(null);
    const [isStartAuctionModalOpen, setIsStartAuctionModalOpen] = useState(false);
    const [domainToAuction, setDomainToAuction] = useState<string>('');
    const [domains, setDomains] = useState<OwnedDomain[]>(mockDomains);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [auctionedDomains, setAuctionedDomains] = useState<Set<string>>(new Set());
    const [auctionHasBids, setAuctionHasBids] = useState<Set<string>>(new Set());
    const [cancellingDomain, setCancellingDomain] = useState<string | null>(null);
    const { address, isConnected } = useAccount();
    const { getUserDomains, getDomainInfo } = useBns();
    const { fetchActiveAuctionDomains, cancelAuction, getAuctionDetails } = useAuction();

    const fetchDomains = useCallback(async () => {
        if (!isConnected || !address) { setDomains([]); return; }
        setIsRefreshing(true);
        try {
            const list = await getUserDomains(address);
            const filteredList = list.filter((feltStr: string) => {
                if (!feltStr) return false;
                try {
                    const bigIntValue = BigInt(feltStr);
                    return bigIntValue !== BigInt(0);
                } catch {
                    return false;
                }
            });
            
            const ownedResults = await Promise.all(filteredList.map(async (feltStr: string, idx: number) => {
                let label = '';
                try {
                    const asHex = '0x' + BigInt(feltStr).toString(16);
                    label = shortString.decodeShortString(asHex);
                } catch {
                    label = feltStr;
                }

                let expiresDisplay = '-';
                let isValidDomain = true;
                let isGracePeriod = false;
                let gracePeriodEnds: number | undefined = undefined;
                let isVerified = false;

                try {
                    const info = await getDomainInfo(label);
                    if (info && info.expiryDate !== undefined && info.expiryDate > 0) {
                        const timestamp = Number(info.expiryDate);
                        if (timestamp > 0 && !isNaN(timestamp)) {
                            const date = new Date(timestamp * 1000);
                            if (!isNaN(date.getTime()) && date.getTime() > 0) {
                                expiresDisplay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            }
                        }
                        isGracePeriod = !!info.isGracePeriod;
                        gracePeriodEnds = info.gracePeriodEnds;
                        isVerified = !!info.isVerified;
                    } else {
                        isValidDomain = false;
                    }
                } catch (e) {
                    console.error(`Error fetching expiry for domain ${label}:`, e);
                    isValidDomain = false;
                }
                
                if (!isValidDomain) {
                    return null;
                }

                const isAuctioned = auctionedDomains.has(label.toLowerCase());

                return {
                    id: idx + 1,
                    name: `${label}.real`,
                    expires: expiresDisplay,
                    creationDate: '-',
                    registrar: isAuctioned ? 'Auction' : '-',
                    metadata: {},
                    feltStr: feltStr,
                    isGracePeriod,
                    gracePeriodEnds,
                    isVerified
                } as OwnedDomain & { feltStr: string };

            }));
            
            const owned = ownedResults.filter((domain): domain is OwnedDomain & { feltStr: string } => domain !== null);
            setDomains(owned);
        } catch (e) {
            console.error('Error fetching domains:', e);
            setDomains([]);
        } finally {
            setIsRefreshing(false);
        }
    }, [address, isConnected, getUserDomains, getDomainInfo]);

    useEffect(() => {
        fetchDomains();
    }, [fetchDomains]);

    // Fetch which of user's domains are in auction, and whether any have bids (to disable Cancel)
    useEffect(() => {
        if (!domains.length) return;
        fetchActiveAuctionDomains().then(async (activeDomains) => {
            const nameSet = new Set(activeDomains.map(d => d.toLowerCase()));
            setAuctionedDomains(nameSet);
            const bidChecks = await Promise.all(
                activeDomains.map(async (d) => {
                    try {
                        const details = await getAuctionDetails(d);
                        return { name: d.toLowerCase(), hasBids: details ? details.highestBid > BigInt(0) : false };
                    } catch { return { name: d.toLowerCase(), hasBids: false }; }
                })
            );
            setAuctionHasBids(new Set(bidChecks.filter(b => b.hasBids).map(b => b.name)));
        }).catch(() => {});
    }, [domains, fetchActiveAuctionDomains, getAuctionDetails]);

    const handleRenewClick = (domain: OwnedDomain) => {
        setDomainToRenew(domain);
        setIsRenewalModalOpen(true);
    };

    const handleCloseRenewalModal = () => {
        setIsRenewalModalOpen(false);
        setDomainToRenew(null);
    };

    const handleManageClick = (domain: OwnedDomain) => {
        setDomainToManage(domain);
        setIsManageModalOpen(true);
    };

    const handleCloseManageModal = () => {
        setIsManageModalOpen(false);
        setDomainToManage(null);
    };

    const handleStartAuctionClick = (domain: OwnedDomain) => {
        setDomainToAuction(domain.name);
        setIsStartAuctionModalOpen(true);
    };

    const handleCancelAuctionClick = async (domain: OwnedDomain) => {
        setCancellingDomain(domain.name);
        try {
            await cancelAuction(domain.name);
            // Refresh auction status after cancel
            const activeDomains = await fetchActiveAuctionDomains();
            setAuctionedDomains(new Set(activeDomains.map(d => d.toLowerCase())));
        } catch (_) {
            // toast already shown by hook
        } finally {
            setCancellingDomain(null);
        }
    };

    const handleCloseStartAuctionModal = () => {
        setIsStartAuctionModalOpen(false);
        setDomainToAuction('');
    };

    return (
        <>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="text-xs sm:text-sm text-gray-400">{domains.length} domain{domains.length === 1 ? '' : 's'}</div>
                <button
                    onClick={fetchDomains}
                    disabled={isRefreshing}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-gray-700 text-xs sm:text-sm text-gray-200 hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5 sm:gap-2 btn-hover-effect"
                    aria-label="Reload domains"
                    title="Reload domains"
                >
                    <ReloadIcon className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Reload</span>
                </button>
            </div>
            <div className="space-y-3 sm:space-y-4">
                {domains.map((domain, index) => {
                    const Icon = domainIcons[index % domainIcons.length];
                    return (
                        <div key={domain.id} className="bg-[#0D1117]/80 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 list-item-hover">
                            <div className="flex-grow flex items-center gap-3 sm:gap-4 min-w-0 w-full sm:w-auto">
                                <div className="bg-black/20 p-2 sm:p-3 rounded-full border border-gray-700 flex-shrink-0">
                                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-base sm:text-lg font-bold text-white break-words">@{domain.name.replace('.real', '')}</p>
                                        {domain.isVerified && <VerifiedIcon />}
                                        {domain.isGracePeriod && (
                                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase border border-amber-500/30">Grace Period</span>
                                        )}
                                    </div>
                                    <p className={`text-xs sm:text-sm mt-1 ${domain.isGracePeriod ? 'text-amber-400 font-semibold' : 'text-gray-400'}`}>
                                        {domain.isGracePeriod ? 'Expired: ' : 'Expires: '}{domain.expires}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center flex-wrap gap-2 justify-start sm:justify-end w-full sm:w-auto">
                                <button onClick={() => handleManageClick(domain)} className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-700/80 text-white font-semibold rounded-full hover:bg-gray-700 btn-hover-effect">Manage</button>
                                <button onClick={() => handleRenewClick(domain)} className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-[#00c6ff] text-white font-semibold rounded-full hover:bg-[#00c6ff]/20 btn-hover-effect">Renew</button>
                                {auctionedDomains.has(domain.name.toLowerCase()) ? (
                                    auctionHasBids.has(domain.name.toLowerCase()) ? (
                                        <span
                                            title="Cannot cancel: bids have been placed"
                                            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-800 text-gray-500 font-semibold rounded-full border border-gray-700 cursor-not-allowed whitespace-nowrap select-none"
                                        >
                                            🔒 Has Bids
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handleCancelAuctionClick(domain)}
                                            disabled={cancellingDomain === domain.name}
                                            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-red-600/80 text-white font-bold rounded-full hover:bg-red-600 btn-hover-effect whitespace-nowrap disabled:opacity-50"
                                        >
                                            {cancellingDomain === domain.name ? 'Cancelling...' : 'Cancel Auction'}
                                        </button>
                                    )
                                ) : (
                                    <button onClick={() => handleStartAuctionClick(domain)} className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-[#00f2a1] to-[#00c6ff] text-black font-bold rounded-full hover:opacity-90 btn-hover-effect whitespace-nowrap">List for Auction</button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {isRenewalModalOpen && domainToRenew && (
                <RenewalModal 
                    domainName={domainToRenew.name} 
                    currentExpiry={domainToRenew.expires}
                    onClose={handleCloseRenewalModal} 
                />
            )}

            {isManageModalOpen && domainToManage && (
                <ManageDomainModal 
                    domain={domainToManage} 
                    onClose={handleCloseManageModal} 
                />
            )}

            {isStartAuctionModalOpen && domainToAuction && (
                <StartAuctionModal 
                    domainName={domainToAuction} 
                    onClose={handleCloseStartAuctionModal} 
                />
            )}
        </>
    );
};

export default DomainList;