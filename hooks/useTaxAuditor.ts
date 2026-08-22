import { useState, useMemo } from 'react';
import { TaxTransaction } from '@/lib/mock/taxData';

interface CapitalGainEvent {
    txId: string;
    asset: string;
    sellDate: string;
    amountSold: number;
    purchasePrice: number;
    sellPrice: number;
    gainLoss: number;
    term: 'Short' | 'Long';
}

interface TaxDashboardStats {
    totalTaxableEvents: number;
    totalGains: number;
    totalLosses: number;
    netCapitalGains: number;
    incomeFromStaking: number;
    totalFeesPaid: number;
}

export const useTaxAuditor = (ledger: TaxTransaction[]) => {
    const [yearFilter, setYearFilter] = useState<string>('2023');
    const [assetFilter, setAssetFilter] = useState<string>('ALL');

    // Filter the ledger
    const filteredLedger = useMemo(() => {
        return ledger.filter(tx => {
            const yearMatch = yearFilter === 'ALL' || tx.timestamp.startsWith(yearFilter);
            const assetMatch = assetFilter === 'ALL' || tx.asset === assetFilter;
            return yearMatch && assetMatch;
        });
    }, [ledger, yearFilter, assetFilter]);

    // FIFO Calculation Logic (Simplified Mock)
    const { capitalGains, stats } = useMemo(() => {
        const cgEvents: CapitalGainEvent[] = [];
        let totGains = 0;
        let totLosses = 0;
        let stakingInc = 0;
        let fees = 0;

        // Track buys per asset for FIFO
        const inventory: Record<string, { amount: number, price: number, date: string }[]> = {};

        filteredLedger.forEach(tx => {
            fees += tx.feeAmount;

            if (tx.type === 'BUY' || tx.type === 'TRANSFER_IN') {
                if (!inventory[tx.asset]) inventory[tx.asset] = [];
                inventory[tx.asset].push({ amount: tx.amount, price: tx.priceAtExecution, date: tx.timestamp });
            } else if (tx.type === 'STAKING_REWARD' || tx.type === 'AIRDROP') {
                stakingInc += (tx.amount * tx.priceAtExecution);
            } else if (tx.type === 'SELL') {
                let remainingToSell = tx.amount;
                if (inventory[tx.asset]) {
                    while (remainingToSell > 0 && inventory[tx.asset].length > 0) {
                        const lot = inventory[tx.asset][0];
                        const amountSoldFromLot = Math.min(lot.amount, remainingToSell);

                        const gain = amountSoldFromLot * (tx.priceAtExecution - lot.price);
                        if (gain > 0) totGains += gain;
                        else totLosses += gain;

                        // Determine if short or long term (simplified: difference > 365 days)
                        const sellTime = new Date(tx.timestamp).getTime();
                        const buyTime = new Date(lot.date).getTime();
                        const daysDiff = (sellTime - buyTime) / (1000 * 3600 * 24);

                        cgEvents.push({
                            txId: tx.id,
                            asset: tx.asset,
                            sellDate: tx.timestamp,
                            amountSold: amountSoldFromLot,
                            purchasePrice: lot.price,
                            sellPrice: tx.priceAtExecution,
                            gainLoss: gain,
                            term: daysDiff > 365 ? 'Long' : 'Short'
                        });

                        lot.amount -= amountSoldFromLot;
                        remainingToSell -= amountSoldFromLot;

                        if (lot.amount <= 0) {
                            inventory[tx.asset].shift();
                        }
                    }
                }
            }
        });

        const net = totGains + totLosses;

        const statsResult: TaxDashboardStats = {
            totalTaxableEvents: cgEvents.length + filteredLedger.filter(x => x.type === 'STAKING_REWARD' || x.type === 'AIRDROP').length,
            totalGains: totGains,
            totalLosses: Math.abs(totLosses),
            netCapitalGains: net,
            incomeFromStaking: stakingInc,
            totalFeesPaid: fees
        };

        return { capitalGains: cgEvents, stats: statsResult };
    }, [filteredLedger]);

    return {
        filteredLedger,
        capitalGains,
        stats,
        yearFilter,
        setYearFilter,
        assetFilter,
        setAssetFilter,
        availableAssets: Array.from(new Set(ledger.map(t => t.asset))).sort()
    };
};
