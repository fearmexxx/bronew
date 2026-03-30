import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBns } from '../src/hooks/useBns';
import { useAccount } from '@starknet-react/core';
import { shortString } from 'starknet';
import type { OwnedDomain } from './DomainList';

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

const RecordIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6 text-cyan-400"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
);
const RedirectIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6 text-cyan-400"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const DetailsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6 text-cyan-400"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5 text-cyan-400"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ClockIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5 text-cyan-400"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const RegistrarIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5 text-cyan-400"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
const MetadataIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5 text-cyan-400"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>;


interface ManageDomainModalProps {
    domain: OwnedDomain;
    onClose: () => void;
}

const ManageDomainModal: React.FC<ManageDomainModalProps> = ({ domain, onClose }) => {
    const [view, setView] = useState<'main' | 'details' | 'transfer' | 'records'>('main');
    const [isClosing, setIsClosing] = useState(false);
    const [toAddress, setToAddress] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { transferDomain, getDomainInfo, setText, getText } = useBns();
    const { isConnected } = useAccount();
    const [resolver, setResolver] = useState<string>('-');
    const [expiryText, setExpiryText] = useState<string>('-');
    const [creationText, setCreationText] = useState<string>('-');

    // Records State
    const [records, setRecords] = useState({
        'avatar': '',
        'twitter': '',
        'discord': '',
        'url': '',
        'description': ''
    });
    const [loadingRecords, setLoadingRecords] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300); // Animation duration
    };

    useEffect(() => {
        (async () => {
            try {
                const label = domain.name.replace('.real','');
                const felt = shortString.encodeShortString(label);
                const info = await getDomainInfo(String(felt));
                if (info) {
                    const raw = info.expiryDate as unknown as string | undefined;
                    if (raw) {
                        const d = new Date(Number(BigInt(raw)) * 1000);
                        if (!isNaN(d.getTime())) setExpiryText(d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
                    }
                    const res = info.resolver as unknown as string;
                    if (res) setResolver(res);
                    const lt = (info as any).last_transfer_time as string | undefined;
                    if (lt) {
                        const cd = new Date(Number(BigInt(lt)) * 1000);
                        if (!isNaN(cd.getTime())) setCreationText(cd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
                    }
                }
            } catch {
                /* ignore */
            }
        })();
    }, [domain.name, getDomainInfo]);

    // Fetch records when entering records view
    useEffect(() => {
        if (view === 'records') {
            (async () => {
                setLoadingRecords(true);
                const label = domain.name.replace('.real', '');
                const keys = Object.keys(records);
                const newRecords = { ...records };
                
                for (const key of keys) {
                    try {
                        const val = await getText(label, key);
                        if (val) (newRecords as any)[key] = val;
                    } catch { /* ignore */ }
                }
                setRecords(newRecords);
                setLoadingRecords(false);
            })();
        }
    }, [view, domain.name, getText]);

    const handleUpdateRecord = async (key: string, value: string) => {
        if (!isConnected) return;
        setIsSubmitting(true);
        try {
            await setText(domain.name.replace('.real', ''), key, value);
            // Optimistic update
            setRecords(prev => ({ ...prev, [key]: value }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderMainView = () => (
        <div className="space-y-2 sm:space-y-3">
            <div 
                className="bg-[#0D1117]/50 p-3 sm:p-4 rounded-lg flex items-center cursor-pointer hover:bg-[#0D1117] transition-colors"
                onClick={() => setView('records')}
            >
                <RecordIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-3 sm:mr-4 flex-shrink-0" />
                <div className="min-w-0">
                    <h3 className="font-semibold text-white text-sm sm:text-base">Update Records</h3>
                    <p className="text-xs sm:text-sm text-cyan-400">Manage avatar, socials, and description</p>
                </div>
            </div>
             <div className="bg-[#0D1117]/50 p-3 sm:p-4 rounded-lg flex items-center opacity-60 cursor-not-allowed">
                <RedirectIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-3 sm:mr-4 flex-shrink-0" />
                <div className="min-w-0">
                    <h3 className="font-semibold text-white text-sm sm:text-base">Set Redirects</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Coming Soon</p>
                </div>
            </div>
            <div 
                className="bg-[#0D1117]/50 p-3 sm:p-4 rounded-lg flex items-center cursor-pointer hover:bg-[#0D1117] transition-colors"
                onClick={() => setView('transfer')}
            >
                <DetailsIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-3 sm:mr-4 flex-shrink-0" />
                <div className="min-w-0">
                    <h3 className="font-semibold text-white text-sm sm:text-base">Transfer Ownership</h3>
                    <p className="text-xs sm:text-sm text-cyan-400">Send this domain to another address</p>
                </div>
            </div>
             <div 
                className="bg-[#0D1117]/50 p-3 sm:p-4 rounded-lg flex items-center cursor-pointer hover:bg-[#0D1117] transition-colors"
                onClick={() => setView('details')}
            >
                <DetailsIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-3 sm:mr-4 flex-shrink-0" />
                <div className="min-w-0">
                    <h3 className="font-semibold text-white text-sm sm:text-base">View Domain Details</h3>
                    <p className="text-xs sm:text-sm text-cyan-400">View creation date, registrar, etc.</p>
                </div>
            </div>
        </div>
    );

    const renderRecordsView = () => (
        <div className="space-y-4">
            {loadingRecords ? (
                <div className="text-center text-gray-400 py-4">Loading records...</div>
            ) : (
                Object.entries(records).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                        <label className="text-xs uppercase font-bold text-gray-500">{key}</label>
                        <div className="flex gap-2">
                            <input 
                                className="flex-1 bg-[#0a0a0a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none"
                                value={value}
                                placeholder={`Enter ${key}`}
                                onChange={(e) => setRecords(prev => ({...prev, [key]: e.target.value}))}
                            />
                            <button 
                                onClick={() => handleUpdateRecord(key, value)}
                                disabled={isSubmitting}
                                className="bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderDetailsView = () => (
        <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm">
             <div className="flex items-start">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-gray-400 mb-1">Creation Date</p>
                    <p className="text-white font-semibold break-words">{creationText}</p>
                </div>
            </div>
            <div className="flex items-start">
                <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-gray-400 mb-1">Expiry Date</p>
                    <p className="text-white font-semibold break-words">{expiryText}</p>
                </div>
            </div>
            <div className="flex items-start">
                <RegistrarIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-gray-400 mb-1">Resolver</p>
                    <p className="text-white font-semibold break-all">{resolver}</p>
                </div>
            </div>
        </div>
    );

    const renderTransferView = () => (
        <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm">
            <p className="text-gray-300 text-sm sm:text-base">Enter the recipient Starknet address. You must be the current owner.</p>
            <input
                className="w-full bg-[#0D1117] border-2 border-gray-700 focus:border-[#00c6ff] focus:ring-0 rounded-lg text-white px-3 py-2 text-sm sm:text-base"
                placeholder="0x..."
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
            />
            <button
                onClick={async () => {
                    if (!isConnected || !toAddress) return;
                    setIsSubmitting(true);
                    try {
                        await transferDomain(domain.name.replace('.real',''), toAddress);
                        handleClose();
                    } finally {
                        setIsSubmitting(false);
                    }
                }}
                disabled={!isConnected || !toAddress || isSubmitting}
                className="w-full py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-[#00f2a1] to-[#00c6ff] text-black font-bold hover:opacity-90 transition-opacity disabled:opacity-50 text-sm sm:text-base"
            >
                {isSubmitting ? 'Transferring...' : 'Transfer'}
            </button>
        </div>
    );

    const modalContent = (
        <div 
            className={`fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 ${isClosing ? 'animate-fade-out-backdrop' : 'animate-fade-in-backdrop'}`} 
            onClick={handleClose}
        >
            <div 
                className={`w-full max-w-md bg-[#161B22] shadow-2xl flex flex-col text-white rounded-xl sm:rounded-2xl gradient-border max-h-[90vh] ${isClosing ? 'animate-fade-out-scale-down' : 'animate-fade-in-scale-up'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex-shrink-0 p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 flex-1">
                            {(view === 'details' || view === 'transfer' || view === 'records') && (
                                <button onClick={() => setView('main')} className="p-1 mr-2 rounded-full hover:bg-white/10 flex items-center flex-shrink-0">
                                    <BackIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                            )}
                            <h2 className="text-lg sm:text-xl md:text-2xl font-bold truncate">
                                {view === 'main' ? 'Manage Domain' : 
                                 view === 'details' ? 'Domain Details' : 
                                 view === 'records' ? 'Update Records' :
                                 'Transfer Ownership'}
                            </h2>
                        </div>
                        <button onClick={handleClose} className="p-1 rounded-full hover:bg-white/10 flex-shrink-0 ml-2">
                            <CloseIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </button>
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex-grow overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="bg-[#0D1117] p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
                        <p className="text-lg sm:text-xl md:text-2xl font-semibold text-center break-words">@{domain.name.replace('.real', '')}</p>
                    </div>
                    {view === 'main' ? renderMainView() : 
                     view === 'details' ? renderDetailsView() : 
                     view === 'records' ? renderRecordsView() :
                     renderTransferView()}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 p-4 sm:p-6 border-t border-white/10">
                    <button onClick={handleClose} className="w-full py-2.5 sm:py-3 rounded-lg bg-gray-700/80 hover:bg-gray-700 font-bold transition-colors btn-hover-effect text-sm sm:text-base">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }
    return null;
};

export default ManageDomainModal;