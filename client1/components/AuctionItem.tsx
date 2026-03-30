import React, { useState, useEffect } from 'react';
import type { Auction } from './AuctionList';
import BiddingModal from './BiddingModal';

interface AuctionItemProps {
    auction: Auction;
}

const AuctionItem: React.FC<AuctionItemProps> = ({ auction }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isEndingSoon, setIsEndingSoon] = useState(false);
    const [isBiddingModalOpen, setIsBiddingModalOpen] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +auction.endTime - +new Date();
            let timeLeftString = "Auction Ended";

            if (difference > 0 && difference < 3600000) {
                setIsEndingSoon(true);
            } else {
                setIsEndingSoon(false);
            }

            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                
                if (days > 0) {
                    timeLeftString = `${days}d ${hours}h ${minutes}m`;
                } else {
                    timeLeftString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            }
            return timeLeftString;
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        setTimeLeft(calculateTimeLeft());

        return () => clearInterval(timer);
    }, [auction.endTime]);
    
    const timeIsUp = +auction.endTime - +new Date() < 0;

    const minNextBid = auction.minNextBid;

    return (
        <>
            <div className="bg-[#0D1117]/80 p-3 sm:p-4 rounded-xl flex flex-col gap-3 sm:gap-4 list-item-hover">
                <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-3 sm:gap-4">
                    <div className="sm:col-span-1">
                        <p className="text-base sm:text-lg font-bold text-white break-words">@{auction.domain.replace('.real', '')}</p>
                        <p className="text-xs text-gray-400 mt-1 font-mono break-words">Owner: {auction.owner}</p>
                    </div>
                    
                    <div className="sm:col-span-1 text-left sm:text-center">
                        <p className="font-semibold text-sm sm:text-base md:text-lg text-white break-words">
                            {auction.currentBid > 0 
                                ? auction.currentBid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' STRK'
                                : 'No bids yet'
                            }
                        </p>
                        <p className="text-xs sm:text-sm text-gray-400">Current Bid ({auction.bids} bids)</p>
                        {auction.currentBid === 0 && (
                            <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Reserve: {auction.reserve.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} STRK</p>
                        )}
                        <p className="text-[10px] sm:text-xs text-cyan-400 mt-1">Min Bid: {minNextBid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} STRK</p>
                    </div>
                    
                    <div className="sm:col-span-1 text-left sm:text-center">
                        <p className={`font-semibold text-sm sm:text-base md:text-lg font-mono break-words ${isEndingSoon && !timeIsUp ? 'animate-pulse-warning' : 'text-white'}`}>
                            {timeLeft}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-400">Time Left</p>
                    </div>

                     <div className="sm:col-span-1 flex justify-start sm:justify-end">
                        <button 
                            onClick={() => setIsBiddingModalOpen(true)}
                            disabled={timeIsUp}
                            className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base bg-gradient-to-r from-[#00f2a1] to-[#00c6ff] text-black font-bold rounded-full hover:opacity-90 transition-opacity btn-hover-effect disabled:opacity-50 disabled:cursor-not-allowed">
                            Place Bid
                        </button>
                    </div>
                </div>
            </div>
            {isBiddingModalOpen && <BiddingModal auction={auction} timeLeft={timeLeft} onClose={() => setIsBiddingModalOpen(false)} />}
        </>
    );
};

export default AuctionItem;