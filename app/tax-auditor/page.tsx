import React from 'react';
import { TaxDashboard } from '@/components/tax/TaxDashboard';

export const metadata = {
    title: 'DeFi Portfolio Tax Auditor | CryptoViz',
    description: 'Automated workflow for establishing tax liabilities over DeFi transactions.',
};

export default function TaxAuditorPage() {
    return (
        <main className="min-h-screen bg-[#0a0f1c] p-4 md:p-8 relative">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-rose-600/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none" />

            <div className="relative z-10 w-full h-full">
                <TaxDashboard />
            </div>
        </main>
    );
}
