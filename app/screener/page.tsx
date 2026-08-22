import React from 'react';
import { ScreenerDashboard } from '@/components/screener/ScreenerDashboard';

export const metadata = {
    title: 'Protocol Intelligence Screener | CryptoViz',
    description: 'Advanced sentiment, yield, and risk discovery engine for DeFi protocols.',
};

export default function ScreenerPage() {
    return (
        <main className="min-h-screen bg-slate-950 p-4 md:p-8 relative overflow-hidden">
            {/* Background generic glow effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-600/5 rounded-full blur-[200px] pointer-events-none" />

            <div className="relative z-10 w-full h-full">
                <ScreenerDashboard />
            </div>
        </main>
    );
}
