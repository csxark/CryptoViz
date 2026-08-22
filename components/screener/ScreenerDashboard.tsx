'use client';

import React, { useMemo } from 'react';
import { useScreenerAnalytics } from '@/hooks/useScreenerAnalytics';
import { generateExtendedMockData, ProtocolData } from '@/lib/mock/screenerData';
import { AssetDataTable } from './AssetDataTable';
import { ScreenerCharts } from './ScreenerCharts';
import { Search, Filter, RefreshCcw, TrendingUp, Activity, BarChart3, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const mockData = generateExtendedMockData(50); // 50 protocols

export const ScreenerDashboard = () => {
    const {
        filteredAndSortedData,
        sortField,
        sortDirection,
        handleSort,
        filters,
        updateFilter,
        toggleCategoryInfo,
        toggleRiskLevel,
        clearFilters,
        analyticsSummary
    } = useScreenerAnalytics(mockData);

    const [isFilterOpen, setIsFilterOpen] = React.useState(false);

    const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-white/5 flex items-start justify-between shadow-lg hover:bg-slate-800/50 transition-colors">
            <div>
                <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
                <h4 className="text-2xl font-bold text-white mb-1">{value}</h4>
                <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
            <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>
                <Icon size={24} />
            </div>
        </div>
    );

    const MetricSummary = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
                title="Total Screened TVL"
                value={`$${(analyticsSummary.totalTvl / 1e9).toFixed(2)}B`}
                subtitle={`Across ${analyticsSummary.totalProtocols} protocols`}
                icon={BarChart3}
                color="blue"
            />
            <StatCard
                title="Average Yield"
                value={`${analyticsSummary.avgYield.toFixed(2)}%`}
                subtitle="Global APY across filtered set"
                icon={TrendingUp}
                color="emerald"
            />
            <StatCard
                title="Avg Sentiment"
                value={`${Math.round(analyticsSummary.avgSentiment)}/100`}
                subtitle="AI-driven social momentum"
                icon={Activity}
                color="purple"
            />
            <StatCard
                title="Dominant Risk"
                value="Medium"
                subtitle="Aggregated security score"
                icon={ShieldCheck}
                color="amber"
            />
        </div>
    );

    const FilterPanel = () => (
        <AnimatePresence>
            {isFilterOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-6"
                >
                    <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-blue-500/20 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Filter size={18} className="text-blue-400" /> Advanced Filters</h3>
                            <button onClick={clearFilters} className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                                <RefreshCcw size={14} /> Reset All
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Categories */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-3">Protocol Category</label>
                                <div className="flex flex-wrap gap-2">
                                    {['DeFi', 'Layer 1', 'Layer 2', 'Gaming', 'Infrastructure', 'NFT'].map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => toggleCategoryInfo(cat as any)}
                                            className={clsx(
                                                "px-3 py-1.5 text-xs rounded-full border transition-all font-medium",
                                                filters.categories.has(cat as any)
                                                    ? "bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                                                    : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
                                            )}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Yield Slider Simulation */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-3">Minimum Yield (APY)</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={filters.minYield || 0}
                                        onChange={(e) => updateFilter('minYield', parseInt(e.target.value))}
                                        className="w-full accent-emerald-500"
                                    />
                                    <div className="bg-slate-800 px-3 py-1 rounded-lg text-emerald-400 font-bold min-w-[60px] text-center border border-slate-700">
                                        {filters.minYield || 0}%+
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Filter protocols requiring high returns.</p>
                            </div>

                            {/* Risk Levels */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-3">Risk Tolerance</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Low', 'Medium', 'High', 'Critical'].map(risk => (
                                        <button
                                            key={risk}
                                            onClick={() => toggleRiskLevel(risk as any)}
                                            className={clsx(
                                                "px-3 py-1.5 text-xs rounded-full border transition-all font-medium flex items-center gap-1",
                                                filters.riskLevels.has(risk as any)
                                                    ? "bg-amber-500 text-white border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                                                    : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
                                            )}
                                        >
                                            {risk}
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="w-full max-w-7xl mx-auto py-8 text-slate-200 fade-in">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-400 to-purple-500 mb-2">
                        Protocol Intelligence Screener
                    </h1>
                    <p className="text-slate-400">Advanced sentiment, yield, and risk discovery engine.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search assets (e.g., Aave, ETH)..."
                            value={filters.searchQuery}
                            onChange={(e) => updateFilter('searchQuery', e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner"
                        />
                    </div>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={clsx(
                            "p-2.5 rounded-xl border transition-all flex items-center justify-center shadow-lg",
                            isFilterOpen
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/50"
                                : "bg-slate-900/50 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-white"
                        )}
                    >
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            <FilterPanel />

            <MetricSummary />

            <ScreenerCharts data={filteredAndSortedData} />

            <AssetDataTable
                data={filteredAndSortedData}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
            />

        </div>
    );
};
