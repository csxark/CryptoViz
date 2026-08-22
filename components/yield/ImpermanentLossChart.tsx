'use client';

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';

interface ILChartProps {
    data: { priceChange: string, ilPercentage: string }[];
}

export const ImpermanentLossChart: React.FC<ILChartProps> = ({ data }) => {
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                    <p className="text-white font-semibold mb-1">Ratio Change: <span className="font-bold text-blue-400">{label}</span></p>
                    <p className="text-sm text-rose-400">
                        Impermanent Loss: <span className="font-bold">{payload[0].value}%</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-[350px] bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[40px]" />

            <h3 className="text-lg font-bold text-white mb-4 relative z-10 flex items-center gap-2">
                Impermanent Loss Curve (Standard AMM)
            </h3>

            <ResponsiveContainer width="100%" height="90%" className="relative z-10">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorIl" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="priceChange" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `${val}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#475569" />
                    <ReferenceLine x="0%" stroke="#475569" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="ilPercentage" stroke="#f43f5e" fillOpacity={1} fill="url(#colorIl)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
