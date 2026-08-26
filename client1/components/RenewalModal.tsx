import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBns } from '../src/hooks/useBns';
import { useAccount } from '../src/starknet/StarknetProvider';

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

interface RenewalModalProps {
    domainName: string;
    currentExpiry: string; // unused now; kept for compatibility
    onClose: () => void;
}

const RenewalModal: React.FC<RenewalModalProps> = ({ domainName, currentExpiry, onClose }) => {
    const [selectedYears, setSelectedYears] = useState(1);
    const [isClosing, setIsClosing] = useState(false);
    const [hexPrice, setHexPrice] = useState<string>('0x0');
    const [currentExpirySec, setCurrentExpirySec] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { getPrice, getDomainInfo, renewDomain } = useBns();
    const { isConnected } = useAccount();

    const renewalPeriods = [
        { years: 1 },
        { years: 2 },
        { years: 3 },
    ];

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300); // Animation duration
    };

    const formatSTRK = (hex: string) => {
        try {
            if (!hex || hex === '0x0') return '0';
            const value = BigInt(hex);
            const base = BigInt(10) ** BigInt(18);
            const whole = value / base;
            const fraction = value % base;
            const fractionStr = fraction.toString().padStart(18, '0').slice(0, 4);
            return `${whole.toString()}.${fractionStr}`;
        } catch {
            return hex;
        }
    };

    useEffect(() => {
        (async () => {
            try {
                const buyPrice = await getPrice(domainName.replace('.real',''), selectedYears);
                const renewHex = (() => {
                    try {
                        const v = BigInt(buyPrice);
                        return '0x' + (v / BigInt(2)).toString(16);
                    } catch {
                        return '0x0';
                    }
                })();
                setHexPrice(renewHex);
            } catch {
                setHexPrice('0x0');
            }
        })();
    }, [domainName, selectedYears, getPrice]);

    useEffect(() => {
        (async () => {
            try {
                const info = await getDomainInfo((domainName.replace('.real','')));
                const raw = info?.expiryDate as unknown as string | undefined;
                if (raw) setCurrentExpirySec(Number(BigInt(raw)));
            } catch {
                setCurrentExpirySec(null);
            }
        })();
    }, [domainName, getDomainInfo]);

    const formattedCurrentExpiry = useMemo(() => {
        if (!currentExpirySec) return '-';
        const d = new Date(currentExpirySec * 1000);
        return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }, [currentExpirySec]);

    const newExpiryDate = useMemo(() => {
        const nowSec = Math.floor(Date.now() / 1000);
        const base = currentExpirySec && currentExpirySec > nowSec ? currentExpirySec : nowSec;
        const plus = base + (31556926 * selectedYears);
        const d = new Date(plus * 1000);
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }, [currentExpirySec, selectedYears]);


    const modalContent = (
        <div 
            className={`fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 ${isClosing ? 'animate-fade-out-backdrop' : 'animate-fade-in-backdrop'}`} 
            onClick={handleClose}
        >
            <div 
                className={`w-full max-w-md bg-[#161B22] shadow-2xl flex flex-col text-white rounded-xl sm:rounded-2xl max-h-[90vh] ${isClosing ? 'animate-fade-out-scale-down' : 'animate-fade-in-scale-up'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex-shrink-0 p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Renew Starknet Name</h2>
                        <button onClick={handleClose} className="p-1 rounded-full hover:bg-white/10">
                            <CloseIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </button>
                    </div>
                </div>
                
                {/* Scrollable Content Area */}
                <div className="flex-grow overflow-y-auto px-4 sm:px-6">
                    <div className="bg-[#0D1117] p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
                        <p className="text-lg sm:text-xl md:text-2xl font-semibold text-center break-words">@{domainName.replace('.real', '')}</p>
                    </div>

                    <div className="mb-2">
                        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Renewal Period</h3>
                        <div className="space-y-2">
                        {renewalPeriods.map(period => (
                                <div
                                    key={period.years}
                                    onClick={() => setSelectedYears(period.years)}
                                    className={`flex justify-between items-center p-3 sm:p-4 rounded-lg cursor-pointer transition-all border-2 list-item-hover ${selectedYears === period.years ? 'border-[#00c6ff] bg-[#0D1117]' : 'border-transparent bg-[#0D1117]/50 hover:bg-[#0D1117]'}`}
                                >
                                    <span className="text-sm sm:text-base">{period.years} Year{period.years > 1 ? 's' : ''}</span>
                                <span className="text-gray-400 text-sm sm:text-base">{selectedYears === period.years ? formatSTRK(hexPrice) + ' STRK' : ''}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-800">
                     <div className="space-y-2 sm:space-y-3 text-gray-300 text-sm sm:text-base">
                         <div className="flex justify-between">
                            <span>Current Expiry</span>
                            <span className="text-gray-400 font-semibold text-xs sm:text-sm md:text-base break-words">{formattedCurrentExpiry}</span>
                        </div>
                         <div className="flex justify-between">
                            <span>New Expiry Date</span>
                            <span className="text-white font-semibold text-xs sm:text-sm md:text-base break-words">{newExpiryDate}</span>
                        </div>
                        <div className="border-t border-gray-700 my-2 sm:my-3"></div>
                        <div className="flex justify-between text-base sm:text-lg md:text-xl">
                            <span className="font-semibold">Total Due</span>
                            <div className="text-right">
                               <p className="text-white font-bold text-sm sm:text-base md:text-lg">{formatSTRK(hexPrice)} STRK</p>
                               <p className="text-[10px] sm:text-xs text-gray-500 break-all max-w-[120px] sm:max-w-none">on-chain: {hexPrice}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
                        <button onClick={handleClose} className="w-full py-2.5 sm:py-3 rounded-lg bg-gray-700/80 hover:bg-gray-700 font-bold transition-colors btn-hover-effect text-sm sm:text-base">
                            Cancel
                        </button>
                        <button onClick={async ()=>{
                            if (!isConnected) return;
                            setIsSubmitting(true);
                            try {
                                await renewDomain(domainName.replace('.real',''), selectedYears);
                                handleClose();
                            } finally {
                                setIsSubmitting(false);
                            }
                        }} disabled={!isConnected || isSubmitting} className="w-full py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-[#00f2a1] to-[#00c6ff] text-black font-bold hover:opacity-90 transition-opacity btn-hover-effect disabled:opacity-50 text-sm sm:text-base">
                            {isSubmitting ? 'Submitting...' : 'Renew Domain'}
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

export default RenewalModal;
