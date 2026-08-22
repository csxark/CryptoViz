import React from 'react';
import { SimulatorDashboard } from '@/components/yield/SimulatorDashboard';

export const metadata = {
    title: 'DeFi Yield Farming & IL Simulator | CryptoViz',
    description: 'Model impermanent loss, auto-compounded yields, and overall ROI across multiple liquidity pools.',
};

export default function YieldSimulatorPage() {
    return (
        <main className="min-h-screen bg-[#060c17] p-4 md:p-8 relative overflow-hidden">
            {/* Background accents */}
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[200px] pointer-events-none" />

            <div className="relative z-10 w-full h-full text-slate-200">
                <SimulatorDashboard />
            </div>
        </main>
    );
}
