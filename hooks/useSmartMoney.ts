import { useState, useMemo } from 'react';
import { WhaleTransaction } from '@/lib/mock/whaleData';

export interface SmartMoneyStats {
    totalVolume: number;
    inflowVolume: number;
    outflowVolume: number;
    netFlow: number; // Inflow - Outflow
    smartMoneyDominance: number; // % of volume by 'Smart Money'
    highestRiskAlerts: number;
}

export const useSmartMoney = (feed: WhaleTransaction[]) => {
    const [minVolumeUSD, setMinVolumeUSD] = useState<number>(0);
    const [assetFilter, setAssetFilter] = useState<string>('ALL');
    const [labelFilter, setLabelFilter] = useState<string>('ALL');

    const filteredFeed = useMemo(() => {
        return feed.filter(tx => {
            const volMatch = tx.amountUSD >= minVolumeUSD;
            const assetMatch = assetFilter === 'ALL' || tx.asset === assetFilter;
            const labelMatch = labelFilter === 'ALL' || tx.walletLabel === labelFilter;
            return volMatch && assetMatch && labelMatch;
        });
    }, [feed, minVolumeUSD, assetFilter, labelFilter]);

    const stats = useMemo(() => {
        let total = 0;
        let inflow = 0;
        let outflow = 0;
        let smVolume = 0;
        let highRiskCount = 0;

        filteredFeed.forEach(tx => {
            total += tx.amountUSD;
            if (tx.direction === 'INFLOW') inflow += tx.amountUSD;
            if (tx.direction === 'OUTFLOW') outflow += tx.amountUSD;

            // If it's a bridge or swap, it still contributes to global volume
            if (tx.walletLabel === 'Smart Money') {
                smVolume += tx.amountUSD;
            }

            if (tx.riskScore > 85) highRiskCount++;
        });

        const net = inflow - outflow;
        const dominance = total > 0 ? (smVolume / total) * 100 : 0;

        return {
            totalVolume: total,
            inflowVolume: inflow,
            outflowVolume: outflow,
            netFlow: net,
            smartMoneyDominance: dominance,
            highestRiskAlerts: highRiskCount
        } as SmartMoneyStats;
    }, [filteredFeed]);

    // Aggregate asset flow for charts
    const assetFlowData = useMemo(() => {
        const agg: Record<string, { asset: string, inflow: number, outflow: number }> = {};
        filteredFeed.forEach(tx => {
            if (!agg[tx.asset]) agg[tx.asset] = { asset: tx.asset, inflow: 0, outflow: 0 };
            if (tx.direction === 'INFLOW') agg[tx.asset].inflow += tx.amountUSD;
            if (tx.direction === 'OUTFLOW') agg[tx.asset].outflow += tx.amountUSD;
        });
        return Object.values(agg).sort((a, b) => (b.inflow + b.outflow) - (a.inflow + a.outflow)).slice(0, 5); // top 5
    }, [filteredFeed]);

    return {
        filteredFeed,
        stats,
        assetFlowData,
        minVolumeUSD,
        setMinVolumeUSD,
        assetFilter,
        setAssetFilter,
        labelFilter,
        setLabelFilter,
        availableAssets: Array.from(new Set(feed.map(x => x.asset))).sort()
    };
};
