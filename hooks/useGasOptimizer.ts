import { useState, useMemo } from 'react';
import { ChainNetwork, BridgeRoute } from '@/lib/mock/gasData';

export const useGasOptimizer = (networks: ChainNetwork[], routes: BridgeRoute[]) => {
    const [sourceFilter, setSourceFilter] = useState<string>('ALL');
    const [targetFilter, setTargetFilter] = useState<string>('ALL');
    const [maxFee, setMaxFee] = useState<number>(30); // max acceptable fee in USD

    const filteredRoutes = useMemo(() => {
        return routes.filter(r => {
            const pSource = sourceFilter === 'ALL' || r.sourceChain === sourceFilter;
            const pTarget = targetFilter === 'ALL' || r.targetChain === targetFilter;
            const pFee = r.feeUSD <= maxFee;
            return pSource && pTarget && pFee;
        });
    }, [routes, sourceFilter, targetFilter, maxFee]);

    const networkStats = useMemo(() => {
        const l1AvgSwap = networks.filter(n => n.type === 'L1').reduce((a, b) => a + b.swapCostUSD, 0) / networks.filter(n => n.type === 'L1').length;
        const l2AvgSwap = networks.filter(n => n.type === 'L2').reduce((a, b) => a + b.swapCostUSD, 0) / networks.filter(n => n.type === 'L2').length;

        // Find optimal path (if both src/target set)
        let bestRoute: BridgeRoute | null = null;
        if (sourceFilter !== 'ALL' && targetFilter !== 'ALL') {
            const candidates = filteredRoutes.filter(r => r.sourceChain === sourceFilter && r.targetChain === targetFilter);
            if (candidates.length > 0) {
                bestRoute = candidates.sort((a, b) => a.feeUSD - b.feeUSD)[0];
            }
        }

        return {
            l1AvgSwap,
            l2AvgSwap,
            cheapestNetwork: networks.reduce((prev, curr) => (prev.swapCostUSD < curr.swapCostUSD ? prev : curr)).name,
            bestRoute
        };
    }, [networks, filteredRoutes, sourceFilter, targetFilter]);

    // Data mapping for Recharts visualization of Gas over time
    // Mocks a historical 24h trailing data frame based on current metric constraints
    const getHistoricalGasData = () => {
        const history: any[] = [];
        const baseHour = new Date().getHours() - 24;

        for (let i = 0; i <= 24; i++) {
            let entry: any = { hour: `${baseHour + i > 23 ? baseHour + i - 24 : baseHour + i}:00` };
            networks.forEach(n => {
                // Apply randomized sine wave modifier for realistic curves
                const modifier = 1 + (Math.sin(i / 3) * 0.5) + (Math.random() * 0.2 - 0.1);
                entry[n.name] = parseFloat((n.currentGasGwei * modifier).toFixed(2));
            });
            history.push(entry);
        }
        return history;
    };

    const historicalGas = useMemo(() => getHistoricalGasData(), [networks]);

    return {
        networks: networks.sort((a, b) => a.swapCostUSD - b.swapCostUSD),
        routes: filteredRoutes,
        stats: networkStats,
        historicalGas,
        sourceFilter,
        setSourceFilter,
        targetFilter,
        setTargetFilter,
        maxFee,
        setMaxFee,
        availableChains: Array.from(new Set(networks.map(n => n.name))).sort()
    };
};
