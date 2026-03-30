import React, { useState, useMemo, useEffect } from 'react';
import { useBns } from '../src/hooks/useBns';
import { useAccount } from '@starknet-react/core';

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

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const BackIcon: React.FC<{ className?: string }> = ({ className }) => (
     <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6 text-green-400"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

interface RegistrationModalProps {
    domainName: string;
    onClose: () => void;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ domainName, onClose }) => {
    const [step, setStep] = useState(1); // 1: Period, 2: Profile, 3: Review
    const [selectedYears, setSelectedYears] = useState(1);
    const [isClosing, setIsClosing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [referrer, setReferrer] = useState('');
    const [hexPrice, setHexPrice] = useState('0x0');
    const { getPrice, registerDomain } = useBns();
    const { isConnected } = useAccount();

    const [records, setRecords] = useState({
        'avatar': '',
        'twitter': '',
        'discord': '',
        'url': '',
        'description': ''
    });

    const registrationPeriods = [
        { years: 1 },
        { years: 2 },
        { years: 3 },
    ];

    const [yearPrices, setYearPrices] = useState<{ [key: number]: string }>({});

    const { expiryDate } = useMemo(() => {
        const currentDate = new Date();
        const expiry = new Date(currentDate.setFullYear(currentDate.getFullYear() + selectedYears));
        const expiryDate = expiry.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        return { expiryDate };
    }, [selectedYears]);

    useEffect(() => {
        (async () => {
            try {
                const price = await getPrice(domainName.replace('.real',''), selectedYears);
                setHexPrice(price);
            } catch {
                setHexPrice('0x0');
            }
        })();
    }, [domainName, selectedYears, getPrice]);

    useEffect(() => {
        (async () => {
            const prices: { [key: number]: string } = {};
            for (const period of registrationPeriods) {
                try {
                    const price = await getPrice(domainName.replace('.real',''), period.years);
                    prices[period.years] = price;
                } catch {
                    prices[period.years] = '0x0';
                }
            }
            setYearPrices(prices);
        })();
    }, [domainName, getPrice]);

    const onRegister = async () => {
        if (!isConnected) return;
        setIsSubmitting(true);
        try {
            await registerDomain(domainName.replace('.real',''), selectedYears, referrer, records);
            handleClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const renderStep1 = () => (
        <div className="mb-4 sm:mb-6 animate-fade-in">
            <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Select Registration Period</h3>
            <div className="space-y-2">
                {registrationPeriods.map(period => (
                    <div
                        key={period.years}
                        onClick={() => setSelectedYears(period.years)}
                        className={`flex justify-between items-center p-3 sm:p-4 rounded-lg cursor-pointer transition-all border-2 list-item-hover ${selectedYears === period.years ? 'border-[#00c6ff] bg-[#0D1117]' : 'border-transparent bg-[#0D1117]/50 hover:bg-[#0D1117]'}`}
                    >
                        <span className="text-sm sm:text-base">{period.years} Year{period.years > 1 ? 's' : ''}</span>
                        <span className="text-[#00c6ff] font-semibold text-sm sm:text-base">
                            {yearPrices[period.years] ? formatSTRK(yearPrices[period.years]) : '...'} STRK
                        </span>
                    </div>
                ))}
            </div>
            <div className="mt-4 flex justify-between text-sm sm:text-base text-gray-400">
                <span>Expires</span>
                <span className="text-white">{expiryDate}</span>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="mb-4 sm:mb-6 space-y-4 animate-fade-in">
             <div className="bg-cyan-900/20 border border-cyan-500/20 p-3 rounded-lg text-xs sm:text-sm text-cyan-200">
                Optional: Add text records to your profile now. You can also do this later.
                <br/><span className="opacity-70 text-[10px] mt-1 block">* Values limited to 31 chars for now.</span>
            </div>
            
            {Object.entries(records).map(([key, value]) => (
                <div key={key} className="space-y-1">
                    <label className="text-xs uppercase font-bold text-gray-500">{key}</label>
                    <input 
                        className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none transition-colors"
                        value={value}
                        maxLength={31}
                        placeholder={`Enter ${key}...`}
                        onChange={(e) => setRecords(prev => ({...prev, [key]: e.target.value}))}
                    />
                </div>
            ))}

            <div className="border-t border-gray-700/50 my-4"></div>

            <div className="space-y-1">
                <label className="text-xs uppercase font-bold text-cyan-500/80">Referrer Address (Optional)</label>
                <input 
                    className="w-full bg-[#0a0a0a] border border-cyan-900/30 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none transition-colors"
                    value={referrer}
                    placeholder="0x..."
                    onChange={(e) => setReferrer(e.target.value)}
                />
                <p className="text-[10px] text-gray-500 mt-1 italic italic">Entering a referrer helps grow the community!</p>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="mb-4 sm:mb-6 animate-fade-in space-y-6">
            <div className="bg-[#0D1117] p-4 rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Domain</span>
                    <span className="text-white font-bold">@{domainName.replace('.real', '')}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Period</span>
                    <span className="text-white">{selectedYears} Year{selectedYears > 1 ? 's' : ''}</span>
                </div>
                <div className="border-t border-gray-700"></div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Records to Set</span>
                    <span className="text-white">{Object.values(records).filter(Boolean).length}</span>
                </div>
            </div>

            <div className="flex justify-between items-end">
                <span className="text-gray-300 text-lg">Total Cost</span>
                <div className="text-right">
                    <p className="text-2xl sm:text-3xl font-bold text-[#00c6ff]">{formatSTRK(hexPrice)} STRK</p>
                    <p className="text-xs text-gray-500 mt-1">Gas fees not included</p>
                </div>
            </div>
        </div>
    );

    return (
        <div 
            className={`fixed inset-0 bg-black/60 z-50 flex items-center justify-center sm:justify-end p-0 sm:p-0 ${isClosing ? 'animate-fade-out-backdrop' : 'animate-fade-in-backdrop'}`} 
            onClick={handleClose}
        >
            <div 
                className={`w-full sm:w-full sm:max-w-md h-full sm:h-full bg-[#161B22] shadow-2xl p-4 sm:p-6 flex flex-col text-white overflow-y-auto ${isClosing ? 'animate-slide-out-right sm:animate-slide-out-right' : 'animate-fade-in-scale-up sm:animate-slide-in-right'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {step > 1 && (
                            <button onClick={prevStep} className="p-1 rounded-full hover:bg-white/10 transition-colors">
                                <BackIcon className="h-5 w-5" />
                            </button>
                        )}
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold">
                            {step === 1 ? 'Select Period' : step === 2 ? 'Customize Profile' : 'Review & Mint'}
                        </h2>
                    </div>
                    <button onClick={handleClose} className="p-1 rounded-full hover:bg-white/10 transition-colors">
                        <CloseIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="flex gap-2 mb-6">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-[#00c6ff]' : 'bg-gray-700'}`}></div>
                    ))}
                </div>

                <div className="bg-[#0D1117] p-3 sm:p-4 rounded-lg mb-6">
                    <p className="text-lg sm:text-xl font-semibold text-center text-gray-200">@{domainName.replace('.real', '')}</p>
                </div>

                {/* Content */}
                <div className="flex-1">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </div>

                {/* Footer Buttons */}
                <div className="mt-4 sm:mt-6 md:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
                    {step < 3 ? (
                        <>
                             <button onClick={handleClose} className="w-full py-2.5 sm:py-3 rounded-lg bg-gray-700/80 hover:bg-gray-700 font-bold transition-colors btn-hover-effect text-sm sm:text-base">
                                Cancel
                            </button>
                            <button onClick={nextStep} className="w-full py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-[#00f2a1] to-[#00c6ff] text-black font-bold hover:opacity-90 transition-opacity btn-hover-effect text-sm sm:text-base">
                                Next
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={prevStep} className="w-full py-2.5 sm:py-3 rounded-lg bg-gray-700/80 hover:bg-gray-700 font-bold transition-colors btn-hover-effect text-sm sm:text-base">
                                Back
                            </button>
                            <button onClick={onRegister} disabled={!isConnected || isSubmitting} className="w-full py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-[#00f2a1] to-[#00c6ff] text-black font-bold hover:opacity-90 transition-opacity btn-hover-effect disabled:opacity-50 text-sm sm:text-base flex items-center justify-center gap-2">
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : 'Confirm & Register'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RegistrationModal;
