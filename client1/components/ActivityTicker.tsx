import React, { useEffect, useState } from 'react';

interface ActivityEvent {
    id: number;
    type: 'register' | 'bid' | 'sold';
    domain: string;
    price: string;
    time: string;
}

const MOCK_EVENTS: ActivityEvent[] = [
    { id: 1, type: 'register', domain: 'starknet.real', price: '50 STRK', time: '2m ago' },
    { id: 2, type: 'bid', domain: 'crypto.real', price: '120 STRK', time: '5m ago' },
    { id: 3, type: 'register', domain: 'alice.real', price: '10 STRK', time: '12m ago' },
    { id: 4, type: 'sold', domain: 'btc.real', price: '500 STRK', time: '1h ago' },
    { id: 5, type: 'register', domain: 'bob.real', price: '5 STRK', time: '1h ago' },
    { id: 6, type: 'bid', domain: 'nft.real', price: '250 STRK', time: '2h ago' },
];

const ActivityTicker: React.FC = () => {
    const [events, setEvents] = useState<ActivityEvent[]>(MOCK_EVENTS);

    // In a real implementation, this would fetch from the Indexer
    // useEffect(() => {
    //     const fetchEvents = async () => { ... }
    //     fetchEvents();
    //     const interval = setInterval(fetchEvents, 30000);
    //     return () => clearInterval(interval);
    // }, []);

    return (
        <div className="w-full bg-[#161B22]/80 border-y border-white/5 backdrop-blur-sm overflow-hidden py-2">
            <div className="flex animate-scroll-left pause-animation">
                {/* Duplicate the events to create a seamless loop */}
                {[...events, ...events].map((event, index) => (
                    <div key={`${event.id}-${index}`} className="flex items-center space-x-2 mx-6 whitespace-nowrap">
                        <span className={`w-2 h-2 rounded-full ${
                            event.type === 'register' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' :
                            event.type === 'bid' ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]' :
                            'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.5)]'
                        }`}></span>
                        <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">{event.type}</span>
                        <span className="text-white font-mono font-medium">@{event.domain}</span>
                        <span className="text-cyan-400 font-bold text-sm">{event.price}</span>
                        <span className="text-gray-600 text-xs">{event.time}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActivityTicker;
