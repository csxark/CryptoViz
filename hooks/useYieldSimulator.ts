import { useState, useMemo } from 'react';
import { LiquidityPool } from '@/lib/mock/yieldData';

export interface ILSimulatorState {
    initialInvestment: number;
    daysStaked: number;
    token0PriceChangePct: number;
    token1PriceChangePct: number;
}

export const useYieldSimulator = (pools: LiquidityPool[]) => {
    const [selectedPoolId, setSelectedPoolId] = useState<string>(pools[0]?.id || '');

    const [simState, setSimState] = useState<ILSimulatorState>({
        initialInvestment: 10000,
        daysStaked: 365,
        token0PriceChangePct: 0,
        token1PriceChangePct: 0
    });

    const selectedPool = useMemo(() => pools.find(p => p.id === selectedPoolId) || pools[0], [selectedPoolId, pools]);

    // Impermanent Loss Formula calculation
    // IL = 2 * sqrt(priceRatio) / (1 + priceRatio) - 1
    const simulatorResults = useMemo(() => {
        if (!selectedPool) return null;

        const r0 = 1 + (simState.token0PriceChangePct / 100);
        const r1 = 1 + (simState.token1PriceChangePct / 100);

        // Price ratio change
        const priceRatio = r1 !== 0 ? r0 / r1 : 0;

        let impermanentLossPct = 0;
        if (priceRatio > 0) {
            impermanentLossPct = (2 * Math.sqrt(priceRatio) / (1 + priceRatio)) - 1;
        }

        // New portfolio value in terms of hold vs LP
        const holdValue = simState.initialInvestment * ((r0 + r1) / 2); // Assuming 50:50 initial distribution
        const lpValue = holdValue * (1 + impermanentLossPct);

        const ilAmountString = (holdValue - lpValue).toFixed(2);

        // Yield Calculations
        const dailyApy = selectedPool.totalApy / 365 / 100;
        const yieldEarned = lpValue * (Math.pow(1 + dailyApy, simState.daysStaked) - 1);

        const finalNetValue = lpValue + yieldEarned;
        const netProfit = finalNetValue - simState.initialInvestment;
        const netRoi = (netProfit / simState.initialInvestment) * 100;

        return {
            holdValue,
            lpValueWithoutYield: lpValue,
            impermanentLossPct: impermanentLossPct * 100,
            impermanentLossUSD: parseFloat(ilAmountString),
            yieldEarned,
            finalNetValue,
            netProfit,
            netRoi,
            dailyRate: dailyApy * 100
        };
    }, [simState, selectedPool]);

    // Generate IL curve data for Recharts chart
    const ilCurveData = useMemo(() => {
        const data = [];
        // from -90% to +500% price change ratio
        for (let i = -0.9; i <= 5; i += 0.2) {
            const pr = 1 + i;
            const ratio = pr; // simplifying relative to token1 being static
            let il = 0;
            if (ratio > 0) {
                il = (2 * Math.sqrt(ratio) / (1 + ratio)) - 1;
            }
            data.push({
                priceChange: `${Math.round(i * 100)}%`,
                ilPercentage: (il * 100).toFixed(2)
            });
        }
        return data;
    }, []);

    return {
        pools,
        selectedPool,
        setSelectedPoolId,
        simState,
        setSimState,
        simulatorResults,
        ilCurveData
    };
};
