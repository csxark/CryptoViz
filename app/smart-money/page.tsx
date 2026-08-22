import React from 'react';
import { WhaleDashboard } from '@/components/whale/WhaleDashboard';

export const metadata = {
    title: 'Smart Money & Whale Tracker | CryptoViz',
    description: 'Deep surveillance of high-net-worth wallets, institutional exchange flows, and algorithmic risk identification.',
};

export default function SmartMoneyPage() {
    return (
        <main className="min-h-screen bg-slate-950 p-4 md:p-8 relative overflow-hidden">
            {/* Dynamic ambient background glow */}
            <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute top-1/2 -right-64 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[200px] pointer-events-none" />

            <div className="relative z-10 w-full h-full">
                <WhaleDashboard />
            </div>
        </main>
    );
}
