import React, { useMemo } from 'react';

const mockPriceData = [
    0.075, 0.076, 0.074, 0.077, 0.078, 0.079, 0.081, 0.080, 0.079, 0.082, 
    0.083, 0.085, 0.084, 0.086, 0.087, 0.085, 0.088, 0.090, 0.089, 0.087, 
    0.086, 0.088, 0.089, 0.091, 0.092, 0.090, 0.088, 0.085, 0.083, 0.082,
];

const TokenChart: React.FC = () => {

    const stats = useMemo(() => {
        const currentPrice = mockPriceData[mockPriceData.length - 1];
        const prevDayPrice = mockPriceData[mockPriceData.length - 2];
        const change = currentPrice - prevDayPrice;
        const changePercent = (change / prevDayPrice) * 100;
        const high30d = Math.max(...mockPriceData);
        const low30d = Math.min(...mockPriceData);

        return { currentPrice, change, changePercent, high30d, low30d };
    }, []);

    const chartPoints = useMemo(() => {
        const width = 300;
        const height = 100;
        const max = stats.high30d;
        const min = stats.low30d;
        const range = max - min;
        
        const points = mockPriceData.map((price, index) => {
            const x = (index / (mockPriceData.length - 1)) * width;
            const y = height - ((price - min) / range) * height;
            return `${x},${y}`;
        }).join(' ');

        const areaPath = `M0,${height} ${points} ${width},${height} Z`;
        
        return { points, areaPath };
    }, [stats.high30d, stats.low30d]);


    return (
        <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-center text-white mb-3 sm:mb-4">$BROTHER Token Price</h2>
            <p className="text-center text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">Last 30 Days</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center mb-6 sm:mb-8">
                <div>
                    <p className="text-xs sm:text-sm text-gray-400">Current Price</p>
                    <p className="text-sm sm:text-base md:text-lg font-bold text-white break-words">${stats.currentPrice.toFixed(4)}</p>
                </div>
                <div>
                    <p className="text-xs sm:text-sm text-gray-400">24h Change</p>
                    <p className={`text-sm sm:text-base md:text-lg font-bold break-words ${stats.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.changePercent.toFixed(2)}%
                    </p>
                </div>
                <div>
                    <p className="text-xs sm:text-sm text-gray-400">30d High</p>
                    <p className="text-sm sm:text-base md:text-lg font-bold text-white break-words">${stats.high30d.toFixed(4)}</p>
                </div>
                <div>
                    <p className="text-xs sm:text-sm text-gray-400">30d Low</p>
                    <p className="text-sm sm:text-base md:text-lg font-bold text-white break-words">${stats.low30d.toFixed(4)}</p>
                </div>
            </div>

            <div className="w-full h-40 sm:h-48 md:h-64 bg-[#0D1117]/50 rounded-lg p-3 sm:p-4 flex flex-col justify-center items-center">
                 <svg viewBox="0 0 300 100" className="w-full h-full" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#00c6ff', stopOpacity: 0.4 }} />
                            <stop offset="100%" style={{ stopColor: '#00c6ff', stopOpacity: 0.05 }} />
                        </linearGradient>
                         <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{ stopColor: '#00f2a1' }} />
                            <stop offset="100%" style={{ stopColor: '#00c6ff' }} />
                        </linearGradient>
                    </defs>
                    <path d={chartPoints.areaPath} fill="url(#chartGradient)" />
                    <polyline
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="2"
                        points={chartPoints.points}
                    />
                </svg>
                <div className="flex justify-between w-full text-[10px] sm:text-xs text-gray-500 mt-2 px-1">
                    <span>30 days ago</span>
                    <span>Today</span>
                </div>
            </div>
        </div>
    );
};

export default TokenChart;