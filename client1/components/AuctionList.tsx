import React, { useState, useEffect, useCallback } from 'react';
import AuctionItem from './AuctionItem';
import { useAuction } from '../src/hooks/useAuction';

export type Auction = {
    id: number;
    domain: string;
    currentBid: number;
    reserve: number;
    minIncrement: number;
    minNextBid: number;
    bids: number;
    endTime: Date;
    owner: string;
};

const AuctionList: React.FC = () => {
    const [auctions, setAuctions] = useState<Auction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { getAuctionDetails, fetchActiveAuctionDomains } = useAuction();

    const fetchAuctions = useCallback(async () => {
        setIsLoading(true);
        try {
            const activeDomains = await fetchActiveAuctionDomains();
            
            const activeAuctions: Auction[] = [];
            let id = 1;

            console.log("AuctionList: Fetching details for domains:", activeDomains);
            for (const domainName of activeDomains) {
                try {
                    console.log(`AuctionList: Fetching details for ${domainName}`);
                    const details = await getAuctionDetails(domainName);
                    console.log(`AuctionList: Details for ${domainName}:`, details);
                    
                    if (details && details.active) {
                        console.log(`AuctionList: Auction ${domainName} is active, adding to list`);
                        const currentBid = Number(details.highestBid) / 1e18;
                        const reserveBid = Number(details.reserve) / 1e18;
                        const minIncrementBid = Number(details.minIncrement) / 1e18;
                        
                        const minNextBid = details.highestBid === 0n 
                            ? reserveBid 
                            : currentBid + minIncrementBid;
                        
                        const endTime = new Date(details.endsAt * 1000);
                        
                        const sellerAddr = typeof details.seller === 'string' ? details.seller : `0x${BigInt(details.seller as any).toString(16)}`;
                        const shortSeller = sellerAddr.length > 20 
                            ? `${sellerAddr.slice(0, 6)}...${sellerAddr.slice(-4)}`
                            : sellerAddr;
                        
                        activeAuctions.push({
                            id: id++,
                            domain: domainName,
                            currentBid: currentBid > 0 ? currentBid : 0,
                            reserve: reserveBid,
                            minIncrement: minIncrementBid,
                            minNextBid: minNextBid,
                            bids: details.highestBid > 0n ? 1 : 0,
                            endTime: endTime,
                            owner: shortSeller,
                        });
                        console.log(`AuctionList: Added auction for ${domainName}`);
                    } else {
                        console.log(`AuctionList: Auction ${domainName} is not active or details are null`, details);
                    }
                } catch (e) {
                    console.error(`Failed to fetch details for ${domainName}:`, e);
                }
            }
            
            console.log("AuctionList: Final activeAuctions array:", activeAuctions);

            setAuctions(activeAuctions);
        } catch (e) {
            console.error("Failed to fetch auctions:", e);
        } finally {
            setIsLoading(false);
        }
    }, [getAuctionDetails, fetchActiveAuctionDomains]);

    useEffect(() => {
        fetchAuctions();
        const interval = setInterval(fetchAuctions, 30000);
        return () => clearInterval(interval);
    }, [fetchAuctions]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-center sm:text-left text-white w-full sm:w-auto">Active Auctions</h2>
                <button
                    onClick={fetchAuctions}
                    disabled={isLoading}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-gray-700 text-xs sm:text-sm text-gray-200 hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5 sm:gap-2 btn-hover-effect"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-3 h-3 sm:w-4 sm:h-4 ${isLoading ? 'animate-spin' : ''}`}>
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10" />
                        <path d="M20.49 15a9 9 0 0 1-14.13 3.36L1 14" />
                    </svg>
                    Refresh
                </button>
            </div>
            {isLoading ? (
                <div className="text-center text-gray-400 py-6 sm:py-8 text-sm sm:text-base">Loading auctions...</div>
            ) : auctions.length === 0 ? (
                <div className="text-center text-gray-400 py-6 sm:py-8 text-sm sm:text-base">No active auctions</div>
            ) : (
                <div className="space-y-3 sm:space-y-4">
                    {auctions.map(auction => (
                        <AuctionItem key={auction.id} auction={auction} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AuctionList;