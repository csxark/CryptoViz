export interface WhaleEvent {
  id: string;
  txHash: string;
  asset: string;
  amount: number;
  valueUsd: number;
  fromAddress: string;
  toAddress: string;
  timestamp: string;
  type: 'DUMP_ALERT' | 'ACCUMULATION_ALERT' | 'UNKNOWN';
  cexName: string | null;
}

// Mock dictionary of known Centralized Exchange Hot/Cold Wallets
const KNOWN_CEX_WALLETS: Record<string, string> = {
  '0xBinanceHotWallet123': 'Binance',
  '0xCoinbaseColdStorage456': 'Coinbase',
  '0xKrakenTreasury789': 'Kraken',
  '0xKucoinReserve000': 'KuCoin'
};

const WHALE_THRESHOLD_USD = 10_000_000; // $10 Million

export class WhaleTracker {
  private listeners: ((event: WhaleEvent) => void)[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Subscribes a callback to the high-frequency blockchain WebSocket stream.
   * Returns an unsubscribe function.
   */
  subscribe(callback: (event: WhaleEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Starts the simulation of a Web3 WebSocket (e.g. eth_subscribe 'pending')
   */
  startStream() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Simulate high-frequency mempool activity (multiple txs per second)
    this.intervalId = setInterval(() => {
      this.processRawTransaction(this.generateMockTransaction());
    }, 800); // Emits every 800ms
  }

  /**
   * Stops the WebSocket stream
   */
  stopStream() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Core filtering logic: Ingests a raw transaction, calculates USD value,
   * checks against CEX dictionaries, and emits if it breaches the Whale Threshold.
   */
  private processRawTransaction(rawTx: any) {
    // 1. Filter out standard retail noise
    if (rawTx.valueUsd < WHALE_THRESHOLD_USD) {
      return; // Silently drop
    }

    // 2. Identify if moving TO or FROM a known CEX
    const isToCex = KNOWN_CEX_WALLETS[rawTx.toAddress];
    const isFromCex = KNOWN_CEX_WALLETS[rawTx.fromAddress];

    let type: WhaleEvent['type'] = 'UNKNOWN';
    let cexName: string | null = null;

    if (isToCex) {
      // Moving TO an exchange indicates an intent to sell (Dump)
      type = 'DUMP_ALERT';
      cexName = isToCex;
    } else if (isFromCex) {
      // Moving FROM an exchange indicates accumulation (Cold Storage)
      type = 'ACCUMULATION_ALERT';
      cexName = isFromCex;
    } else {
      // Massive transfer between unknown whales (OTC or DeFi)
      return; // We only care about exchange flow for this feature
    }

    // 3. Emit the parsed, high-priority Whale Event to the UI
    const event: WhaleEvent = {
      ...rawTx,
      type,
      cexName,
      timestamp: new Date().toISOString()
    };

    this.listeners.forEach(cb => cb(event));
  }

  // --- Simulation Utilities ---

  private generateMockTransaction() {
    // Generates mostly small transactions, but occasionally spikes a massive one
    const isWhale = Math.random() > 0.85; // 15% chance to be a whale for demo purposes
    const isEth = Math.random() > 0.5;
    
    const asset = isEth ? 'ETH' : 'BTC';
    const price = isEth ? 2500 : 50000;
    const amount = isWhale ? (Math.random() * 1000 + 400) : (Math.random() * 5);
    const valueUsd = amount * price;

    const addresses = [
      '0xBinanceHotWallet123',
      '0xCoinbaseColdStorage456',
      '0xUnknownRetailWallet999',
      '0xDeFiSmartContract777',
      '0xKrakenTreasury789'
    ];

    return {
      id: Math.random().toString(36).substring(7),
      txHash: '0x' + Math.random().toString(16).substring(2).padEnd(64, '0'),
      asset,
      amount,
      valueUsd,
      fromAddress: addresses[Math.floor(Math.random() * addresses.length)],
      toAddress: addresses[Math.floor(Math.random() * addresses.length)],
    };
  }
}

// Export a singleton instance
export const whaleTrackerEngine = new WhaleTracker();
