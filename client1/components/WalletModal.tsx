import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useConnect, Connector } from '@starknet-react/core';
import { toast } from 'react-hot-toast';

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

interface WalletModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface WalletDetails {
    name: string;
    subtext: string;
    icon: React.ReactNode;
}

const ArgentIcon: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`${className || "w-8 h-8"} rounded-xl overflow-hidden flex-shrink-0 bg-[#FF875B] flex items-center justify-center p-1.5`}>
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.316 8H13.684C13.5292 8 13.4052 8.1272 13.4018 8.28531C13.3082 12.7296 11.0323 16.9477 7.11513 19.9355C6.99077 20.0303 6.96243 20.2085 7.05335 20.3369L9.76349 24.1654C9.85569 24.2957 10.0353 24.3251 10.1618 24.2294C12.6111 22.3734 14.5812 20.1345 16 17.6529C17.4187 20.1345 19.389 22.3734 21.8383 24.2294C21.9646 24.3251 22.1443 24.2957 22.2366 24.1654L24.9467 20.3369C25.0375 20.2085 25.0092 20.0303 24.885 19.9355C20.9676 16.9477 18.6918 12.7296 18.5983 8.28531C18.5949 8.1272 18.4708 8 18.316 8Z" fill="white" />
        </svg>
    </div>
);

const BraavosIcon: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`${className || "w-8 h-8"} rounded-xl overflow-hidden flex-shrink-0 bg-[#F7931E] flex items-center justify-center p-1.5`}>
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 10C12.6863 10 10 12.6863 10 16C10 19.3137 12.6863 22 16 22C19.3137 22 22 19.3137 22 16C22 12.6863 19.3137 10 16 10ZM16 20C13.7909 20 12 18.2091 12 16C12 13.7909 13.7909 12 16 12C18.2091 12 20 13.7909 20 16C20 18.2091 18.2091 20 16 20Z" fill="white" />
            <circle cx="16" cy="16" r="2.5" fill="white" />
        </svg>
    </div>
);

const MetaMaskIcon: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`${className || "w-8 h-8"} rounded-xl overflow-hidden flex-shrink-0 bg-[#E17131]/10 flex items-center justify-center p-1.5`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 12.441L21.365 10.334L19.539 12.511L22 12.14V12.441ZM2.133 12.428L2.736 10.32L4.475 12.498L2.133 12.158V12.428ZM21.583 8.358L16.273 6.945L17.514 9.171L21.583 8.358ZM2.41 8.349L7.697 6.918L6.486 9.141L2.41 8.349ZM18.847 13.823L17.387 15.659L17.848 18.172L18.847 13.823ZM5.155 13.81L6.611 15.642L6.155 18.16L5.155 13.81ZM16.634 15.82L14.734 16.71L14.931 18.421L16.634 15.82ZM7.369 15.811L9.263 16.696L9.07 18.409L7.369 15.811ZM13.82 20.354L14.743 18.59L12.001 17.574L9.273 18.601L10.187 20.366C10.187 20.366 11.233 21.082 12.004 21.082C12.775 21.082 13.82 20.354 13.82 20.354Z" fill="#E17131"/>
            <path d="M12.001 17.574L14.931 18.421L14.743 18.59L13.82 20.354C13.82 20.354 12.775 21.082 12.004 21.082C11.233 21.082 10.187 20.366 10.187 20.366L9.273 18.601L9.07 18.409L12.001 17.574Z" fill="#E17131"/>
            <path d="M17.514 9.171L16.273 6.945L12.001 5L7.729 6.945L6.486 9.141L7.729 11.95L12.001 12.923L16.273 11.95L17.514 9.171Z" fill="#E17131"/>
        </svg>
    </div>
);

const XverseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`${className || "w-8 h-8"} rounded-xl overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center p-1.5`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.3 5.7L12 12L18.3 18.3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5.7 18.3L12 12L5.7 5.7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="2.5" fill="white"/>
        </svg>
    </div>
);

const WalletIcon: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`${className || "w-8 h-8"} rounded-xl overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    </div>
);

const getWalletDetails = (connector: Connector): WalletDetails => {
    const id = connector.id.toLowerCase();
    const name = connector.name || '';

    if (id.includes('argent')) {
        if (id.includes('mobile')) return { name: "Ready Mobile", subtext: "", icon: <ArgentIcon /> };
        return { name: "Ready (formly Argent)", subtext: "", icon: <ArgentIcon /> };
    }
    if (id.includes('braavos')) return { name: "Braavos", subtext: "", icon: <BraavosIcon /> };
    if (id.includes('metamask')) return { name: "MetaMask", subtext: "", icon: <MetaMaskIcon /> };
    if (id.includes('xverse')) return { name: "Xverse", subtext: "", icon: <XverseIcon /> };
    if (id.includes('controller')) return { name: "Controller", subtext: "", icon: <WalletIcon /> };
    return { name: name || "Unknown", subtext: "", icon: <WalletIcon /> };
};

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
    const { connectors, connectAsync } = useConnect();
    const [isConnecting, setIsConnecting] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    const [lastId, setLastId] = useState<string | null>(null);

    const getInstallUrl = (connectorId: string): string => {
        const id = connectorId.toLowerCase();
        if (id.includes('argent')) return 'https://www.argent.xyz/';
        if (id.includes('braavos')) return 'https://braavos.app/';
        if (id.includes('xverse')) return 'https://www.xverse.app/';
        if (id.includes('metamask')) return 'https://metamask.io/';
        return 'https://starknet.io/en/ecosystem/wallets';
    };

    useEffect(() => {
        const stored = localStorage.getItem('last_wallet_connector');
        if (stored) setLastId(stored);
    }, [isOpen]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setSelectedId(null);
        }, 300);
    };

    const connectWallet = async (connector: Connector) => {
        if (isConnecting) return;

        // Check if wallet is available (installed in browser)
        const isAvailable = connector.available();

        if (!isAvailable) {
            toast(`Redirecting to download ${connector.name}...`, { icon: '📥' });
            window.open(getInstallUrl(connector.id), '_blank', 'noopener,noreferrer');
            return;
        }

        setIsConnecting(true);
        setSelectedId(connector.id);

        try {
            await connectAsync({ connector });
            localStorage.setItem('last_wallet_connector', connector.id);
            toast.success(`Connected!`);
            handleClose();
        } catch (error: any) {
            console.error("Connection error:", error);
            toast.error(error?.message || 'Failed to connect');
        } finally {
            setIsConnecting(false);
            setSelectedId(null);
        }
    };

    if (!isOpen) return null;

    // Grouping
    const primaryIds = ['argent', 'braavos', 'metamask', 'xverse'];
    const primary = connectors.filter(c => primaryIds.some(id => c.id.toLowerCase().includes(id)));
    const others = connectors.filter(c => !primary.includes(c));

    const renderConnector = (connector: Connector, type: 'full' | 'icon' = 'full') => {
        const details = getWalletDetails(connector);
        const isSelected = selectedId === connector.id;
        const isLast = lastId === connector.id;

        if (type === 'icon') {
            return (
                <button
                    key={connector.id}
                    onClick={() => connectWallet(connector)}
                    className="p-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all active:scale-95"
                    title={details.name}
                >
                    {details.icon}
                </button>
            );
        }

        return (
            <button
                key={connector.id}
                onClick={() => connectWallet(connector)}
                disabled={isConnecting}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] ${isSelected ? 'border-[#00c6ff] bg-[#00c6ff]/5' : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'
                    }`}
            >
                {details.icon}
                <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-white">{details.name}</p>
                </div>
                {isLast && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#00f2a1] bg-[#00f2a1]/10 px-2 py-0.5 rounded-full">
                        Recently used
                    </span>
                )}
                {isSelected && (
                    <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full"></div>
                )}
            </button>
        );
    };

    const modalContent = (
        <div
            className={`fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
            onClick={handleClose}
        >
            <div
                className={`w-full max-w-sm bg-[#0b0e14] border border-white/10 shadow-3xl rounded-[2.5rem] overflow-hidden flex flex-col relative ${isClosing ? 'animate-zoom-out' : 'animate-zoom-in'}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-8 pb-4">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-2xl font-bold text-white tracking-tight">Connect a wallet</h2>
                        <button onClick={handleClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                            <CloseIcon className="h-5 w-5" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed pr-8">
                        You need to create or connect a Starknet wallet before starting trading.
                    </p>
                </div>

                <div className="p-8 pt-0 flex-1 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    <div className="space-y-3">
                        {primary.length > 0 ? primary.map(c => renderConnector(c)) : (
                            <div className="p-8 text-center bg-white/5 rounded-3xl opacity-50">
                                <p className="text-sm text-gray-400">No browser wallets found</p>
                            </div>
                        )}
                    </div>

                    {others.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white">More wallets</span>
                                <div className="flex gap-2">
                                    {others.map(c => renderConnector(c, 'icon'))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-8 pt-4 border-t border-white/5 bg-white/[0.02]">
                    <p className="text-[10px] leading-relaxed text-gray-500 text-center">
                        By connecting a wallet, you agree to <a href="#" className="text-[#00c6ff] font-bold hover:underline font-display tracking-tight border-b border-[#00c6ff]/0 hover:border-[#00c6ff]">BROTHER ID terms & conditions</a> and acknowledge that you have read and understood the <a href="#" className="text-[#00c6ff] font-bold hover:underline font-display tracking-tight border-b border-[#00c6ff]/0 hover:border-[#00c6ff]">BROTHER ID Protocol Disclaimer</a>.
                    </p>
                </div>
            </div>
        </div>
    );

    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }
    return null;
};

export default WalletModal;
