export type TransactionType = 'BUY' | 'SELL' | 'STAKING_REWARD' | 'AIRDROP' | 'TRANSFER_IN' | 'TRANSFER_OUT';

export interface TaxTransaction {
    id: string;
    timestamp: string;
    asset: string;
    type: TransactionType;
    amount: number;
    priceAtExecution: number;
    feeAmount: number;
    feeAsset: string;
    walletAddress: string;
    txHash: string;
    isTaxable: boolean;
}

// Deterministic RNG
function mulberry32(a: number) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}
const rand = mulberry32(12345);

const assets = ['ETH', 'BTC', 'USDC', 'SOL', 'UNI', 'AAVE', 'LINK', 'ARB'];
const wallets = ['0x1a2b3c...4d5e', '0x9f8e7d...6c5b'];

export const generateMockTaxData = (count: number): TaxTransaction[] => {
    const data: TaxTransaction[] = [];
    const baseDate = new Date('2023-01-01T00:00:00Z').getTime();

    for (let i = 0; i < count; i++) {
        const rx = rand();
        const asset = assets[Math.floor(rand() * assets.length)];
        let type: TransactionType = 'BUY';

        if (rx > 0.8) type = 'SELL';
        else if (rx > 0.7) type = 'STAKING_REWARD';
        else if (rx > 0.6) type = 'TRANSFER_IN';
        else if (rx > 0.5) type = 'TRANSFER_OUT';
        else if (rx > 0.45) type = 'AIRDROP';

        const isTaxable = ['SELL', 'STAKING_REWARD', 'AIRDROP'].includes(type);

        // Simulate varying prices
        const priceBase = asset === 'BTC' ? 30000 : asset === 'ETH' ? 2000 : asset === 'USDC' ? 1 : 50;
        const price = priceBase * (0.5 + rand());

        // Staking rewards and airdrops are usually small
        let amount = rand() * 10;
        if (type === 'STAKING_REWARD' || type === 'AIRDROP') amount = rand() * 0.5;
        if (asset === 'USDC') amount *= 1000;

        data.push({
            id: `tx-${Math.floor(rand() * 1000000)}`,
            timestamp: new Date(baseDate + (rand() * 31536000000)).toISOString(), // Sometime in 2023
            asset,
            type,
            amount: parseFloat(amount.toFixed(4)),
            priceAtExecution: parseFloat(price.toFixed(2)),
            feeAmount: parseFloat((rand() * 15).toFixed(2)),
            feeAsset: 'ETH',
            walletAddress: wallets[Math.floor(rand() * wallets.length)],
            txHash: `0x${Math.floor(rand() * 1e16).toString(16)}`,
            isTaxable
        });
    }

    // Sort by date ascending to simulate a ledger
    return data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const mockTaxLedger = generateMockTaxData(200);
