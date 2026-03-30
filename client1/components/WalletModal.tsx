import React, { useState } from 'react';
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
    <div className={`${className || "w-8 h-8"} rounded-lg overflow-hidden flex-shrink-0`}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#FF875B"/>
            <path d="M18.316 8H13.684C13.5292 8 13.4052 8.1272 13.4018 8.28531C13.3082 12.7296 11.0323 16.9477 7.11513 19.9355C6.99077 20.0303 6.96243 20.2085 7.05335 20.3369L9.76349 24.1654C9.85569 24.2957 10.0353 24.3251 10.1618 24.2294C12.6111 22.3734 14.5812 20.1345 16 17.6529C17.4187 20.1345 19.389 22.3734 21.8383 24.2294C21.9646 24.3251 22.1443 24.2957 22.2366 24.1654L24.9467 20.3369C25.0375 20.2085 25.0092 20.0303 24.885 19.9355C20.9676 16.9477 18.6918 12.7296 18.5983 8.28531C18.5949 8.1272 18.4708 8 18.316 8Z" fill="white"/>
        </svg>
    </div>
);

const BraavosIcon: React.FC<{ className?: string }> = ({ className }) => {
    const gradientId = `braavosGradient-${Math.random().toString(36).substr(2, 9)}`;
    return (
        <div className={`${className || "w-8 h-8"} rounded-lg overflow-hidden flex-shrink-0`}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FF6B35"/>
                        <stop offset="1" stopColor="#F7931E"/>
                    </linearGradient>
                </defs>
                <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`}/>
                <path d="M16 10C12.6863 10 10 12.6863 10 16C10 19.3137 12.6863 22 16 22C19.3137 22 22 19.3137 22 16C22 12.6863 19.3137 10 16 10ZM16 20C13.7909 20 12 18.2091 12 16C12 13.7909 13.7909 12 16 12C18.2091 12 20 13.7909 20 16C20 18.2091 18.2091 20 16 20Z" fill="white"/>
                <circle cx="16" cy="16" r="2.5" fill="white"/>
            </svg>
        </div>
    );
};

const WalletIcon: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`${className || "w-8 h-8"} rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    </div>
);

const getWalletDetails = (connector: Connector): WalletDetails => {
    const connectorId = connector.id.toLowerCase();
    const connectorName = connector.name || '';
    
    if (connectorId.includes('argent') || connectorName.toLowerCase().includes('argent')) {
        if (connectorId.includes('mobile') || connectorName.toLowerCase().includes('mobile')) {
            return {
                name: "Argent Mobile",
                subtext: "MOBILE APP",
                icon: <ArgentIcon />,
            };
        }
        return {
            name: connectorName || "Argent X",
            subtext: "BROWSER EXTENSION",
            icon: <ArgentIcon />,
        };
    }
    
    if (connectorId.includes('braavos') || connectorName.toLowerCase().includes('braavos')) {
        return {
            name: "Braavos",
            subtext: "BROWSER EXTENSION",
            icon: <BraavosIcon />,
        };
    }
    
    const displayName = connectorName || 
        connectorId
            .split(/(?=[A-Z])|[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    
    return {
        name: displayName,
        subtext: "WALLET",
        icon: <WalletIcon />,
    };
};

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
    const { connectors, connectAsync } = useConnect();
    const [isConnecting, setIsConnecting] = useState(false);
    const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setSelectedConnectorId(null);
        }, 300);
    };

    const connectWallet = async (connector: Connector) => {
        if (isConnecting) return;
        
        setIsConnecting(true);
        setSelectedConnectorId(connector.id);
        
        try {
            await connectAsync({ connector });
            toast.success(`Connected to ${getWalletDetails(connector).name}!`);
            handleClose();
        } catch (error: any) {
            console.error('Connection error:', error);
            toast.error(error?.message || 'Failed to connect wallet');
            setSelectedConnectorId(null);
        } finally {
            setIsConnecting(false);
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <div 
            className={`fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 ${isClosing ? 'animate-fade-out-backdrop' : 'animate-fade-in-backdrop'}`}
            onClick={handleClose}
        >
            <div 
                className={`w-full max-w-md bg-[#161B22] shadow-2xl rounded-xl sm:rounded-2xl max-h-[90vh] overflow-y-auto ${isClosing ? 'animate-fade-out-scale-down' : 'animate-fade-in-scale-up'}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-800">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Connect Wallet</h2>
                        <button 
                            onClick={handleClose} 
                            className="p-1 rounded-full hover:bg-white/10 transition-colors"
                            disabled={isConnecting}
                        >
                            <CloseIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </button>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 mt-2">Choose a wallet to connect to Starknet</p>
                </div>

                <div className="p-4 sm:p-6">
                    {connectors.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-400 text-sm sm:text-base">No wallets available</p>
                            <p className="text-gray-500 text-xs sm:text-sm mt-2">Please install a Starknet wallet extension</p>
                        </div>
                    ) : (
                        <div className="space-y-2 sm:space-y-3">
                            {connectors.map((connector) => {
                                const walletDetails = getWalletDetails(connector);
                                const isSelected = selectedConnectorId === connector.id;
                                const isAvailable = connector.ready;

                                const getInstallUrl = (connectorId: string): string | null => {
                                    const id = connectorId.toLowerCase();
                                    if (id.includes('braavos')) {
                                        return 'https://braavos.app/';
                                    }
                                    if (id.includes('argent')) {
                                        return 'https://www.argent.xyz/';
                                    }
                                    return null;
                                };

                                const installUrl = getInstallUrl(connector.id);

                                return (
                                    <button
                                        key={connector.id}
                                        onClick={() => {
                                            if (isAvailable) {
                                                connectWallet(connector);
                                            } else if (installUrl) {
                                                window.open(installUrl, '_blank', 'noopener,noreferrer');
                                            }
                                        }}
                                        disabled={isConnecting && !isSelected}
                                        className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 transition-all btn-hover-effect text-left ${
                                            isSelected
                                                ? 'border-[#00c6ff] bg-[#0D1117]'
                                                : isAvailable
                                                ? 'border-gray-700 bg-[#0D1117]/50 hover:bg-[#0D1117] hover:border-gray-600'
                                                : installUrl
                                                ? 'border-gray-700 bg-[#0D1117]/50 hover:bg-[#0D1117] hover:border-gray-600 cursor-pointer'
                                                : 'border-gray-800 bg-[#0D1117]/30 opacity-50 cursor-not-allowed'
                                        } ${isConnecting && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <div className="flex-shrink-0">
                                            {walletDetails.icon}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm sm:text-base font-semibold text-white truncate">
                                                        {walletDetails.name}
                                                    </p>
                                                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                                                        {walletDetails.subtext}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {isSelected && isConnecting && (
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#00c6ff]"></div>
                                                    )}
                                                    {!isAvailable && installUrl && (
                                                        <span className="text-xs text-cyan-400 px-2 py-1 bg-cyan-400/10 rounded whitespace-nowrap">Get Wallet</span>
                                                    )}
                                                    {!isAvailable && !installUrl && (
                                                        <span className="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded whitespace-nowrap">Not Available</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-800">
                    <p className="text-xs sm:text-sm text-gray-500 text-center">
                        New to Starknet?{' '}
                        <a 
                            href="https://www.starknet.io/en/ecosystem/wallets" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#00c6ff] hover:text-[#00f2a1] underline"
                        >
                            Learn about wallets
                        </a>
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

