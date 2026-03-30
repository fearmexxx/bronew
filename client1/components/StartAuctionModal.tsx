import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuction } from '../src/hooks/useAuction';
import { useAccount } from '@starknet-react/core';

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

interface StartAuctionModalProps {
    domainName: string;
    onClose: () => void;
}

const StartAuctionModal: React.FC<StartAuctionModalProps> = ({ domainName, onClose }) => {
    const [duration, setDuration] = useState('1');
    const [startingBid, setStartingBid] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { createAuction } = useAuction();
    const { isConnected } = useAccount();

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300); // Animation duration
    };

    const modalContent = (
        <div 
            className={`fixed inset-0 bg-black/60 z-50 flex items-center justify-center sm:justify-end p-0 sm:p-0 ${isClosing ? 'animate-fade-out-backdrop' : 'animate-fade-in-backdrop'}`} 
            onClick={handleClose}
        >
            <div 
                className={`w-full sm:w-full sm:max-w-md h-full sm:h-full bg-[#161B22] shadow-2xl p-4 sm:p-6 flex flex-col text-white overflow-y-auto ${isClosing ? 'animate-slide-out-right sm:animate-slide-out-right' : 'animate-fade-in-scale-up sm:animate-slide-in-right'}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold">List for Auction</h2>
                    <button onClick={handleClose} className="p-1 rounded-full hover:bg-white/10">
                        <CloseIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                </div>
                
                <div className="bg-[#0D1117] p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
                    <p className="text-lg sm:text-xl md:text-2xl font-semibold text-center break-words">@{domainName.replace('.real', '')}</p>
                </div>

                <div className="space-y-4 sm:space-y-6">
                    <div>
                        <label htmlFor="startingBid" className="block text-base sm:text-lg font-semibold mb-2">Starting Bid</label>
                        <div className="relative">
                            <input
                                id="startingBid"
                                type="number"
                                step="0.01"
                                min="0"
                                value={startingBid}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                        setStartingBid(value);
                                    }
                                }}
                                placeholder="e.g., 100.00"
                                className="w-full bg-[#0D1117] border-2 border-gray-700 focus:border-[#00c6ff] focus:ring-0 rounded-lg text-white text-sm sm:text-base md:text-lg p-2.5 sm:p-3 pr-20 sm:pr-24 transition-colors focus:shadow-[0_0_10px_rgba(0,198,255,0.4)]"
                            />
                             <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm sm:text-base">STRK</span>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="duration" className="block text-base sm:text-lg font-semibold mb-2">Auction Duration</label>
                        <select
                            id="duration"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="w-full bg-[#0D1117] border-2 border-gray-700 focus:border-[#00c6ff] focus:ring-0 rounded-lg text-white text-sm sm:text-base md:text-lg p-2.5 sm:p-3 transition-colors appearance-none bg-no-repeat bg-[right_0.75rem_center] sm:bg-[right_1rem_center] bg-[length:1em]"
                             style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`}}
                        >
                            <option value="1">1 Day</option>
                            <option value="3">3 Days</option>
                            <option value="7">7 Days</option>
                        </select>
                    </div>
                </div>

                <div className="mt-auto pt-4 sm:pt-6">
                    <div className="border-t border-gray-700 my-3 sm:my-4"></div>
                     <div className="flex justify-between text-xs sm:text-sm text-gray-400">
                        <span>Auction Fee</span>
                        <span className="text-gray-300 font-semibold">2% on settlement</span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Fee is deducted from final bid when auction settles</p>

                    <div className="mt-4 sm:mt-6 md:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
                        <button onClick={handleClose} className="w-full py-2.5 sm:py-3 rounded-lg bg-gray-700/80 hover:bg-gray-700 font-bold transition-colors btn-hover-effect text-sm sm:text-base">
                            Cancel
                        </button>
                        <button 
                            onClick={async () => {
                                if (!isConnected || !startingBid || !duration) return;
                                setIsSubmitting(true);
                                try {
                                    const bidValue = parseFloat(startingBid);
                                    if (isNaN(bidValue) || bidValue <= 0) {
                                        throw new Error("Invalid starting bid amount");
                                    }
                                    
                                    const reserve = BigInt(Math.floor(bidValue * 1e18));
                                    if (reserve === BigInt(0)) {
                                        throw new Error("Starting bid is too small");
                                    }
                                    
                                    const minIncrement = reserve / BigInt(20);
                                    if (minIncrement === BigInt(0)) {
                                        throw new Error("Minimum increment is too small");
                                    }
                                    
                                    const durationHours = parseInt(duration) * 24;
                                    if (durationHours <= 0) {
                                        throw new Error("Invalid duration");
                                    }
                                    
                                    await createAuction(domainName, durationHours, reserve.toString(), minIncrement.toString());
                                    window.location.reload();
                                    handleClose();
                                } catch (e: any) {
                                    console.error("Failed to create auction:", e);
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }}
                            disabled={!isConnected || !startingBid || isSubmitting}
                            className="w-full py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-[#00f2a1] to-[#00c6ff] text-black font-bold hover:opacity-90 transition-opacity btn-hover-effect disabled:opacity-50 text-sm sm:text-base">
                            {isSubmitting ? 'Creating...' : 'Start Auction'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }
    return null;
};

export default StartAuctionModal;