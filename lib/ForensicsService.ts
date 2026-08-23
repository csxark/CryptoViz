/**
 * Blockchain Forensics Service.
 * Generates mock data and provides query/simulation logic.
 */

import {
  AddressProfile,
  TransactionTrace,
  TracePath,
  ForensicsAlert,
  Investigation,
  ForensicsFilterOptions,
  ForensicsStats,
} from './ForensicsModel';

function generateHash(): string {
  return '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomAddress(): string {
  return '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

const SEED_ADDRESSES: AddressProfile[] = [
  { id: 'addr-1', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', chain: 'Ethereum', label: 'Vitalik Buterin', riskCategory: 'exchange', riskScore: 5, totalInflowUsd: 125000000, totalOutflowUsd: 98000000, balanceUsd: 27000000, transactionCount: 4521, firstSeen: '2015-07-30T00:00:00Z', lastSeen: '2025-08-24T10:00:00Z', isContract: false, tags: ['public-figure', 'ethereum-founder'], associatedEntities: ['Ethereum Foundation'] },
  { id: 'addr-2', address: '0x28C6c06298d514Db089934071355E5743bf21d60', chain: 'Ethereum', label: 'Binance Hot Wallet', riskCategory: 'exchange', riskScore: 12, totalInflowUsd: 8500000000, totalOutflowUsd: 8200000000, balanceUsd: 300000000, transactionCount: 892450, firstSeen: '2019-01-15T00:00:00Z', lastSeen: '2025-08-24T11:00:00Z', isContract: false, tags: ['exchange', 'hot-wallet'], associatedEntities: ['Binance'] },
  { id: 'addr-3', address: '0xA9D1e08C7793af67e9d92fe308d5697FB81d3E43', chain: 'Ethereum', label: 'Tornado Cash Router', riskCategory: 'mixer', riskScore: 92, totalInflowUsd: 4200000000, totalOutflowUsd: 4150000000, balanceUsd: 50000000, transactionCount: 124500, firstSeen: '2019-08-06T00:00:00Z', lastSeen: '2025-08-24T08:00:00Z', isContract: true, tags: ['mixer', 'sanctioned', 'privacy'], associatedEntities: ['Tornado Cash'] },
  { id: 'addr-4', address: '0x111111111117dC0aa78b770fA6A738034120C302', chain: 'Ethereum', label: '1inch Router', riskCategory: 'defi', riskScore: 8, totalInflowUsd: 670000000, totalOutflowUsd: 665000000, balanceUsd: 5000000, transactionCount: 345000, firstSeen: '2020-06-15T00:00:00Z', lastSeen: '2025-08-24T11:15:00Z', isContract: true, tags: ['dex-aggregator', 'defi'], associatedEntities: ['1inch'] },
  { id: 'addr-5', address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', chain: 'Bitcoin', label: 'Known Scam Wallet', riskCategory: 'scam', riskScore: 95, totalInflowUsd: 12000000, totalOutflowUsd: 11800000, balanceUsd: 200000, transactionCount: 2450, firstSeen: '2023-01-10T00:00:00Z', lastSeen: '2025-08-20T14:00:00Z', isContract: false, tags: ['scam', 'phishing'], associatedEntities: [] },
  { id: 'addr-6', address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78', chain: 'Ethereum', label: 'Bitfinex Cold Wallet', riskCategory: 'exchange', riskScore: 10, totalInflowUsd: 3200000000, totalOutflowUsd: 3100000000, balanceUsd: 100000000, transactionCount: 156000, firstSeen: '2016-05-20T00:00:00Z', lastSeen: '2025-08-24T09:00:00Z', isContract: false, tags: ['exchange', 'cold-wallet'], associatedEntities: ['Bitfinex'] },
  { id: 'addr-7', address: '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', chain: 'Ethereum', label: 'Binance Cold Wallet 7', riskCategory: 'exchange', riskScore: 11, totalInflowUsd: 5600000000, totalOutflowUsd: 5400000000, balanceUsd: 200000000, transactionCount: 234000, firstSeen: '2017-11-28T00:00:00Z', lastSeen: '2025-08-24T10:30:00Z', isContract: false, tags: ['exchange', 'cold-wallet'], associatedEntities: ['Binance'] },
  { id: 'addr-8', address: 'bc1q42lja79elem0anu8q860g3...example', chain: 'Bitcoin', label: 'Ransomware Payout Wallet', riskCategory: 'ransomware', riskScore: 98, totalInflowUsd: 8500000, totalOutflowUsd: 8400000, balanceUsd: 100000, transactionCount: 342, firstSeen: '2024-03-15T00:00:00Z', lastSeen: '2025-08-18T22:00:00Z', isContract: false, tags: ['ransomware', 'illicit'], associatedEntities: ['LockBit'] },
];

const SEED_TRANSACTIONS: TransactionTrace[] = [
  { id: 'tx-1', txHash: generateHash(), chain: 'Ethereum', fromAddress: '0x28C6c...', fromLabel: 'Binance Hot Wallet', toAddress: '0xA9D1e...', toLabel: 'Tornado Cash Router', valueUsd: 1500000, valueToken: 500, tokenSymbol: 'ETH', gasUsed: 21000, gasPriceGwei: 25, blockNumber: 20150000, timestamp: '2025-08-24T10:30:00Z', riskFlags: ['mixer-interaction', 'high-value'], traceDepth: 1, isSuspicious: true },
  { id: 'tx-2', txHash: generateHash(), chain: 'Ethereum', fromAddress: '0xA9D1e...', fromLabel: 'Tornado Cash Router', toAddress: randomAddress(), toLabel: 'Unknown', valueUsd: 1480000, valueToken: 495, tokenSymbol: 'ETH', gasUsed: 65000, gasPriceGwei: 28, blockNumber: 20150010, timestamp: '2025-08-24T10:35:00Z', riskFlags: ['mixer-output', 'privacy-route'], traceDepth: 2, isSuspicious: true },
  { id: 'tx-3', txHash: generateHash(), chain: 'Ethereum', fromAddress: '0x11111...', fromLabel: '1inch Router', toAddress: '0x28C6c...', toLabel: 'Binance Hot Wallet', valueUsd: 50000, valueToken: 16.5, tokenSymbol: 'ETH', gasUsed: 185000, gasPriceGwei: 22, blockNumber: 20149950, timestamp: '2025-08-24T09:15:00Z', riskFlags: [], traceDepth: 1, isSuspicious: false },
  { id: 'tx-4', txHash: generateHash(), chain: 'Bitcoin', fromAddress: 'bc1qar...', fromLabel: 'Known Scam Wallet', toAddress: 'bc1q42...', toLabel: 'Ransomware Payout', valueUsd: 250000, valueToken: 4.2, tokenSymbol: 'BTC', gasUsed: 0, gasPriceGwei: 0, blockNumber: 855000, timestamp: '2025-08-24T08:00:00Z', riskFlags: ['scam-to-ransomware', 'illicit-flow'], traceDepth: 1, isSuspicious: true },
  { id: 'tx-5', txHash: generateHash(), chain: 'Ethereum', fromAddress: '0xBE0eb...', fromLabel: 'Binance Cold Wallet 7', toAddress: '0x28C6c...', toLabel: 'Binance Hot Wallet', valueUsd: 50000000, valueToken: 16400, tokenSymbol: 'USDT', gasUsed: 65000, gasPriceGwei: 20, blockNumber: 20149900, timestamp: '2025-08-24T07:00:00Z', riskFlags: [], traceDepth: 1, isSuspicious: false },
];

const SEED_ALERTS: ForensicsAlert[] = [
  { id: 'alert-1', title: 'High-Value Mixer Interaction', description: 'Binance Hot Wallet sent $1.5M to Tornado Cash Router', severity: 'critical', chain: 'Ethereum', address: '0xA9D1e...', txHash: generateHash().slice(0, 20), riskCategory: 'mixer', riskScore: 92, triggeredAt: '2025-08-24T10:32:00Z', status: 'active' },
  { id: 'alert-2', title: 'Scam-to-Ransomware Flow Detected', description: 'Known scam wallet transferred 4.2 BTC to ransomware payout address', severity: 'critical', chain: 'Bitcoin', address: 'bc1qar...', riskCategory: 'ransomware', riskScore: 98, triggeredAt: '2025-08-24T08:05:00Z', status: 'active' },
  { id: 'alert-3', title: 'Sanctioned Address Interaction', description: 'Contract interacting with OFAC-sanctioned Tornado Cash', severity: 'high', chain: 'Ethereum', address: '0xA9D1e...', riskCategory: 'sanctioned', riskScore: 95, triggeredAt: '2025-08-24T10:35:00Z', status: 'acknowledged', acknowledgedBy: 'analyst-1', acknowledgedAt: '2025-08-24T10:40:00Z' },
  { id: 'alert-4', title: 'Unusual Large Withdrawal', description: 'Bitfinex cold wallet moved $50M to hot wallet — verify authorization', severity: 'medium', chain: 'Ethereum', address: '0x742d3...', riskCategory: 'exchange', riskScore: 45, triggeredAt: '2025-08-24T09:00:00Z', status: 'active' },
  { id: 'alert-5', title: 'Rapid Fund Movement Pattern', description: 'Multiple rapid transfers from unknown wallets through DEX aggregator', severity: 'high', chain: 'Ethereum', riskCategory: 'unknown', riskScore: 72, triggeredAt: '2025-08-24T06:00:00Z', status: 'resolved' },
  { id: 'alert-6', title: 'New High-Risk Address Contact', description: 'Previously clean address received funds from scam-labeled wallet', severity: 'medium', chain: 'Ethereum', address: randomAddress().slice(0, 18), riskCategory: 'scam', riskScore: 68, triggeredAt: '2025-08-23T22:00:00Z', status: 'active' },
];

const SEED_INVESTIGATIONS: Investigation[] = [
  { id: 'inv-1', caseNumber: 'FNC-2025-001', title: 'Tornado Cash Laundering Investigation', description: 'Trace $1.5M flow from Binance through Tornado Cash to unknown endpoints', status: 'IN_PROGRESS', priority: 'P1', leadAnalyst: 'Sarah Chen', assignedTo: ['Sarah Chen', 'Mike Ross'], relatedAddresses: ['0xA9D1e...', '0x28C6c...'], relatedTxHashes: [], chain: 'Ethereum', riskScore: 92, createdAt: '2025-08-24T10:45:00Z', updatedAt: '2025-08-24T11:00:00Z', alertCount: 2 },
  { id: 'inv-2', caseNumber: 'FNC-2025-002', title: 'Ransomware Payment Trace', description: 'Investigate BTC flow from scam wallet to known ransomware infrastructure', status: 'OPEN', priority: 'P1', leadAnalyst: 'James Wilson', assignedTo: ['James Wilson'], relatedAddresses: ['bc1qar...', 'bc1q42...'], relatedTxHashes: [], chain: 'Bitcoin', riskScore: 98, createdAt: '2025-08-24T08:30:00Z', updatedAt: '2025-08-24T08:30:00Z', alertCount: 1 },
  { id: 'inv-3', caseNumber: 'FNC-2025-003', title: 'Exchange Compliance Review', description: 'Review unusual $50M internal transfer at Bitfinex', status: 'CLOSED', priority: 'P2', leadAnalyst: 'Sarah Chen', assignedTo: ['Sarah Chen'], relatedAddresses: ['0x742d3...'], relatedTxHashes: [], chain: 'Ethereum', riskScore: 45, createdAt: '2025-08-24T09:10:00Z', updatedAt: '2025-08-24T09:45:00Z', closedAt: '2025-08-24T09:45:00Z', findings: 'Confirmed authorized internal fund movement for cold-to-hot wallet rebalancing.', alertCount: 1 },
];

let addresses: AddressProfile[] = [...SEED_ADDRESSES];
let transactions: TransactionTrace[] = [...SEED_TRANSACTIONS];
let alerts: ForensicsAlert[] = [...SEED_ALERTS];
let investigations: Investigation[] = [...SEED_INVESTIGATIONS];

function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const ForensicsServiceHandler = {
  fetchAddresses(filters: ForensicsFilterOptions): AddressProfile[] {
    let result = [...addresses];
    if (filters.chain !== 'All') result = result.filter(a => a.chain === filters.chain);
    if (filters.riskCategory !== 'All') result = result.filter(a => a.riskCategory === filters.riskCategory);
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(a => a.label.toLowerCase().includes(q) || a.address.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q)));
    }
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'risk': return b.riskScore - a.riskScore;
        case 'value': return b.totalInflowUsd - a.totalInflowUsd;
        case 'time': return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
        case 'name': return a.label.localeCompare(b.label);
        default: return 0;
      }
    });
    return result;
  },

  fetchTransactions(): TransactionTrace[] { return [...transactions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); },
  fetchAlerts(): ForensicsAlert[] { return [...alerts].sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()); },
  fetchInvestigations(): Investigation[] { return [...investigations].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()); },

  getTotalStats(): ForensicsStats {
    return {
      totalAddresses: addresses.length,
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter(a => a.status === 'active').length,
      totalInvestigations: investigations.length,
      openInvestigations: investigations.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length,
      totalTraces: transactions.length,
      avgRiskScore: Math.round(alerts.reduce((s, a) => s + a.riskScore, 0) / alerts.length),
      suspiciousTxCount: transactions.filter(t => t.isSuspicious).length,
    };
  },

  acknowledgeAlert(alertId: string, analyst: string): void {
    const alert = alerts.find(a => a.id === alertId);
    if (alert) { alert.status = 'acknowledged'; alert.acknowledgedBy = analyst; alert.acknowledgedAt = new Date().toISOString(); }
  },

  resolveAlert(alertId: string): void {
    const alert = alerts.find(a => a.id === alertId);
    if (alert) { alert.status = 'resolved'; }
  },

  createInvestigation(title: string, description: string, priority: 'P1' | 'P2' | 'P3' | 'P4', analyst: string): Investigation {
    const inv: Investigation = {
      id: generateId(), caseNumber: `FNC-2025-${String(investigations.length + 1).padStart(3, '0')}`,
      title, description, status: 'OPEN', priority, leadAnalyst: analyst, assignedTo: [analyst],
      relatedAddresses: [], relatedTxHashes: [], chain: 'Ethereum', riskScore: 50,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), alertCount: 0,
    };
    investigations.push(inv);
    return inv;
  },
};
