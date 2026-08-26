import React, { useEffect, useState } from 'react';
import { useBns } from '../src/hooks/useBns';
import { useAccount } from '../src/starknet/StarknetProvider';
import { toast } from 'react-hot-toast';

const ReferralDashboard: React.FC = () => {
    const { address } = useAccount();
    const { getReferralEarnings } = useBns();
    const [earnings, setEarnings] = useState('0');
    const [referralLink, setReferralLink] = useState('');

    useEffect(() => {
        if (address) {
            const origin = window.location.origin;
            setReferralLink(`${origin}/?ref=${address}`);
            
            (async () => {
                const hexEarnings = await getReferralEarnings(address);
                if (hexEarnings && hexEarnings !== '0x0') {
                    // Simple hex to decimal display or use formatSTRK style
                    const bigIntVal = BigInt(hexEarnings);
                    const base = BigInt(10) ** BigInt(18);
                    const whole = bigIntVal / base;
                    const fraction = bigIntVal % base;
                    const fractionStr = fraction.toString().padStart(18, '0').slice(0, 4);
                    setEarnings(`${whole.toString()}.${fractionStr}`);
                } else {
                    setEarnings('0.0000');
                }
            })();
        }
    }, [address, getReferralEarnings]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink);
        toast.success('Referral link copied!');
    };

    const shareOnX = () => {
        const text = encodeURIComponent('Claim your REAL ID now 🚀\n\n');
        const url = encodeURIComponent(referralLink);
        window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0D1117]/80 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total Earnings</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-[#00f2a1]">{earnings}</span>
                        <span className="text-gray-500 text-sm">BROTHER</span>
                    </div>
                </div>
                <div className="bg-[#0D1117]/80 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Referral Bonus</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-cyan-400">5%</span>
                        <span className="text-gray-500 text-sm">per registration</span>
                    </div>
                </div>
            </div>

            {/* Link Section */}
            <div className="bg-[#0D1117]/80 p-6 rounded-3xl border border-cyan-500/10 backdrop-blur-md">
                <h3 className="text-white text-lg font-semibold mb-4">Your Referral Link</h3>
                <p className="text-gray-400 text-sm mb-4">
                    Share this link with your friends. When they register a domain, you'll earn 5% of their registration fee instantly!
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-grow bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-cyan-200/70 font-mono text-sm truncate">
                        {referralLink || 'Connect wallet to see link'}
                    </div>
                    <button 
                        onClick={copyToClipboard}
                        disabled={!referralLink}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-white transition-all btn-hover-effect whitespace-nowrap disabled:opacity-50"
                    >
                        Copy Link
                    </button>
                    <button
                        onClick={shareOnX}
                        disabled={!referralLink}
                        className="px-6 py-3 bg-black hover:bg-gray-900 border border-white/20 rounded-xl font-bold text-white transition-all btn-hover-effect whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        Share on X
                    </button>
                </div>
            </div>

            {/* How it works */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Share', desc: 'Send your link to friends' },
                    { label: 'Register', desc: 'They register a .real domain' },
                    { label: 'Earn', desc: 'Get 5% bonus rewards' }
                ].map((item, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center text-center">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold mb-3">{i+1}</div>
                        <h4 className="text-white font-semibold mb-1">{item.label}</h4>
                        <p className="text-gray-500 text-xs">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReferralDashboard;
