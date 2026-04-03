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

const WalletIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 1 1 0 000-2zM2 16a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
    </svg>
);

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-4 w-4"} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

interface HeaderProps {
    setCurrentView: (view: 'search' | 'profile' | 'pricing') => void;
    walletAddress: string | null;
    onConnect: () => void;
    onDisconnect: () => void;
}

const Header: React.FC<HeaderProps> = ({ setCurrentView, walletAddress, onConnect, onDisconnect }) => {

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
                            Brother ID
                        </span>
                    </button>

                    {/* Desktop Navigation - Simpler, cleaner text */}
                    <div className="hidden md:flex items-center gap-8 ml-4">
                        <button onClick={() => setCurrentView('search')} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Features</button>
                        <button onClick={() => setCurrentView('pricing')} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Pricing</button>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    <button className="hidden sm:flex text-sm font-medium text-white/70 hover:text-white px-3 py-1.5 transition-colors">
                        En
                    </button>

                    <button className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" aria-label="Notifications">
                        <BellIcon className="h-5 w-5" />
                    </button>

                    <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block"></div>

                    {walletAddress ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentView('profile')}
                                className="hidden md:flex items-center justify-center p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                                title="View Profile"
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