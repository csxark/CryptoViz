export type FlowDirection = 'INFLOW' | 'OUTFLOW' | 'SWAP' | 'BRIDGE';

export interface WhaleTransaction {
    id: string;
    timestamp: string;
    wallet: string;
    walletLabel?: 'Smart Money' | 'Exchange' | 'Fund' | 'Unknown';
    asset: string;
    amountUSD: number;
    direction: FlowDirection;
    destination?: string;
    txHash: string;
    riskScore: number;
}

// Pseudo-random generator
function mulberry32(a: number) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}
const rand = mulberry32(8888);

const assets = ['WBTC', 'WETH', 'USDT', 'USDC', 'PEPE', 'LINK', 'MKR', 'PENDLE'];
const labels = ['Smart Money', 'Exchange', 'Fund', 'Unknown'];
const exchanges = ['Binance: 14', 'Coinbase 2', 'Kraken Hot Wallet', 'OKX Deposit'];

export const generateWhaleData = (count: number): WhaleTransaction[] => {
    const data: WhaleTransaction[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
        const rx = rand();
        let direction: FlowDirection = 'SWAP';
        if (rx > 0.8) direction = 'INFLOW';
        else if (rx > 0.5) direction = 'OUTFLOW';
        else if (rx > 0.3) direction = 'BRIDGE';

        const baseAmount = (rand() * 9000000) + 500000; // $500k to $9.5M
        const isMegaWhale = rand() > 0.95;
        const finalAmount = isMegaWhale ? baseAmount * (10 + (rand() * 20)) : baseAmount; // Occasional $100M+

        let label = labels[Math.floor(rand() * labels.length)] as any;
        // Overweight Smart Money slightly for analytical graphs
        if (rand() > 0.6) label = 'Smart Money';

        data.push({
            id: `wh-${Math.floor(rand() * 1000000)}`,
            timestamp: new Date(now - (rand() * 86400000 * 7)).toISOString(), // Within last 7 days
            wallet: `0x${Math.floor(rand() * 1e16).toString(16)}...${Math.floor(rand() * 1e4).toString(16)}`,
            walletLabel: label,
            asset: assets[Math.floor(rand() * assets.length)],
            amountUSD: parseFloat(finalAmount.toFixed(2)),
            direction,
            destination: direction === 'OUTFLOW' || direction === 'INFLOW' ? exchanges[Math.floor(rand() * exchanges.length)] : undefined,
            txHash: `0x${Math.floor(rand() * 1e16).toString(16)}`,
            riskScore: Math.floor(rand() * 100)
        });
    }

    // Sort descending by time
    return data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const mockWhaleTransactions = generateWhaleData(150);
