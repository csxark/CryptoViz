export type PoolType = 'Volatile' | 'Stable' | 'Correlated';
export type Protocol = 'Uniswap V3' | 'Curve' | 'Balancer' | 'Aave' | 'Compound' | 'PancakeSwap';

export interface LiquidityPool {
    id: string;
    protocol: Protocol;
    pair: string;
    token0: string;
    token1: string;
    type: PoolType;
    tvl: number;
    volume24h: number;
    baseApy: number;
    rewardApy: number;
    totalApy: number;
    token0Price: number;
    token1Price: number;
    riskRating: 'Low' | 'Medium' | 'High' | 'Degen';
}

function mulberry32(a: number) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}
const rand = mulberry32(777);

const protocols: Protocol[] = ['Uniswap V3', 'Curve', 'Balancer', 'Aave', 'Compound', 'PancakeSwap'];
const pairs = [
    { t0: 'ETH', t1: 'USDC', type: 'Volatile' },
    { t0: 'WBTC', t1: 'ETH', type: 'Correlated' },
    { t0: 'USDT', t1: 'USDC', type: 'Stable' },
    { t0: 'LINK', t1: 'ETH', type: 'Volatile' },
    { t0: 'ARB', t1: 'ETH', type: 'Volatile' },
    { t0: 'DAI', t1: 'USDC', type: 'Stable' },
    { t0: 'stETH', t1: 'ETH', type: 'Correlated' },
    { t0: 'UNI', t1: 'ETH', type: 'Volatile' },
    { t0: 'PEPE', t1: 'WETH', type: 'Volatile' },
    { t0: 'SOL', t1: 'USDT', type: 'Volatile' }
];

export const generateLiquidityPools = (count: number): LiquidityPool[] => {
    const data: LiquidityPool[] = [];

    for (let i = 0; i < count; i++) {
        const pairInfo = pairs[Math.floor(rand() * pairs.length)];
        const protocol = protocols[Math.floor(rand() * protocols.length)];

        const tvl = (rand() * 100000000) + 1000000;

        let baseApy = (rand() * 15) + 0.1;
        let rewardApy = (rand() * 30);

        if (pairInfo.type === 'Stable') {
            baseApy = (rand() * 5) + 1;
            rewardApy = (rand() * 5);
        } else if (pairInfo.t0 === 'PEPE') {
            baseApy = (rand() * 50) + 20;
            rewardApy = (rand() * 100) + 50;
        }

        const totalApy = baseApy + rewardApy;

        let riskRating: LiquidityPool['riskRating'] = 'Medium';
        if (pairInfo.type === 'Stable' && protocol !== 'PancakeSwap') riskRating = 'Low';
        if (totalApy > 50 || pairInfo.t0 === 'PEPE') riskRating = 'High';
        if (totalApy > 150) riskRating = 'Degen';

        // Mock initial prices
        let p0 = 1; let p1 = 1;
        if (pairInfo.t0 === 'ETH' || pairInfo.t1 === 'ETH') {
            if (pairInfo.t0 === 'ETH') p0 = 2500, p1 = 1;
            else p1 = 2500, p0 = 1;
        }
        if (pairInfo.t0 === 'WBTC') p0 = 60000, p1 = 2500;
        if (pairInfo.t0 === 'SOL') p0 = 150, p1 = 1;
        if (pairInfo.t0 === 'LINK') p0 = 15, p1 = 2500;

        data.push({
            id: `pool-${i}-${pairInfo.t0}-${pairInfo.t1}`,
            protocol,
            pair: `${pairInfo.t0}-${pairInfo.t1}`,
            token0: pairInfo.t0,
            token1: pairInfo.t1,
            type: pairInfo.type as PoolType,
            tvl,
            volume24h: tvl * (rand() * 0.4),
            baseApy: parseFloat(baseApy.toFixed(2)),
            rewardApy: parseFloat(rewardApy.toFixed(2)),
            totalApy: parseFloat(totalApy.toFixed(2)),
            token0Price: p0,
            token1Price: p1,
            riskRating
        });
    }

    return data.sort((a, b) => b.tvl - a.tvl);
};

export const mockPools = generateLiquidityPools(50);
