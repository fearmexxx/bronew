import React from 'react';

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-4 w-4"} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

interface HeaderProps {
    currentView: 'search' | 'profile' | 'identity' | 'private-wallet' | 'contacts' | 'pricing';
    setCurrentView: (view: 'search' | 'profile' | 'identity' | 'private-wallet' | 'contacts' | 'pricing') => void;
    walletAddress: string | null;
    onConnect: () => void;
    onDisconnect: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, setCurrentView, walletAddress, onConnect, onDisconnect }) => {
    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const getNavClass = (view: 'search' | 'profile' | 'identity' | 'private-wallet' | 'contacts' | 'pricing') => {
        const isActive = currentView === view;
        return `text-sm font-medium transition-all px-3 py-1.5 rounded-full ${
            isActive
                ? 'text-orange-400 bg-orange-500/10 border border-orange-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`;
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 p-4 transition-all duration-300">
            <nav className="glass-panel max-w-7xl mx-auto rounded-full px-6 py-3 flex items-center justify-between shadow-2xl">
                {/* Logo Area */}
                <div className="flex items-center gap-6">
                    <button onClick={() => setCurrentView('search')} className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold text-lg transform group-hover:scale-105 transition-transform duration-300">
                            B
                        </div>
                        <span className="text-xl font-display font-bold tracking-tight text-white group-hover:text-gray-200 transition-colors">
                            Brother ID v2
                        </span>
                    </button>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-2 ml-4">
                        <button onClick={() => setCurrentView('search')} className={getNavClass('search')}>Search</button>
                        <button onClick={() => setCurrentView('identity')} className={getNavClass('identity')}>Identity Dashboard</button>
                        <button onClick={() => setCurrentView('private-wallet')} className={getNavClass('private-wallet')}>Private Wallet</button>
                        <button onClick={() => setCurrentView('contacts')} className={getNavClass('contacts')}>Contacts</button>
                        <button onClick={() => setCurrentView('pricing')} className={getNavClass('pricing')}>Pricing</button>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    <button className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" aria-label="Notifications">
                        <BellIcon className="h-5 w-5" />
                    </button>

                    <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block"></div>

                    {walletAddress ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentView('identity')}
                                className="hidden md:flex items-center justify-center p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                                title="View Identity Dashboard"
                            >
                                <UserIcon />
                            </button>
                            <button
                                onClick={onDisconnect}
                                className="flex items-center gap-2 px-4 py-2 bg-[#161B22] border border-white/10 rounded-full text-sm hover:border-white/30 transition-all group"
                            >
                                <div className="w-2 h-2 rounded-full bg-green-500 group-hover:shadow-[0_0_8px_rgba(34,197,94,0.6)] transition-shadow"></div>
                                <span className="font-mono text-gray-300">{formatAddress(walletAddress)}</span>
                                <ChevronDownIcon className="text-gray-500" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onConnect}
                            className="btn-primary px-5 py-2 rounded-full text-sm flex items-center gap-2"
                        >
                            <span>Sign In</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                <path fillRule="evenodd" d="M13.293 14.707a1 1 0 010-1.414L16.586 10l-3.293-3.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>
            </nav>
        </header>
    );
};

export default Header;