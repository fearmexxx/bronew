import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuction } from '../src/hooks/useAuction';
import { useAccount } from '../src/starknet/StarknetProvider';
import type { Auction } from './AuctionList';

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

interface BiddingModalProps {
    auction: Auction;
    timeLeft: string;
    onClose: () => void;
}

const BiddingModal: React.FC<BiddingModalProps> = ({ auction, timeLeft, onClose }) => {
    const minBid = auction.minNextBid;
    const [bidAmount, setBidAmount] = useState<number | ''>(minBid);
    const [error, setError] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { placeBid } = useAuction();
    const { isConnected } = useAccount();

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const handleBidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setError('');
        setBidAmount(value === '' ? '' : parseFloat(value));
    };

    const handlePlaceBidClick = () => {
        if (bidAmount === '' || bidAmount < minBid) {
            const currentDisplay = auction.currentBid > 0 
                ? auction.currentBid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : 'the reserve price';
            setError(`Your bid must be at least ${minBid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} STRK (minimum next bid).`);
            return;
        }
        setError('');
        setShowConfirmation(true);
    };

    const handleConfirmBid = async () => {
        if (!isConnected || bidAmount === '' || bidAmount < minBid) return;
        setIsSubmitting(true);
        try {
            const bidAmountStr = bidAmount.toFixed(18);
            const [whole, decimal = ''] = bidAmountStr.split('.');
            const decimalPadded = decimal.padEnd(18, '0').slice(0, 18);
            const amountWei = BigInt(whole) * BigInt(10) ** BigInt(18) + BigInt(decimalPadded);
            
            await placeBid(auction.domain, amountWei.toString());
            setShowConfirmation(false);
            handleClose();
        } catch (e: any) {
            setError(e?.message || 'Bid failed');
        } finally {
            setIsSubmitting(false);
        }
    };


    const modalContent = (
        <div 
            className={`fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 ${isClosing ? 'animate-fade-out-backdrop' : 'animate-fade-in-backdrop'}`} 
            onClick={handleClose}
        >
            <div 
                className={`relative w-full max-w-md bg-[#161B22] shadow-2xl p-4 sm:p-6 flex flex-col text-white rounded-xl sm:rounded-2xl max-h-[90vh] overflow-y-auto ${isClosing ? 'animate-fade-out-scale-down' : 'animate-fade-in-scale-up'}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Place a Bid</h2>
                    <button onClick={handleClose} className="p-1 rounded-full hover:bg-white/10">
                        <CloseIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                </div>

                <div className="bg-[#0D1117] p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 text-center">
                    <p className="text-lg sm:text-xl md:text-2xl font-semibold break-words">@{auction.domain.replace('.real', '')}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4 text-center mb-4 sm:mb-6">
                    <div>
                        <p className="text-xs sm:text-sm text-gray-400">Current Bid</p>
                        <p className="text-sm sm:text-base md:text-lg font-bold text-white break-words">
                            {auction.currentBid > 0 
                                ? auction.currentBid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' STRK'
                                : 'No bids yet'
                            }
                        </p>
                        {auction.currentBid === 0 && (
                            <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Reserve: {auction.reserve.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} STRK</p>
                        )}
                    </div>
                     <div>
                        <p className="text-xs sm:text-sm text-gray-400">Time Left</p>
                        <p className="text-sm sm:text-base md:text-lg font-bold text-cyan-400 font-mono break-words">{timeLeft}</p>
                    </div>
                </div>

                <div>
                    <label htmlFor="bidAmount" className="block text-base sm:text-lg font-semibold mb-2">Your Bid</label>
                    <div className="relative">
                        <input
                            id="bidAmount"
                            type="number"
                            value={bidAmount}
                            onChange={handleBidChange}
                            placeholder={`Min: ${minBid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            min={minBid}
                            step="0.01"
                            className={`w-full bg-[#0D1117] border-2 ${error ? 'border-red-500' : 'border-gray-700'} focus:border-[#00c6ff] focus:ring-0 rounded-lg text-white text-sm sm:text-base md:text-lg p-2.5 sm:p-3 pr-20 sm:pr-24 transition-colors focus:shadow-[0_0_10px_rgba(0,198,255,0.4)]`}
                        />
                        <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm sm:text-base">STRK</span>
                    </div>
                    {error && <p className="text-red-400 text-xs sm:text-sm mt-2 break-words">{error}</p>}
                </div>

                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
                    <button onClick={handleClose} className="w-full py-2.5 sm:py-3 rounded-lg bg-gray-700/80 hover:bg-gray-700 font-bold transition-colors btn-hover-effect text-sm sm:text-base">
                        Cancel
                    </button>
                    <button onClick={handlePlaceBidClick} className="w-full py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-[#00f2a1] to-[#00c6ff] text-black font-bold hover:opacity-90 transition-opacity btn-hover-effect text-sm sm:text-base">
                        Place Bid
                    </button>
                </div>

                {showConfirmation && (
                     <div className="absolute inset-0 bg-black/80 z-10 flex items-center justify-center p-3 sm:p-4 rounded-xl sm:rounded-2xl animate-fade-in">
                        <div className="bg-[#0D1117] p-4 sm:p-6 rounded-xl border border-gray-700 shadow-lg text-center max-w-sm w-full mx-4">
                            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Confirm Your Bid</h3>
                            <p className="text-sm sm:text-base text-gray-300 mb-4 break-words">
                                You are about to place a bid of <span className="font-bold text-cyan-400">{typeof bidAmount === 'number' ? bidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : bidAmount} STRK</span> on <span className="font-bold text-white">@{auction.domain.replace('.real', '')}</span>.
                            </p>
                            <p className="text-xs sm:text-sm animate-pulse-warning mb-4 sm:mb-6">This action cannot be undone.</p>
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <button 
                                    onClick={() => setShowConfirmation(false)} 
                                    className="w-full py-2 rounded-lg bg-gray-700/80 hover:bg-gray-700 font-bold transition-colors btn-hover-effect text-sm sm:text-base">
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleConfirmBid}
                                    disabled={isSubmitting || !isConnected}
                                    className="w-full py-2 rounded-lg bg-gradient-to-r from-[#00f2a1] to-[#00c6ff] text-black font-bold hover:opacity-90 transition-opacity btn-hover-effect disabled:opacity-50 text-sm sm:text-base">
                                    {isSubmitting ? 'Placing...' : 'Confirm Bid'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }
    return null;
};

export default BiddingModal;
