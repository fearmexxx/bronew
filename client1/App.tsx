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
import { useAccount, useDisconnect } from './src/starknet/StarknetProvider';

// Replaced grid with organic mesh gradients
const Hero: React.FC<{ onPrivateWallet: () => void; onRegister: () => void }> = ({ onPrivateWallet, onRegister }) => (
    <div className="relative w-full text-center py-12 sm:py-16 md:py-20 px-4 overflow-hidden">
        {/* Organic Light Blobs (Mesh Gradient) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-tr from-indigo-500/20 via-purple-500/10 to-transparent blur-[120px] rounded-full pointer-events-none animate-float-slow opacity-60 mix-blend-screen"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-rose-500/10 via-orange-500/5 to-transparent blur-[100px] rounded-full pointer-events-none opacity-40 mix-blend-screen"></div>

        {/* Badge */}
        <div className="relative z-10 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-orange-200/80 text-sm font-medium tracking-wide mb-8 animate-fade-in backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            <span>Brother ID Beta · STRK20 Privacy on Starknet</span>
        </div>

        {/* Main Text */}
        <div className="relative z-10 max-w-5xl mx-auto space-y-8">
            <h1 className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-semibold tracking-tighter text-white leading-[0.9] text-gradient-warm">
                SEND STRK.<br /> REVEAL LESS.
            </h1>
            <p className="max-w-2xl mx-auto text-gray-400 text-lg sm:text-xl font-light leading-relaxed tracking-wide">
                Send private STRK to a memorable name instead of exposing your payment graph. <br className="hidden sm:block" />
                STRK20 settles on Mainnet; `.real` identity registration is currently a Sepolia beta.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button onClick={onPrivateWallet} className="w-full sm:w-auto rounded-full bg-orange-500 px-7 py-3.5 font-bold text-black hover:bg-orange-400 transition-colors">
                    Try private payments
                </button>
                <button onClick={onRegister} className="w-full sm:w-auto rounded-full border border-white/15 bg-white/5 px-7 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors">
                    Find a .real name
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto pt-5 text-left">
                {[
                    ['1', 'Connect Xverse or Ready'],
                    ['2', 'Activate STRK20 privacy'],
                    ['3', 'Shield, send, or unshield'],
                ].map(([number, label]) => (
                    <div key={number} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-orange-500/15 text-orange-300 flex items-center justify-center text-xs font-bold">{number}</span>
                        <span className="text-sm text-gray-300">{label}</span>
                    </div>
                ))}
            </div>
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
                        <Hero
                            onPrivateWallet={() => setCurrentView('private-wallet')}
                            onRegister={() => document.getElementById('domain-search')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                        />
                        <div className="w-full max-w-6xl mx-auto mb-8 animate-fade-in">
                            <ActivityTicker />
                        </div>
                        <div id="domain-search" className="w-full max-w-4xl px-4 z-20 mt-4 sm:mt-8">
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
