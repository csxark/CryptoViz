'use client';

import React from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ZAxis,
    Cell
} from 'recharts';
import { ProtocolData } from '@/lib/mock/screenerData';

interface ScreenerChartsProps {
    data: ProtocolData[];
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as ProtocolData;
        return (
            <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-2 mb-2">
                    <p className="text-white font-bold text-lg">{data.name}</p>
                    <span className="text-slate-400 text-xs px-2 py-1 bg-slate-800 rounded-full">{data.symbol}</span>
                </div>
                <div className="space-y-1 text-sm">
                    <p className="text-slate-300">
                        TVL: <span className="font-semibold text-emerald-400">${(data.tvl / 1000000).toFixed(2)}M</span>
                    </p>
                    <p className="text-slate-300">
                        Yield: <span className="font-semibold text-blue-400">{data.yieldPercentage.toFixed(2)}%</span>
                    </p>
                    <p className="text-slate-300">
                        Sentiment: <span className="font-semibold text-purple-400">{data.sentimentScore}</span>
                    </p>
                    <p className="text-slate-300">
                        Risk: <span className={`font-semibold ${data.riskLevel === 'Low' ? 'text-emerald-400' : data.riskLevel === 'Critical' ? 'text-red-500' : 'text-amber-400'}`}>
                            {data.riskLevel}
                        </span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export const ScreenerCharts: React.FC<ScreenerChartsProps> = ({ data }) => {
    if (data.length === 0) {
        return (
            <div className="w-full h-80 flex items-center justify-center bg-slate-900/50 rounded-2xl border border-slate-800">
                <p className="text-slate-500">No data available for visualization.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-[400px] bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-2xl">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">Yield vs Sentiment Analysis</span>
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                        type="number"
                        dataKey="sentimentScore"
                        name="Sentiment"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8' }}
                        domain={[0, 100]}
                        label={{ value: 'Sentiment Score', position: 'bottom', fill: '#94a3b8' }}
                    />
                    <YAxis
                        type="number"
                        dataKey="yieldPercentage"
                        name="Yield (%)"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8' }}
                        label={{ value: 'Yield (APY %)', angle: -90, position: 'left', fill: '#94a3b8' }}
                    />
                    <ZAxis type="number" dataKey="tvl" range={[100, 1000]} name="TVL" />
                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#475569' }} />

                    <Scatter name="Protocols" data={data}>
                        {data.map((entry, index) => {
                            // Color based on risk level
                            let fill = '#3b82f6'; // blue-500
                            if (entry.riskLevel === 'Low') fill = '#10b981'; // emerald-500
                            if (entry.riskLevel === 'High') fill = '#f59e0b'; // amber-500
                            if (entry.riskLevel === 'Critical') fill = '#ef4444'; // red-500

                            return <Cell key={`cell-${index}`} fill={fill} fillOpacity={0.7} />;
                        })}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
};
