export type TransactionType = 'BUY' | 'SELL' | 'AIRDROP';

export interface Transaction {
  id: string;
  asset: string;
  type: TransactionType;
  amount: number;
  pricePerUnit: number; // In USD
  timestamp: string; // ISO Date String
}

export interface TaxLot {
  amount: number;
  costBasisPerUnit: number;
  dateAcquired: Date;
}

export interface TaxEvent {
  asset: string;
  dateAcquired: string;
  dateSold: string;
  amount: number;
  proceeds: number;
  costBasis: number;
  gainLoss: number;
  term: 'SHORT' | 'LONG' | 'INCOME';
}

export class FifoTaxCalculator {
  /**
   * Processes a chronological array of transactions and returns a detailed array of Tax Events
   * utilizing a strict First-In-First-Out (FIFO) cost basis queue.
   */
  static calculateLiability(transactions: Transaction[]): TaxEvent[] {
    const taxEvents: TaxEvent[] = [];
    
    // A map of Asset Symbol to a Queue of TaxLots
    const inventory = new Map<string, TaxLot[]>();

    // Sort transactions strictly by time to ensure FIFO validity
    const sortedTx = [...transactions].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const tx of sortedTx) {
      if (!inventory.has(tx.asset)) {
        inventory.set(tx.asset, []);
      }
      
      const lotQueue = inventory.get(tx.asset)!;

      if (tx.type === 'BUY') {
        lotQueue.push({
          amount: tx.amount,
          costBasisPerUnit: tx.pricePerUnit,
          dateAcquired: new Date(tx.timestamp)
        });
      } 
      
      else if (tx.type === 'AIRDROP') {
        // Airdrops have a $0 cost basis but instantly trigger Ordinary Income for the current fair market value
        taxEvents.push({
          asset: tx.asset,
          dateAcquired: tx.timestamp,
          dateSold: tx.timestamp,
          amount: tx.amount,
          proceeds: tx.amount * tx.pricePerUnit, // Taxed as income at current FMV
          costBasis: 0,
          gainLoss: tx.amount * tx.pricePerUnit,
          term: 'INCOME'
        });

        // Add to inventory with $0 cost basis for future sells
        lotQueue.push({
          amount: tx.amount,
          costBasisPerUnit: 0,
          dateAcquired: new Date(tx.timestamp)
        });
      } 
      
      else if (tx.type === 'SELL') {
        let remainingAmountToSell = tx.amount;
        const sellDate = new Date(tx.timestamp);

        while (remainingAmountToSell > 0 && lotQueue.length > 0) {
          const oldestLot = lotQueue[0];
          
          // Determine how much we can sell from this specific lot
          const amountFromLot = Math.min(oldestLot.amount, remainingAmountToSell);
          
          const proceeds = amountFromLot * tx.pricePerUnit;
          const costBasis = amountFromLot * oldestLot.costBasisPerUnit;
          const gainLoss = proceeds - costBasis;

          // Determine Short Term (< 1yr) vs Long Term (> 1yr)
          const msInYear = 1000 * 60 * 60 * 24 * 365;
          const isLongTerm = (sellDate.getTime() - oldestLot.dateAcquired.getTime()) > msInYear;

          taxEvents.push({
            asset: tx.asset,
            dateAcquired: oldestLot.dateAcquired.toISOString(),
            dateSold: sellDate.toISOString(),
            amount: amountFromLot,
            proceeds,
            costBasis,
            gainLoss,
            term: isLongTerm ? 'LONG' : 'SHORT'
          });

          // Mutate the queue
          remainingAmountToSell -= amountFromLot;
          oldestLot.amount -= amountFromLot;

          // If the lot is exhausted, remove it from the front of the queue
          if (oldestLot.amount === 0) {
            lotQueue.shift();
          }
        }

        if (remainingAmountToSell > 0) {
          // In a real app, this indicates missing cost basis data or selling assets transferred from another wallet.
          console.warn(\`Insufficient cost basis found for \${tx.asset}. Sold \${remainingAmountToSell} without a known acquisition cost.\`);
        }
      }
    }

    return taxEvents;
  }
}
