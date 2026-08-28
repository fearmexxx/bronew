import React, { useState } from 'react';

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const FooterBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-20">
            <div className="bg-gradient-to-r from-[#00f2a1] to-[#00c6ff] text-black p-2 sm:p-3 md:p-4 flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
                <div className="flex-grow flex items-center justify-center gap-x-2 sm:gap-x-3 md:gap-x-4 gap-y-2 flex-wrap sm:flex-nowrap min-w-0">
                    <div className="text-center sm:text-left min-w-0 flex-1">
                        <p className="font-bold text-xs sm:text-sm md:text-base lg:text-lg break-words">Private STRK is live in beta</p>
                        <p className="text-[10px] sm:text-xs md:text-sm break-words">Shield, transfer, and unshield STRK through compatible STRK20 wallets.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsVisible(false)}
                    className="flex-shrink-0 p-1.5 sm:p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors btn-hover-effect"
                    aria-label="Dismiss banner"
                >
                    <CloseIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
            </div>
        </div>
    );
};

export default FooterBanner;
