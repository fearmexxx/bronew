import React, { useState } from 'react';
import DomainList from './DomainList';
import AuctionHistoryList from './AuctionHistoryList';
import Settings from './Settings';
import ReferralDashboard from './ReferralDashboard';
import Governance from './Governance';

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
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-[#0D1117] flex items-center justify-center border-2 border-gray-700 flex-shrink-0">
                    <UserIcon className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-gray-500" />
                </div>
                <div className="flex-grow w-full sm:w-auto">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-mono break-all px-2 sm:px-0">{`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}</h1>
                    <p className="text-gray-400 mt-2 text-sm sm:text-base px-4 sm:px-0">Starknet enthusiast and domain collector. Building the future on-chain.</p>
                     <button className="mt-3 sm:mt-4 px-3 sm:px-4 py-1.5 sm:py-2 border border-white/20 rounded-full text-xs sm:text-sm text-white hover:bg-white/10 transition-colors btn-hover-effect">
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
        </div>
    );
};

export default Profile;