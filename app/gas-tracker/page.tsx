import React from 'react';
import { GasDashboard } from '@/components/gas/GasDashboard';

export const metadata = {
    title: 'Multi-Chain Omniverse Radar & Gas Tracer | CryptoViz',
    description: 'Deep structural analysis of cross-chain throughput, gas economies, and optimal pathway bridging algorithms.',
};

export default function GasTrackerPage() {
    return (
        <main className="min-h-screen bg-[#050510] p-4 md:p-8 relative overflow-hidden">
            {/* Background ambient lighting */}
            <div className="absolute top-10 left-10 w-[700px] h-[700px] bg-fuchsia-600/10 rounded-full blur-[200px] pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[180px] pointer-events-none" />

            <div className="relative z-10 w-full h-full text-slate-300">
                <GasDashboard />
            </div>
        </main>
    );
}
