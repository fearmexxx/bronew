import React from 'react';

interface PriceCardProps {
    years: number;
    price: number;
    title: string;
    description: string;
    features: string[];
    isHighlighted?: boolean;
    onSelect: () => void;
}

const CheckIcon = () => (
    <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const PriceCard: React.FC<PriceCardProps> = ({ years, price, title, description, features, isHighlighted, onSelect }) => (
    <div className={`glass-panel relative p-8 rounded-3xl flex flex-col gap-6 transition-all duration-500 hover:scale-[1.02] ${isHighlighted ? 'border-orange-500/30 bg-orange-500/5' : ''}`}>
        {isHighlighted && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-500 rounded-full text-black text-xs font-bold tracking-widest uppercase shadow-lg shadow-orange-500/20">
                Most Popular
            </div>
        )}
        
        <div className="space-y-2">
            <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>

        <div className="flex items-baseline gap-2">
            <span className="text-5xl font-display font-bold text-white">${price}</span>
            <span className="text-gray-500 font-medium font-mono">/ {years} {years === 1 ? 'Year' : 'Years'}</span>
        </div>

        <div className="h-px w-full bg-white/5"></div>

        <ul className="space-y-4 flex-grow">
            {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                    <CheckIcon />
                    <span>{feature}</span>
                </li>
            ))}
        </ul>

        <button 
            onClick={onSelect}
            className={`w-full py-4 rounded-2xl font-bold transition-all duration-300 ${
                isHighlighted 
                ? 'bg-orange-500 text-black hover:bg-orange-400 shadow-lg shadow-orange-500/20' 
                : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
            }`}
        >
            Register Now
        </button>
    </div>
);

const Pricing: React.FC<{ onRegisterClick: () => void }> = ({ onRegisterClick }) => {
    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-16 sm:py-24 animate-fade-in relative">
            {/* Background Glows */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="text-center space-y-4 mb-20">
                <h2 className="text-sm font-bold text-orange-400 uppercase tracking-[0.3em] mb-4">Pricing Plans</h2>
                <h1 className="text-4xl sm:text-6xl font-display font-bold text-white tracking-tight leading-tight">
                    SIMPLE PRICING.<br />
                    <span className="text-gradient-warm">FOR EVERY IDENTITY.</span>
                </h1>
                <p className="max-w-2xl mx-auto text-gray-400 text-lg font-light leading-relaxed">
                    Choose the plan that fits your journey. All domains are transferable, 
                    upgradeable, and stored permanently on the Starknet blockchain.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                <PriceCard 
                    years={1}
                    price={5}
                    title="Starter"
                    description="Perfect for getting started with your web3 identity. Includes all core BNS features."
                    features={[
                        "Basic .real domain registration",
                        "Primary domain support",
                        "Basic text records (Twitter, Discord)",
                        "On-chain metadata & SVG",
                        "90-day grace period"
                    ]}
                    onSelect={onRegisterClick}
                />

                <PriceCard 
                    years={2}
                    price={8}
                    isHighlighted={true}
                    title="Standard"
                    description="The best value for creators and active community members. Save 20% on the yearly rate."
                    features={[
                        "All Starter features",
                        "Multi-year registration discount",
                        "Verified badge eligibility",
                        "Priority subdomain creation",
                        "Enhanced profile records access",
                        "Custom text record support"
                    ]}
                    onSelect={onRegisterClick}
                />

                <PriceCard 
                    years={3}
                    price={12}
                    title="Visionary"
                    description="For the long-term builders and visionaries of the Starknet ecosystem."
                    features={[
                        "All Standard features",
                        "Maximum registration term",
                        "Priority support eligibility",
                        "Early access to new features",
                        "Enhanced governance participation",
                        "Genesis holder status"
                    ]}
                    onSelect={onRegisterClick}
                />
            </div>

            {/* Payment Info */}
            <div className="mt-24 glass-panel p-8 sm:p-12 rounded-[40px] text-center space-y-8 relative overflow-hidden group hover:border-orange-500/20 transition-all duration-500">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/30 to-transparent"></div>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
                    <div className="space-y-2">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Accepted Tokens</p>
                        <div className="flex items-center gap-6 opacity-60 grayscale group-hover:grayscale-0 transition-all duration-700">
                             <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-black font-bold font-mono">S</div>
                                <span className="text-lg font-bold text-white">STRK</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold font-mono">B</div>
                                <span className="text-lg font-bold text-white">BROTHER</span>
                             </div>
                        </div>
                    </div>

                    <div className="hidden sm:block w-px h-12 bg-white/10"></div>

                    <div className="space-y-4">
                        <p className="text-gray-400 text-sm max-w-md mx-auto sm:text-left leading-relaxed">
                            <span className="text-white font-bold">Secure and Decentralized.</span> Payments are processed directly through Starknet smart contracts with no hidden fees or middlemen.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Pricing;
