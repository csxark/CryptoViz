'use client';

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

interface TaxChartsProps {
    stats: any;
    capitalGains: any[];
}

export const TaxCharts: React.FC<TaxChartsProps> = ({ stats, capitalGains }) => {
    // Aggregate data by month for the chart
    const monthlyData = capitalGains.reduce((acc: any, curr) => {
        const month = new Date(curr.sellDate).toLocaleString('default', { month: 'short' });
        if (!acc[month]) {
            acc[month] = { name: month, Gains: 0, Losses: 0 };
        }
        if (curr.gainLoss > 0) acc[month].Gains += curr.gainLoss;
        else acc[month].Losses += Math.abs(curr.gainLoss);
        return acc;
    }, {});

    const chartData = Object.values(monthlyData);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                    <p className="text-white font-semibold mb-2">{label}</p>
                    {payload.map((p: any, i: number) => (
                        <p key={i} className={`text-sm ${p.name === 'Gains' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {p.name}: <span className="font-bold">${p.value.toFixed(2)}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-slate-200 mb-6 font-mono">Monthly Realized Gains & Losses (FIFO)</h3>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickFormatter={(value) => `$${value}`} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar dataKey="Gains" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            <Bar dataKey="Losses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-center">
                <h3 className="text-lg font-bold text-slate-200 mb-6 font-mono border-b border-white/5 pb-4">Estimated Tax Liability</h3>
                <div className="space-y-6">
                    <div>
                        <p className="text-sm text-slate-400 mb-1">Effective Capital Gains Tax (est. 15%)</p>
                        <p className="text-3xl font-extrabold text-orange-400">${(Math.max(0, stats.netCapitalGains) * 0.15).toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-400 mb-1">Ordinary Income Tax (Staking/Airdrops est. 22%)</p>
                        <p className="text-2xl font-bold text-emerald-400">${(stats.incomeFromStaking * 0.22).toFixed(2)}</p>
                    </div>
                    <div className="pt-4 border-t border-white/5">
                        <p className="text-sm text-slate-400 mb-1">Total Estimated Due</p>
                        <p className="text-4xl font-black text-rose-500">${((Math.max(0, stats.netCapitalGains) * 0.15) + (stats.incomeFromStaking * 0.22)).toFixed(2)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
