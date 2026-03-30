import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from '@starknet-react/core';
import { useAuction } from '../src/hooks/useAuction';
import { useBns } from '../src/hooks/useBns';
import { shortString } from 'starknet';

type HistoryItem = {
    id: number;
    domain: string;
    status: 'Won' | 'Lost' | 'Bidding' | 'Sold';
    amount: number;
    date: string;
    isSeller?: boolean;
};

const StatusBadge: React.FC<{ status: HistoryItem['status'] }> = ({ status }) => {
    const baseClasses = "px-3 py-1 text-xs font-semibold rounded-full";
    const statusClasses = {
        'Won': 'bg-green-500/20 text-green-400',
        'Lost': 'bg-red-500/20 text-red-400',
        'Bidding': 'bg-cyan-500/20 text-cyan-400',
        'Sold': 'bg-blue-500/20 text-blue-400',
    };
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

const AuctionHistoryList: React.FC = () => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { address, isConnected } = useAccount();
    const { getAuctionDetails } = useAuction();
    const { getUserDomains } = useBns();

    const fetchAuctionHistory = useCallback(async () => {
        if (!isConnected || !address) {
            setHistory([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const historyItems: HistoryItem[] = [];
            let id = 1;

            const userDomains = await getUserDomains(address);
            
            for (const domainFelt of userDomains) {
                try {
                    let domainName = '';
                    try {
                        const asHex = '0x' + BigInt(domainFelt).toString(16);
                        domainName = shortString.decodeShortString(asHex) + '.real';
                    } catch {
                        continue;
                    }

                    const auctionDetails = await getAuctionDetails(domainName);
                    if (auctionDetails) {
                        const amount = Number(auctionDetails.highestBid) / 1e18;
                        const endTime = new Date(auctionDetails.endsAt * 1000);
                        const now = new Date();
                        
                        let status: HistoryItem['status'] = 'Bidding';
                        if (!auctionDetails.active) {
                            status = auctionDetails.highestBidder.toLowerCase() === address.toLowerCase() ? 'Won' : 'Sold';
                        } else if (now > endTime) {
                            status = 'Bidding';
                        }

                        historyItems.push({
                            id: id++,
                            domain: domainName,
                            status: status,
                            amount: amount,
                            date: auctionDetails.active ? 'Active' : endTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                            isSeller: auctionDetails.seller.toLowerCase() === address.toLowerCase(),
                        });
                    }
                } catch (e) {
                }
            }

            setHistory(historyItems);
        } catch (e) {
            console.error("Failed to fetch auction history:", e);
        } finally {
            setIsLoading(false);
        }
    }, [address, isConnected, getAuctionDetails, getUserDomains]);

    useEffect(() => {
        fetchAuctionHistory();
        const interval = setInterval(fetchAuctionHistory, 30000);
        return () => clearInterval(interval);
    }, [fetchAuctionHistory]);

    if (isLoading) {
        return <div className="text-center text-gray-400 py-8">Loading auction history...</div>;
    }

    if (history.length === 0) {
        return <div className="text-center text-gray-400 py-8">No auction history found</div>;
    }

    return (
        <div className="space-y-3 sm:space-y-4">
            {history.map(item => (
                <div key={item.id} className="bg-[#0D1117]/80 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 list-item-hover">
                    <div className="flex-grow min-w-0 w-full sm:w-auto">
                        <p className="text-base sm:text-lg font-bold text-white break-words">@{item.domain.replace('.real', '')}</p>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">{item.date}</p>
                        {item.isSeller && <p className="text-xs text-cyan-400 mt-1">You are the seller</p>}
                    </div>
                    <div className="flex-grow sm:text-center min-w-0">
                        <p className="font-semibold text-sm sm:text-base md:text-lg text-white break-words">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} STRK</p>
                        <p className="text-xs sm:text-sm text-gray-400">{item.status === 'Lost' || item.status === 'Sold' ? 'Final Bid' : item.status === 'Won' ? 'Winning Bid' : 'Current Bid'}</p>
                    </div>
                    <div className="w-full sm:w-auto sm:text-right">
                        <StatusBadge status={item.status} />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AuctionHistoryList;