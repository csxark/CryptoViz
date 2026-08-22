export interface ProtocolData {
  id: string;
  name: string;
  symbol: string;
  category: 'DeFi' | 'Layer 1' | 'Layer 2' | 'Gaming' | 'Infrastructure' | 'NFT';
  tvl: number; // Total Value Locked in USD
  yieldPercentage: number; // APY/APR in percentage
  marketCap: number;
  volume24h: number;
  sentimentScore: number; // 0 to 100, where 100 is extremely bullish
  volatilityIndex: number; // 0 to 100
  auditStatus: 'Audited' | 'Partial' | 'Unaudited';
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  sparkline: number[]; // Array of last 7 days prices or index
}

// Deterministic random generation for consistent UI rendering
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

const rand = mulberry32(42); // Seed

const generateSparkline = (basePrice: number, volatility: number, length = 7): number[] => {
  const line = [basePrice];
  let currentPrice = basePrice;
  for (let i = 1; i < length; i++) {
    const changePercent = (rand() - 0.5) * (volatility / 100) * 2; // -volatility% to +volatility%
    currentPrice = currentPrice * (1 + changePercent);
    line.push(currentPrice);
  }
  return line;
};

const protocols = [
  { name: 'Ethereum', symbol: 'ETH', category: 'Layer 1' },
  { name: 'Aave', symbol: 'AAVE', category: 'DeFi' },
  { name: 'Uniswap', symbol: 'UNI', category: 'DeFi' },
  { name: 'Arbitrum', symbol: 'ARB', category: 'Layer 2' },
  { name: 'Optimism', symbol: 'OP', category: 'Layer 2' },
  { name: 'Chainlink', symbol: 'LINK', category: 'Infrastructure' },
  { name: 'Lido', symbol: 'LDO', category: 'DeFi' },
  { name: 'Maker', symbol: 'MKR', category: 'DeFi' },
  { name: 'Gala', symbol: 'GALA', category: 'Gaming' },
  { name: 'Polygon', symbol: 'MATIC', category: 'Layer 2' },
  { name: 'Solana', symbol: 'SOL', category: 'Layer 1' },
  { name: 'Avalanche', symbol: 'AVAX', category: 'Layer 1' },
  { name: 'Curve', symbol: 'CRV', category: 'DeFi' },
  { name: 'Synthetix', symbol: 'SNX', category: 'DeFi' },
  { name: 'The Graph', symbol: 'GRT', category: 'Infrastructure' },
  { name: 'Immutable', symbol: 'IMX', category: 'Gaming' },
  { name: 'Axie Infinity', symbol: 'AXS', category: 'Gaming' },
  { name: 'Render', symbol: 'RNDR', category: 'Infrastructure' },
  { name: 'Aptos', symbol: 'APT', category: 'Layer 1' },
  { name: 'Sui', symbol: 'SUI', category: 'Layer 1' },
  { name: 'dYdX', symbol: 'DYDX', category: 'DeFi' },
  { name: 'Blur', symbol: 'BLUR', category: 'NFT' },
  { name: 'LooksRare', symbol: 'LOOKS', category: 'NFT' },
  { name: 'Compound', symbol: 'COMP', category: 'DeFi' },
  { name: 'Balancer', symbol: 'BAL', category: 'DeFi' }
];

export const mockScreenerData: ProtocolData[] = protocols.map((p, index) => {
  const baseTvl = (rand() * 5000000000) + 10000000;
  const yieldP = p.category === 'DeFi' ? (rand() * 45) + 2 : (rand() * 15);
  const volatility = (rand() * 80) + 10;
  
  // Assign risk dynamically based on yield and volatility
  let risk: ProtocolData['riskLevel'] = 'Medium';
  if (yieldP > 30 || volatility > 70) risk = 'High';
  if (yieldP > 50 || volatility > 90) risk = 'Critical';
  if (yieldP < 10 && volatility < 30) risk = 'Low';

  let audit: ProtocolData['auditStatus'] = 'Audited';
  if (rand() > 0.7) audit = 'Partial';
  if (rand() > 0.9) audit = 'Unaudited';

  return {
    id: `proto-${index}`,
    name: p.name,
    symbol: p.symbol,
    category: p.category as ProtocolData['category'],
    tvl: baseTvl,
    yieldPercentage: parseFloat(yieldP.toFixed(2)),
    marketCap: baseTvl * ((rand() * 2) + 0.5), // MC to TVL ratio roughly 0.5x to 2.5x
    volume24h: baseTvl * (rand() * 0.3),
    sentimentScore: Math.floor(rand() * 100),
    volatilityIndex: parseFloat(volatility.toFixed(2)),
    auditStatus: audit,
    riskLevel: risk,
    sparkline: generateSparkline(100, volatility)
  };
});

// Utility to generate a larger dataset for load testing the screener
export const generateExtendedMockData = (count: number): ProtocolData[] => {
  const data: ProtocolData[] = [...mockScreenerData];
  for (let i = mockScreenerData.length; i < count; i++) {
    const categories = ['DeFi', 'Layer 1', 'Layer 2', 'Gaming', 'Infrastructure', 'NFT'];
    const cat = categories[Math.floor(rand() * categories.length)] as ProtocolData['category'];
    const baseTvl = (rand() * 1000000000) + 1000000;
    const yieldP = (rand() * 100) + 1;
    const volatility = (rand() * 100);

    let risk: ProtocolData['riskLevel'] = 'Medium';
    if (yieldP > 40 || volatility > 75) risk = 'High';
    if (yieldP > 80 || volatility > 90) risk = 'Critical';
    if (yieldP < 15 && volatility < 25) risk = 'Low';

    data.push({
      id: `proto-ext-${i}`,
      name: `Protocol ${String.fromCharCode(65 + (i % 26))}${i}`,
      symbol: `PRT${i}`,
      category: cat,
      tvl: baseTvl,
      yieldPercentage: parseFloat(yieldP.toFixed(2)),
      marketCap: baseTvl * ((rand() * 1.5) + 0.1),
      volume24h: baseTvl * (rand() * 0.5),
      sentimentScore: Math.floor(rand() * 100),
      volatilityIndex: parseFloat(volatility.toFixed(2)),
      auditStatus: ['Audited', 'Partial', 'Unaudited'][Math.floor(rand() * 3)] as ProtocolData['auditStatus'],
      riskLevel: risk,
      sparkline: generateSparkline((rand() * 1000) + 1, volatility)
    });
  }
  return data;
};
