import React, { useState, useEffect, useMemo } from 'react';
import { useAccount } from '@starknet-react/core';
import { useBns } from '../src/hooks/useBns';
import { useNfts, NFTAsset } from '../src/hooks/useNfts';
import { toast } from 'react-hot-toast';
import { generateGeneratedAvatar } from '../src/utils/avatar';

interface EditProfileModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose, onSuccess }) => {
    const { address, isConnected } = useAccount();
    const { getPrimaryDomain, getFullProfile, setText, setPrimaryDomain, getUserDomains, getDomainSvg } = useBns();
    const { fetchUserNfts, isLoading: isLoadingNfts } = useNfts();
    
    const [primaryDomain, setPrimaryDomainName] = useState<string | null>(null);
    const [ownedDomains, setOwnedDomains] = useState<string[]>([]);
    const [nickname, setNickname] = useState('');
    const [avatar, setAvatar] = useState(''); // The preview URL
    const [avatarValue, setAvatarValue] = useState(''); // The on-chain value (max 31 chars)
    const [nfts, setNfts] = useState<NFTAsset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // Initial Data Fetch
    useEffect(() => {
        const init = async () => {
            if (!address || !isConnected) return;
            setIsLoading(true);
            try {
                // 1. Get Primary Domain
                const pd = await getPrimaryDomain(address);
                setPrimaryDomainName(pd || null);

                // 2. Get User Domains (fallback if no primary)
                const domains = await getUserDomains(address);
                const names = domains.map(d => {
                    const nameFelt = typeof d === 'string' ? d : (d as any).nameFelt;
                    return nameFelt; // We'll decode later if needed, but for now we just need the list
                }).filter(Boolean);
                setOwnedDomains(names);

                // 3. Get existing profile if primary exists
                if (pd) {
                    const profile = await getFullProfile(pd);
                    if (profile) {
                        setNickname(profile.nickname || '');
                        const savedAvatar = profile.avatar || '';
                        setAvatarValue(savedAvatar);
                        
                        // Handle different avatar types
                        if (savedAvatar.startsWith('gen:')) {
                            setAvatar(generateGeneratedAvatar(savedAvatar));
                        } else if (savedAvatar && !savedAvatar.includes('/') && !savedAvatar.includes(':')) {
                            // BNS domain name
                            const svg = await getDomainSvg(savedAvatar + '.real');
                            if (svg) {
                                const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
                                setAvatar(URL.createObjectURL(svgBlob));
                            }
                        } else {
                            setAvatar(savedAvatar);
                        }
                    }
                }

                // 4. Fetch NFTs for picker
                const userNfts = await fetchUserNfts();
                setNfts(userNfts);
            } catch (e) {
                console.error("Error initializing profile edit:", e);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [address, isConnected, getPrimaryDomain, getFullProfile, getUserDomains, fetchUserNfts]);

    const handleSave = async () => {
        if (!primaryDomain || !address) {
            toast.error("Please set a primary domain first");
            return;
        }

        setIsSaving(true);
        try {
            // Save Nickname & Avatar as text records
            await setText(primaryDomain, 'nickname', nickname);
            if (avatarValue !== undefined) {
                await setText(primaryDomain, 'avatar', avatarValue);
            }
            toast.success("Profile updated successfully!");
            onSuccess();
            handleClose();
        } catch (e: any) {
            console.error("Save error:", e);
            toast.error(e?.message || "Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetPrimary = async (name: string) => {
        try {
            await setPrimaryDomain(name);
            setPrimaryDomainName(name);
            // Re-fetch profile for the now-primary domain
            const profile = await getFullProfile(name);
            if (profile) {
                setNickname(profile.nickname || '');
                setAvatar(profile.avatar || '');
            }
        } catch (e) {
            console.error("Set primary error:", e);
        }
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="text-white text-xl animate-pulse">Loading Profile Data...</div>
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`relative w-full max-w-2xl bg-[#161B22] border border-white/10 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
                    <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
                    <button onClick={handleClose} className="p-2 text-gray-400 hover:text-white transition-colors">
                        <CloseIcon />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {!primaryDomain && ownedDomains.length > 0 ? (
                        <div className="mb-8 p-6 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl">
                            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Set Primary Domain</h3>
                            <p className="text-gray-400 text-sm mb-4">You need a primary domain to store profile records. Select one from your wallet below:</p>
                            <div className="grid grid-cols-1 gap-2">
                                {ownedDomains.map((d, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => handleSetPrimary(d)}
                                        className="p-3 text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all flex justify-between items-center group"
                                    >
                                        <span>@{d}.real</span>
                                        <span className="text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">Set as Primary →</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {primaryDomain ? (
                        <div className="space-y-6">
                            {/* Nickname Field */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-400 ml-1">Nickname</label>
                                <input 
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder="Enter your display name"
                                    className="w-full bg-[#0D1117] border border-white/10 rounded-2xl p-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 transition-all font-mono"
                                />
                            </div>

                            {/* Avatar Picker */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <label className="text-sm font-semibold text-gray-400 ml-1">NFT Avatar</label>
                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">Your NFTs</span>
                                </div>
                                
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                    {nfts.map((nft, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => {
                                                setAvatar(nft.image || '');
                                                setAvatarValue(nft.value);
                                            }}
                                            className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all group ${avatarValue === nft.value ? 'border-cyan-400 ring-4 ring-cyan-400/20' : 'border-white/5 hover:border-white/20'}`}
                                        >
                                            {nft.image ? (
                                                <img src={nft.image} alt={nft.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-xs text-gray-500">No Image</div>
                                            )}
                                            {avatarValue === nft.value && (
                                                <div className="absolute inset-0 bg-cyan-400/20 flex items-center justify-center">
                                                    <div className="bg-cyan-400 rounded-full p-1 shadow-lg shadow-black/50">
                                                        <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-[8px] text-white truncate text-center backdrop-blur-md">
                                                {nft.name}
                                            </div>
                                        </button>
                                    ))}
                                    {nfts.length === 0 && !isLoadingNfts && (
                                        <div className="col-span-full py-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10 text-gray-500 text-sm">
                                            No NFTs found in this wallet
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-8 text-center text-gray-500">
                            {ownedDomains.length === 0 
                                ? "You don't own any domains yet. Register one to customize your profile!" 
                                : "Please select a primary domain to start editing your profile."}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-white/5 border-t border-white/5 flex gap-4">
                    <button 
                        onClick={handleClose}
                        className="flex-1 px-6 py-3 border border-white/10 rounded-2xl text-white font-semibold hover:bg-white/5 transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={!primaryDomain || isSaving}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-[#00f2a1] to-[#00c6ff] text-black font-bold rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                    >
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;
