import React, { useState, useEffect, useRef } from 'react';
import RegistrationModal from './RegistrationModal';
import AuctionList from './AuctionList';
import StartAuctionModal from './StartAuctionModal';
import TokenChart from './TokenChart';
import { useBns } from '../src/hooks/useBns';

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6 text-gray-400"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-4 w-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

// Softer spinner
const LoadingSpinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
);

interface SearchResult {
    domain: string;
    available: boolean;
    owner?: string;
    expires?: string;
    isGracePeriod?: boolean;
    isVerified?: boolean;
}

const VerifiedIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className || "w-5 h-5 text-blue-400"}>
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" fillOpacity="0.2"/>
        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const SearchBox: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [domainToRegister, setDomainToRegister] = useState('');
    const [activeTab, setActiveTab] = useState('search');
    const [isStartAuctionModalOpen, setIsStartAuctionModalOpen] = useState(false);
    const [domainToAuction, setDomainToAuction] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const { isAvailable, getDomainInfo } = useBns();

    const generateSuggestions = (term: string) => {
        if (!term) return [];
        const mockSuggestions = [
            'stark', 'crypto', 'web3', 'defi', 'nft', 'metaverse', 'brother',
            'id', 'wallet', 'token', 'future', 'god', 'king', 'queen', 'art',
            'music', 'dao', 'eth', 'btc', 'max', 'vitalik', 'satoshi', 'moon'
        ];
        const filtered = mockSuggestions.filter(s => s.startsWith(term.toLowerCase()));
        const variations = [
            `${term}`, `${term}id`, `${term}bro`, `${term}stark`,
            `my${term}`, `the${term}`, `${term}x`, `${term}vip`
        ];
        const combined = [...filtered, ...variations];
        return [...new Set(combined)].map(s => s.endsWith('.real') ? s : s + '.real').slice(0, 7);
    };

    const handleSearch = async (term: string) => {
        if (!term) return;
        setShowSuggestions(false);
        setIsLoading(true);
        setSearchResult(null);
        setSearchTerm(term);
        try {
            const domainName = term.toLowerCase().replace('.real', '');
            const available = await isAvailable(domainName);
            
            try {
                const domainInfo = await getDomainInfo(domainName);
                if (domainInfo) {
                    const expiryDate = domainInfo.expiryDate
                        ? new Date(Number(domainInfo.expiryDate) * 1000).toLocaleDateString()
                        : 'N/A';
                    let ownerAddr = domainInfo.resolver || 'N/A';
                    if (typeof ownerAddr === 'string' && ownerAddr.startsWith('0x')) {
                        ownerAddr = `${ownerAddr.slice(0, 6)}...${ownerAddr.slice(-4)}`;
                    }
                    
                    setSearchResult({ 
                        domain: `${domainName}.real`, 
                        available: available, 
                        owner: ownerAddr, 
                        expires: expiryDate,
                        isGracePeriod: domainInfo.isGracePeriod,
                        isVerified: domainInfo.isVerified
                    });
                } else {
                    setSearchResult({ domain: `${domainName}.real`, available: true });
                }
            } catch {
                setSearchResult({ domain: `${domainName}.real`, available: available });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterClick = (domain: string) => {
        setDomainToRegister(domain);
        setIsModalOpen(true);
    };

    const handleAuctionClick = (domain: string) => {
        setDomainToAuction(domain);
        setIsStartAuctionModalOpen(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        setSearchResult(null);
        if (value.trim()) {
            const newSuggestions = generateSuggestions(value.trim());
            setSuggestions(newSuggestions);
            setShowSuggestions(newSuggestions.length > 0);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="w-full">
            {/* Soft Minimal Tabs */}
            <div className="flex justify-center mb-6">
                <div className="flex gap-8 border-b border-white/5 px-8 pb-px">
                    {['search', 'auctions', 'stats'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 text-sm font-medium transition-all duration-300 capitalize relative ${activeTab === tab
                                ? 'text-white'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white shadow-[0_0_10px_white]"></span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="relative min-h-[400px]">
                {activeTab === 'search' && (
                    <div className="animate-fade-in max-w-2xl mx-auto">
                        <div className="relative group z-30" ref={searchContainerRef}>
                            {/* Floating Search Input - Less "Boxy" */}
                            <div className={`
                                relative flex items-center bg-[#0a0a0a]/80 backdrop-blur-xl rounded-2xl 
                                transition-all duration-300
                                border border-white/5 group-hover:border-white/10
                                shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]
                            `}>
                                <div className="absolute left-0 top-0 bottom-0 w-16 flex items-center justify-center text-gray-500">
                                    <SearchIcon className="w-5 h-5 opacity-50" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={handleInputChange}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
                                    placeholder="Find your identity..."
                                    className="w-full bg-transparent border-none text-white text-lg font-medium py-5 pl-14 pr-32 focus:ring-0 placeholder-white/20"
                                    autoComplete="off"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {searchTerm && (
                                        <button onClick={() => { setSearchTerm(''); setSearchResult(null); }} className="p-2 text-gray-500 hover:text-white transition-colors">
                                            <CloseIcon />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleSearch(searchTerm)}
                                        disabled={isLoading}
                                        className="h-10 px-6 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center disabled:opacity-50 text-sm tracking-wide"
                                    >
                                        {isLoading ? <LoadingSpinner /> : "Search"}
                                    </button>
                                </div>
                            </div>

                            {/* Suggestions */}
                            {showSuggestions && (
                                <div className="absolute top-full mt-2 w-full bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/5 rounded-xl shadow-2xl overflow-hidden z-50">
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSearch(s.replace('.real', ''))}
                                            className="w-full text-left px-6 py-3.5 text-gray-400 hover:bg-white/5 hover:text-white transition-colors border-b border-white/5 last:border-0 text-sm font-light"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Search Result Card - Softer Look */}
                        {searchResult && !isLoading && (
                            <div className="mt-8 animate-fade-in-scale-up">
                                <div className="glass-panel p-8 rounded-3xl border border-white/5 bg-gradient-to-br from-white/5 to-transparent">
                                    <div className="flex flex-col items-center text-center gap-6">
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-display text-4xl font-bold text-white">{searchResult.domain}</h3>
                                                {searchResult.isVerified && <VerifiedIcon className="w-8 h-8 mt-1" />}
                                            </div>
                                            <div className="flex items-center justify-center gap-2 mt-3">
                                                <div className={`w-2 h-2 rounded-full ${
                                                    searchResult.available ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 
                                                    searchResult.isGracePeriod ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' :
                                                    'bg-rose-500'
                                                }`}></div>
                                                <span className={`text-sm tracking-wide ${
                                                    searchResult.available ? 'text-emerald-400' : 
                                                    searchResult.isGracePeriod ? 'text-amber-400' :
                                                    'text-rose-400'
                                                }`}>
                                                    {searchResult.available ? 'Available' : 
                                                     searchResult.isGracePeriod ? 'In Grace Period' :
                                                     'Registered'}
                                                </span>
                                            </div>
                                        </div>

                                        {searchResult.available ? (
                                            <button
                                                onClick={() => handleRegisterClick(searchResult.domain)}
                                                className="w-full sm:w-auto px-10 py-3 bg-white text-black font-semibold rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                                            >
                                                Register Now
                                            </button>
                                        ) : searchResult.isGracePeriod ? (
                                            <div className="text-center">
                                                <p className="text-sm text-gray-400 max-w-xs mx-auto mb-4">
                                                    This domain has expired and is currently in its 90-day grace period. Only the owner can renew it.
                                                </p>
                                                <div className="w-full grid grid-cols-2 gap-4 mt-2">
                                                    <div className="bg-black/20 p-4 rounded-2xl">
                                                        <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Last Owner</div>
                                                        <div className="font-mono text-xs text-gray-300 truncate">{searchResult.owner}</div>
                                                    </div>
                                                    <div className="bg-black/20 p-4 rounded-2xl">
                                                        <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Expired</div>
                                                        <div className="font-mono text-xs text-gray-300">{searchResult.expires}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full grid grid-cols-2 gap-4 mt-2">
                                                <div className="bg-black/20 p-4 rounded-2xl">
                                                    <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Owner</div>
                                                    <div className="font-mono text-xs text-gray-300 truncate">{searchResult.owner}</div>
                                                </div>
                                                <div className="bg-black/20 p-4 rounded-2xl">
                                                    <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Expires</div>
                                                    <div className="font-mono text-xs text-gray-300">{searchResult.expires}</div>
                                                </div>
                                            </div>
                                        )}

                                        {!searchResult.available && (
                                            <div className="flex w-full gap-3 mt-2">
                                                <button className="flex-1 py-3 bg-white/5 border border-white/5 text-white rounded-xl hover:bg-white/10 transition-colors text-sm">
                                                    View Details
                                                </button>
                                                <button onClick={() => handleAuctionClick(searchResult.domain)} className="flex-1 py-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-colors text-sm">
                                                    Make Offer
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Human/Clean Empty State */}
                        {!searchResult && !isLoading && (
                            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60 hover:opacity-100 transition-opacity duration-700">
                                <div className="text-center group cursor-default">
                                    <div className="text-3xl font-display font-medium text-white mb-2 group-hover:-translate-y-1 transition-transform duration-500">$6/yr</div>
                                    <div className="text-xs text-gray-500 tracking-wider uppercase">Affordable</div>
                                </div>
                                <div className="text-center group cursor-default">
                                    <div className="text-3xl font-display font-medium text-white mb-2 group-hover:-translate-y-1 transition-transform duration-500 delay-75">100%</div>
                                    <div className="text-xs text-gray-500 tracking-wider uppercase">On-Chain</div>
                                </div>
                                <div className="text-center group cursor-default">
                                    <div className="text-3xl font-display font-medium text-white mb-2 group-hover:-translate-y-1 transition-transform duration-500 delay-150">∞</div>
                                    <div className="text-xs text-gray-500 tracking-wider uppercase">Forever</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'auctions' && (
                    <div className="animate-fade-in glass-panel p-6 rounded-3xl">
                        <AuctionList />
                    </div>
                )}
                {activeTab === 'stats' && (
                    <div className="animate-fade-in glass-panel p-6 rounded-3xl">
                        <TokenChart />
                    </div>
                )}
            </div>

            {isModalOpen && <RegistrationModal domainName={domainToRegister} onClose={() => setIsModalOpen(false)} />}
            {isStartAuctionModalOpen && <StartAuctionModal domainName={domainToAuction} onClose={() => setIsStartAuctionModalOpen(false)} />}
        </div>
    );
};

export default SearchBox;