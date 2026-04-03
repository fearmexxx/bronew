import React, { useState } from 'react';
import DomainList from './DomainList';
import AuctionHistoryList from './AuctionHistoryList';
import Settings from './Settings';
import ReferralDashboard from './ReferralDashboard';
import Governance from './Governance';
import EditProfileModal from './EditProfileModal';
import { useBns } from '../src/hooks/useBns';
import { useAccount } from '@starknet-react/core';
import { generateGeneratedAvatar } from '../src/utils/avatar';

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-16 w-16 text-gray-500"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

interface ProfileProps {
    walletAddress: string | null;
}

const Profile: React.FC<ProfileProps> = ({ walletAddress }) => {
    const [activeTab, setActiveTab] = useState('domains');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [primaryDomain, setPrimaryDomain] = useState<string | null>(null);
    const [profile, setProfile] = useState<{
        nickname?: string;
        avatar?: string;
        description?: string;
    } | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Garbage filter for direct UI safety
    const filterGarbage = (val: string | undefined): string => {
        if (!val) return "";
        const clean = val.trim();
        const lower = clean.toLowerCase();
        // Catch short fragments and long all-caps hex artifacts
        if (lower === "il" || lower === "ih" || lower === "aa" || lower === "aaa") return "";
        if (clean.length >= 3 && /^[A-Z0-9]+$/.test(clean)) return "";
        return clean;
    };

    const { getPrimaryDomain, getFullProfile } = useBns();
    const { address, isConnected } = useAccount();

    const fetchProfile = React.useCallback(async () => {
        if (!walletAddress) return;
        setIsLoading(true);
        try {
            const pd = await getPrimaryDomain(walletAddress);
            setPrimaryDomain(pd);
        if (pd) {
            const data = await getFullProfile(pd);
            setProfile({
                nickname: filterGarbage(data?.nickname),
                avatar: data?.avatar,
                description: filterGarbage(data?.description)
            });
        }
        } catch (e) {
            console.error("Profile fetch error:", e);
        } finally {
            setIsLoading(false);
        }
    }, [walletAddress, getPrimaryDomain, getFullProfile]);

    React.useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // Handle avatar conversion (BNS name to SVG URL)
    const { getDomainSvg } = useBns();
    React.useEffect(() => {
        const loadAvatar = async () => {
            const avatar = profile?.avatar;
            if (!avatar) {
                setAvatarUrl(null);
                return;
            }

            // Handle different avatar types
            if (avatar.startsWith('gen:')) {
                setAvatarUrl(generateGeneratedAvatar(avatar));
            } else if (avatar.includes('/') || avatar.includes(':')) {
                setAvatarUrl(avatar);
            } else {
                // Assume it's a BNS domain name (max 31 chars)
                try {
                    const svg = await getDomainSvg(avatar + '.real');
                    if (svg) {
                        const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
                        setAvatarUrl(URL.createObjectURL(svgBlob));
                    } else {
                        setAvatarUrl(null);
                    }
                } catch (e) {
                    console.error("Error loading BNS avatar:", e);
                    setAvatarUrl(null);
                }
            }
        };
        loadAvatar();
    }, [profile?.avatar, getDomainSvg]);

    if (!walletAddress) {
        return (
            <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-[#161B22]/50 backdrop-blur-sm gradient-border animate-fade-in text-center">
                <h2 className="text-xl sm:text-2xl font-semibold text-white">Connect Your Wallet</h2>
                <p className="text-gray-400 mt-3 sm:mt-4 text-sm sm:text-base px-4">Please connect your Starknet wallet to view your profile and manage your domains.</p>
            </div>
        )
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-[#161B22]/50 backdrop-blur-sm gradient-border animate-fade-in">
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-[#0D1117] flex items-center justify-center border-2 border-gray-700 flex-shrink-0 overflow-hidden shadow-xl shadow-black/40">
                    {avatarUrl ? (
                        <img 
                            src={avatarUrl} 
                            alt="Profile Avatar" 
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" 
                            onError={() => setAvatarUrl(null)}
                        />
                    ) : (
                        <UserIcon className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-gray-500" />
                    )}
                </div>
                <div className="flex-grow w-full sm:w-auto">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-mono break-all px-2 sm:px-0">
                        {profile?.nickname && profile.nickname.trim() !== "" 
                            ? profile.nickname 
                            : (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '')}
                    </h1>
                    {profile?.nickname && profile.nickname.trim() !== "" && (
                        <p className="text-xs text-cyan-400 mt-1 font-mono uppercase tracking-widest">{`${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}`}</p>
                    )}
                    <p className="text-gray-400 mt-2 text-sm sm:text-base px-4 sm:px-0">
                        {profile?.description || "Starknet enthusiast and domain collector. Building the future on-chain."}
                    </p>
                    <button 
                        onClick={() => setIsEditModalOpen(true)}
                        className="mt-3 sm:mt-4 px-4 sm:px-6 py-1.5 sm:py-2 bg-white/5 border border-white/20 rounded-full text-xs sm:text-sm text-white hover:bg-white/10 transition-all btn-hover-effect flex items-center gap-2 mx-auto sm:mx-0"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Edit Profile
                    </button>
                </div>
            </div>

            <div className="flex justify-start mb-4 sm:mb-6 border-b-2 border-gray-800 overflow-x-auto">
                <div className="flex min-w-0">
                    <button onClick={() => setActiveTab('domains')} className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base md:text-lg font-semibold transition-colors whitespace-nowrap ${activeTab === 'domains' ? 'text-white border-b-2 border-[#00c6ff]' : 'text-gray-500 hover:text-gray-300'}`}>My Domains</button>
                    <button onClick={() => setActiveTab('auctions')} className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base md:text-lg font-semibold transition-colors whitespace-nowrap ${activeTab === 'auctions' ? 'text-white border-b-2 border-[#00c6ff]' : 'text-gray-500 hover:text-gray-300'}`}>Auction History</button>
                    <button onClick={() => setActiveTab('referrals')} className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base md:text-lg font-semibold transition-colors whitespace-nowrap ${activeTab === 'referrals' ? 'text-white border-b-2 border-[#00c6ff]' : 'text-gray-500 hover:text-gray-300'}`}>Referrals</button>
                    <button onClick={() => setActiveTab('governance')} className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base md:text-lg font-semibold transition-colors whitespace-nowrap ${activeTab === 'governance' ? 'text-white border-b-2 border-[#00c6ff]' : 'text-gray-500 hover:text-gray-300'}`}>Governance</button>
                    <button onClick={() => setActiveTab('settings')} className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base md:text-lg font-semibold transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'text-white border-b-2 border-[#00c6ff]' : 'text-gray-500 hover:text-gray-300'}`}>Settings</button>
                </div>
            </div>

            <div className="animate-fade-in">
                {activeTab === 'domains' && <DomainList />}
                {activeTab === 'auctions' && <AuctionHistoryList />}
                {activeTab === 'referrals' && <ReferralDashboard />}
                {activeTab === 'governance' && <Governance />}
                {activeTab === 'settings' && <Settings />}
            </div>

            {isEditModalOpen && (
                <EditProfileModal 
                    onClose={() => setIsEditModalOpen(false)} 
                    onSuccess={() => fetchProfile()} 
                />
            )}
        </div>
    );
};

export default Profile;