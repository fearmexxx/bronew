import React from 'react';

const Toggle: React.FC<{ enabled: boolean }> = ({ enabled }) => (
    <div className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${enabled ? 'bg-cyan-500' : 'bg-gray-700'}`}>
        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${enabled ? 'translate-x-6' : ''}`}></div>
    </div>
);


const Settings: React.FC = () => {
    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="bg-[#0D1117]/80 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex-grow min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-white">Email Notifications</h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Receive emails about your bids and auction outcomes.</p>
                </div>
                <Toggle enabled={true} />
            </div>
             <div className="bg-[#0D1117]/80 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex-grow min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-white">Push Notifications</h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Get real-time alerts in your browser.</p>
                </div>
                <Toggle enabled={false} />
            </div>
             <div className="bg-[#0D1117]/80 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex-grow min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-white">Auto-renew Domains</h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Automatically renew your domains before they expire.</p>
                </div>
                <Toggle enabled={true} />
            </div>
        </div>
    );
};

export default Settings;
