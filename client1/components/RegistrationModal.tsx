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
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-12 w-12 text-[#00f2a1]"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

interface RegistrationModalProps {
    domainName: string;
    onClose: () => void;
    onViewProfile?: () => void;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ domainName, onClose, onViewProfile }) => {
    const [step, setStep] = useState(1); // 1: Period, 2: Profile, 3: Review, 4: Success
    const [selectedYears, setSelectedYears] = useState(1);
    const [isClosing, setIsClosing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [referrer, setReferrer] = useState('');
    const [txHash, setTxHash] = useState<string | null>(null);
    const [hexPrice, setHexPrice] = useState('0x0');
    const { getPrice, registerDomain } = useBns();
    const { isConnected, address } = useAccount();

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

    const expiryDate = useMemo(() => {
        const currentDate = new Date();
        const expiry = new Date(currentDate.setFullYear(currentDate.getFullYear() + selectedYears));
        return expiry.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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
            try {
                const results = await Promise.all(
                    registrationPeriods.map(async (period) => {
                        try {
                            const price = await getPrice(domainName.replace('.real',''), period.years);
                            return { years: period.years, price };
                        } catch {
                            return { years: period.years, price: '0x0' };
                        }
                    })
                );
                const prices: { [key: number]: string } = {};
                results.forEach(res => {
                    prices[res.years] = res.price;
                });
                setYearPrices(prices);
            } catch (e) {
                console.error("Error fetching year prices:", e);
            }
        })();
    }, [domainName, getPrice]);

    const onRegister = async () => {
        if (!isConnected) return;
        setIsSubmitting(true);
        try {
            const hash = await registerDomain(domainName.replace('.real',''), selectedYears, referrer, records);
            if (hash) {
                setTxHash(hash);
                setStep(4);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (isSubmitting) return;
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const renderStep1 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
                <h3 className="text-xl font-display font-bold mb-1 tracking-tight text-gradient text-white">Set Duration</h3>
                <p className="text-sm text-gray-400">Choose how long you want to register your identity.</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {registrationPeriods.map(period => (
                    <div
                        key={period.years}
                        onClick={() => setSelectedYears(period.years)}
                        className={`group relative p-4 rounded-xl cursor-pointer transition-all border-2 overflow-hidden ${selectedYears === period.years ? 'border-[#00c6ff] bg-[#00c6ff]/5' : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'}`}
                    >
                        {selectedYears === period.years && (
                             <div className="absolute top-0 right-0 p-2">
                                <CheckIcon className="h-4 w-4" />
                             </div>
                        )}
                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <span className="block text-lg font-bold text-white">{period.years} Year{period.years > 1 ? 's' : ''}</span>
                                <span className="text-xs text-gray-500 uppercase tracking-widest font-medium">Valid until {
                                    new Date(new Date().setFullYear(new Date().getFullYear() + period.years)).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
                                }</span>
                            </div>
                            <div className="text-right">
                                {yearPrices[period.years] ? (
                                    <>
                                        <span className={`text-xl font-display font-bold ${selectedYears === period.years ? 'text-[#00c6ff]' : 'text-white'}`}>
                                            {formatSTRK(yearPrices[period.years])}
                                        </span>
                                        <span className="ml-1 text-xs text-gray-400 font-bold">STRK</span>
                                    </>
                                ) : (
                                    <div className="h-6 w-20 bg-white/10 animate-pulse rounded-md ml-auto"></div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-[#00c6ff]/10 flex items-center justify-center border border-[#00c6ff]/20">
                        <svg className="h-4 w-4 text-[#00c6ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-300">New Expiry</span>
                </div>
                <span className="text-sm font-display font-bold text-white">{expiryDate}</span>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div>
                <h3 className="text-xl font-display font-bold mb-1 tracking-tight text-gradient text-white">Profile Power-up</h3>
                <p className="text-sm text-gray-400 font-medium">Link your identity to your digital presence (Optional).</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-4">
                    {Object.entries(records).map(([key, value]) => (
                        <div key={key} className="space-y-1.5">
                            <div className="flex justify-between">
                                <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest">{key}</label>
                                <span className={`text-[10px] font-bold ${value.length >= 30 ? 'text-red-500' : value.length >= 25 ? 'text-amber-500' : 'text-gray-600'}`}>
                                    {value.length}/31
                                </span>
                            </div>
                            <div className="relative group">
                                <input 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#00c6ff] focus:ring-1 focus:ring-[#00c6ff]/20 outline-none transition-all"
                                    value={value}
                                    maxLength={31}
                                    placeholder={`e.g. ${key === 'avatar' ? 'https://...' : key === 'twitter' ? '@handle' : 'Your text...'}`}
                                    onChange={(e) => setRecords(prev => ({...prev, [key]: e.target.value}))}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none opacity-20 group-focus-within:opacity-100 transition-opacity">
                                     <svg className="h-4 w-4 text-[#00c6ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-2">
                <div className="h-px bg-white/5 mb-4"></div>
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-[#00f2a1] tracking-widest">Growth Referrer</label>
                    <input 
                        className="w-full bg-[#00f2a1]/5 border border-[#00f2a1]/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#00f2a1] focus:ring-1 focus:ring-[#00f2a1]/20 outline-none transition-all"
                        value={referrer}
                        placeholder="0x... (Help us grow!)"
                        onChange={(e) => setReferrer(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
                <h3 className="text-xl font-display font-bold mb-1 tracking-tight text-gradient text-white">Review Summary</h3>
                <p className="text-sm text-gray-400">Everything looks ready for the Starknet.</p>
            </div>

            <div className="glass-panel rounded-2xl p-6 space-y-4 relative overflow-hidden backdrop-blur-xl">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                    <svg className="h-20 w-20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                </div>

                <div className="flex justify-between items-center group">
                    <span className="text-gray-400 text-sm font-medium">Domain Name</span>
                    <span className="text-white font-display font-bold text-lg tracking-wide">{domainName.replace('.real', '')}<span className="text-gray-500">.real</span></span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm font-medium">Registration</span>
                    <span className="text-white font-medium">{selectedYears} Year{selectedYears > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm font-medium">Meta Records</span>
                    <span className="px-2 py-0.5 rounded bg-white/5 text-xs text-[#00c6ff] border border-white/10">
                         {Object.values(records).filter(Boolean).length} Active
                    </span>
                </div>
                
                <div className="h-px bg-white/10 my-2"></div>
                
                <div className="flex justify-between items-end pt-2">
                    <span className="text-white font-bold">Registration Fee</span>
                    <div className="text-right">
                        <span className="text-3xl font-display font-black text-gradient tracking-tighter text-white">{formatSTRK(hexPrice)}</span>
                        <span className="ml-1 text-sm text-[#00c6ff] font-bold">STRK</span>
                    </div>
                </div>
            </div>
            
            <p className="text-[10px] text-center text-gray-500 px-4">
                By confirming, you will be prompted to approve the STRK transfer and then mint your identity. Both actions are combined in a single atomic transaction.
            </p>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6 flex flex-col items-center justify-center py-4 animate-in zoom-in-95 duration-500">
             <div className="h-20 w-20 rounded-full bg-[#00f2a1]/10 border-2 border-[#00f2a1]/20 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(0,242,161,0.15)]">
                <CheckIcon className="h-10 w-10 text-[#00f2a1]" />
            </div>

            <div className="text-center space-y-2">
                <h3 className="text-2xl font-display font-bold text-white tracking-tight">Identity Secured!</h3>
                <p className="text-sm text-gray-400 max-w-[280px] mx-auto">
                    Welcome to the Brother ID family. Your digital identity is now live on Starknet.
                </p>
            </div>

            <div className="w-full glass-panel rounded-2xl p-6 border-[#00f2a1]/20 bg-[#00f2a1]/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 font-display font-black text-6xl text-[#00f2a1]/5 -mr-4 -mt-4 italic">BNS</div>
                <div className="space-y-4 relative z-10 text-white">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#00f2a1] to-[#00c6ff] flex items-center justify-center text-black font-black text-xl shadow-lg">
                           {domainName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                             <p className="text-lg font-display font-bold text-white tracking-tight">{domainName.replace('.real', '')}<span className="text-gray-500 text-sm">.real</span></p>
                             <p className="text-[10px] text-[#00f2a1] uppercase tracking-widest font-black">Minted Successfully</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full space-y-3 pt-4 px-4 sm:px-0">
                <a 
                    href={`https://sepolia.voyager.online/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/5"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Explorer
                </a>
                 <button 
                    onClick={() => {
                        if (onViewProfile) onViewProfile();
                        handleClose();
                    }}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00f2a1] to-[#00c6ff] text-black font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#00c6ff]/20 uppercase tracking-widest text-xs"
                >
                    View My Identities
                </button>
            </div>
        </div>
    );

    return (
        <div 
            className={`fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md ${isClosing ? 'animate-fade-out duration-300' : 'animate-fade-in duration-300'}`} 
            onClick={handleClose}
        >
            <div 
                className={`w-full max-w-lg glass-panel rounded-[2rem] p-6 sm:p-10 flex flex-col relative shadow-2xl overflow-hidden ${isClosing ? 'animate-out zoom-out-95 fade-out duration-300' : 'animate-in zoom-in-95 fade-in duration-500'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Background Decor */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#00f2a1]/10 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#00c6ff]/10 rounded-full blur-[80px] pointer-events-none"></div>

                {/* Header */}
                <div className="flex items-start justify-between mb-8 relative z-10 text-white">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                             {step > 1 && step < 4 && (
                                <button onClick={prevStep} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 group">
                                    <BackIcon className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                                </button>
                            )}
                            <div className="inline-flex px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-[#00c6ff]">
                                {step === 4 ? 'Complete' : `Step ${step} of 3`}
                            </div>
                        </div>
                        {step < 4 && (
                            <div className="mt-2 text-xs font-bold text-[#00c6ff] flex items-center gap-1.5 opacity-80 decoration-[#00c6ff]/30 underline underline-offset-4">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {domainName.toLowerCase().replace('.real', '')}.real
                            </div>
                        )}
                    </div>
                    {step < 4 && (
                        <button onClick={handleClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 group">
                            <CloseIcon className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 relative z-10 min-h-[350px]">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                </div>

                {/* Progress Indicators */}
                {step < 4 && (
                    <div className="flex gap-2.5 my-8 justify-center">
                        {[1, 2, 3].map(s => (
                            <div 
                                key={s} 
                                className={`h-1.5 rounded-full transition-all duration-500 ${s === step ? 'w-8 bg-gradient-to-r from-[#00f2a1] to-[#00c6ff]' : s < step ? 'w-4 bg-[#00f2a1]/40' : 'w-4 bg-white/10'}`}
                            ></div>
                        ))}
                    </div>
                )}

                {/* Footer Buttons */}
                {step < 4 && (
                    <div className="mt-2 flex flex-col sm:flex-row gap-3 relative z-10">
                         {step < 3 ? (
                             <button 
                                onClick={nextStep} 
                                disabled={step === 1 && !isConnected}
                                className="w-full py-4 rounded-2xl bg-white text-black font-black hover:bg-gray-100 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl uppercase tracking-widest text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {!isConnected && step === 1 ? 'Connect Wallet to Continue' : `Continue to ${step === 1 ? 'Profile' : 'Review'}`}
                            </button>
                        ) : (
                            <button 
                                onClick={onRegister} 
                                disabled={!isConnected || isSubmitting} 
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#00f2a1] to-[#00c6ff] text-black font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#00c6ff]/20 disabled:opacity-30 disabled:hover:scale-100 uppercase tracking-widest text-xs flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin text-black"></div>
                                        Securing Identity...
                                    </>
                                ) : 'Mint Identity Now'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegistrationModal;
