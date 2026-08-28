import React, { useEffect, useState } from 'react';
import { useBns } from '../src/hooks/useBns';

interface ActivityEvent {
    id: string;
    type: 'register' | 'bid' | 'sold';
    domain: string;
    price: string;
    time: string;
}

const ActivityTicker: React.FC = () => {
    const [events, setEvents] = useState<ActivityEvent[]>([]);
    const { getRecentActivity } = useBns();

    useEffect(() => {
        let isMounted = true;
        const fetchEvents = async () => {
             try {
                 const newEvents = await getRecentActivity();
                 if (isMounted && newEvents && newEvents.length > 0) {
                     setEvents(newEvents as ActivityEvent[]);
                 }
             } catch (err) {
                 console.error("Failed to fetch activity:", err);
             }
        };
        
        fetchEvents();
        const interval = setInterval(fetchEvents, 30000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [getRecentActivity]);

    if (events.length === 0) {
        return (
            <div className="w-full bg-[#161B22]/80 border-y border-white/5 backdrop-blur-sm py-2 text-center text-xs text-gray-500">
                Loading verified Sepolia contract activity…
            </div>
        );
    }

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
