import React, { useState } from 'react';
import Header from './components/Header';
import SearchBox from './components/SearchBox';
import FooterBanner from './components/FooterBanner';
import Profile from './components/Profile';
import Pricing from './components/Pricing';
import WalletModal from './components/WalletModal';
import ActivityTicker from './components/ActivityTicker';
import IdentityDashboard from './components/IdentityDashboard';
import PrivateWallet from './components/PrivateWallet';
import PrivateContacts from './components/PrivateContacts';
import { useAccount, useDisconnect } from '@starknet-react/core';

// Replaced grid with organic mesh gradients
const Hero: React.FC = () => (
    <div className="relative w-full text-center py-12 sm:py-16 md:py-20 px-4 overflow-hidden">
        {/* Organic Light Blobs (Mesh Gradient) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-tr from-indigo-500/20 via-purple-500/10 to-transparent blur-[120px] rounded-full pointer-events-none animate-float-slow opacity-60 mix-blend-screen"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-rose-500/10 via-orange-500/5 to-transparent blur-[100px] rounded-full pointer-events-none opacity-40 mix-blend-screen"></div>

        {/* Badge */}
        <div className="relative z-10 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-orange-200/80 text-sm font-medium tracking-wide mb-8 animate-fade-in backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            <span>Sovereign Identity Protocol v2 (Powered by STRK20 Privacy)</span>
        </div>

        {/* Main Text */}
        <div className="relative z-10 max-w-5xl mx-auto space-y-8">
            <h1 className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-semibold tracking-tighter text-white leading-[0.9] text-gradient-warm">
                BOOST YOUR<br /> REACH.
            </h1>
            <p className="max-w-2xl mx-auto text-gray-400 text-lg sm:text-xl font-light leading-relaxed tracking-wide">
                Privacy-first identity infrastructure on Starknet for Humans & AI Agents. <br className="hidden sm:block" />
                One .real identity to rule all your wallets and private assets.
            </p>
        </div>
    </div>
);

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<'search' | 'profile' | 'identity' | 'private-wallet' | 'contacts' | 'pricing'>('search');
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [targetRecipient, setTargetRecipient] = useState<string | undefined>(undefined);
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();

    const handleConnectWallet = () => {
        setIsWalletModalOpen(true);
    };

    const handleDisconnectWallet = async () => {
        await disconnect();
        setTargetRecipient(undefined);
        if (currentView === 'profile' || currentView === 'identity') setCurrentView('search');
    };

    // Clear targetRecipient when navigating away from private-wallet
    const handleNavigate = (view: typeof currentView) => {
        if (view !== 'private-wallet') setTargetRecipient(undefined);
        setCurrentView(view);
    };

    return (
        <div className="relative min-h-screen bg-[#080808] text-white font-sans selection:bg-orange-500/30">
            <Header
                currentView={currentView}
                setCurrentView={handleNavigate}
                walletAddress={isConnected ? address ?? null : null}
                onConnect={handleConnectWallet}
                onDisconnect={handleDisconnectWallet}
            />

            <main className="relative flex-grow flex flex-col items-center justify-start w-full pt-20 z-10">
                {currentView === 'search' && (
                    <>
                        <Hero />
                        <div className="w-full max-w-6xl mx-auto mb-8 animate-fade-in">
                            <ActivityTicker />
                        </div>
                        <div className="w-full max-w-4xl px-4 z-20 mt-4 sm:mt-8">
                            <SearchBox onViewProfile={() => setCurrentView('identity')} />
                        </div>
                    </>
                )}
                {currentView === 'identity' && (
                    <div className="w-full max-w-7xl px-4 pt-6">
                        <IdentityDashboard
                            walletAddress={isConnected ? address ?? null : null}
                            onNavigateView={(v) => setCurrentView(v)}
                        />
                    </div>
                )}
                {currentView === 'private-wallet' && (
                    <div className="w-full max-w-7xl px-4 pt-6">
                        <PrivateWallet
                            walletAddress={isConnected ? address ?? null : null}
                            initialRecipient={targetRecipient}
                        />
                    </div>
                )}
                {currentView === 'contacts' && (
                    <div className="w-full max-w-7xl px-4 pt-6">
                        <PrivateContacts
                            onSendClick={(recipient) => {
                                setTargetRecipient(recipient);
                                setCurrentView('private-wallet');
                            }}
                        />
                    </div>
                )}
                {currentView === 'profile' && (
                    <div className="w-full max-w-7xl px-4 pt-10">
                        <Profile walletAddress={isConnected ? address ?? null : null} />
                    </div>
                )}
                {currentView === 'pricing' && (
                    <Pricing onRegisterClick={() => setCurrentView('search')} />
                )}
            </main>

            {currentView === 'search' && <FooterBanner />}

            <WalletModal isOpen={isWalletModalOpen} onClose={() => setIsWalletModalOpen(false)} />
        </div>
    );
};

export default App;
