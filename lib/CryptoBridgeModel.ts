export interface CrossChainBridgeRoute {
  id: string;
  bridgeName: string;
  sourceChain: string;
  targetChain: string;
  tokenSymbol: string;
  bridgeProtocol: 'LayerZero' | 'Stargate' | 'Wormhole' | 'Hop Protocol' | 'Arbitrum Bridge';
  poolLiquidityUsd: number;
  estimatedFeeUsd: number;
  estimatedLatencyMinutes: number;
  slippageTolerancePercentage: number;
  securityRating: 'AAA+' | 'AA' | 'A' | 'BBB';
  status: 'optimal-path' | 'high-congestion' | 'degraded-liquidity';
}

export interface BridgeTransferAuditRecord {
  id: string;
  routeId: string;
  bridgeName: string;
  tokenSymbol: string;
  sourceChain: string;
  targetChain: string;
  amountTransferredUsd: number;
  sourceTxHash: string;
  targetTxHash: string;
  initiatedTimestamp: string;
  completedTimestamp: string;
  status: 'transferred-settled' | 'in-flight' | 'destination-pending';
}

export interface BridgeFilterOptions {
  sourceChain: string;
  targetChain: string;
  bridgeProtocol: string;
  searchQuery: string;
}

const INITIAL_ROUTES: CrossChainBridgeRoute[] = [
  {
    id: "bridge-101",
    bridgeName: "Stargate V2 Liquidity Pool",
    sourceChain: "Ethereum Mainnet",
    targetChain: "Arbitrum One",
    tokenSymbol: "USDC",
    bridgeProtocol: "Stargate",
    poolLiquidityUsd: 85000000,
    estimatedFeeUsd: 4.20,
    estimatedLatencyMinutes: 2,
    slippageTolerancePercentage: 0.05,
    securityRating: "AAA+",
    status: "optimal-path"
  },
  {
    id: "bridge-102",
    bridgeName: "Wormhole Portal Protocol",
    sourceChain: "Solana Mainnet",
    targetChain: "Ethereum Mainnet",
    tokenSymbol: "ETH",
    bridgeProtocol: "Wormhole",
    poolLiquidityUsd: 42000000,
    estimatedFeeUsd: 12.50,
    estimatedLatencyMinutes: 8,
    slippageTolerancePercentage: 0.12,
    securityRating: "AA",
    status: "optimal-path"
  },
  {
    id: "bridge-103",
    bridgeName: "Hop Protocol AMM Vault",
    sourceChain: "Polygon POS",
    targetChain: "Optimism Mainnet",
    tokenSymbol: "USDT",
    bridgeProtocol: "Hop Protocol",
    poolLiquidityUsd: 18000000,
    estimatedFeeUsd: 2.10,
    estimatedLatencyMinutes: 5,
    slippageTolerancePercentage: 0.08,
    securityRating: "A",
    status: "optimal-path"
  }
];

const INITIAL_RECORDS: BridgeTransferAuditRecord[] = [
  {
    id: "tx-401",
    routeId: "bridge-101",
    bridgeName: "Stargate V2 Liquidity Pool",
    tokenSymbol: "USDC",
    sourceChain: "Ethereum Mainnet",
    targetChain: "Arbitrum One",
    amountTransferredUsd: 50000,
    sourceTxHash: "0x8b1...32ae",
    targetTxHash: "0x4f9...91cd",
    initiatedTimestamp: "10 minutes ago",
    completedTimestamp: "8 minutes ago",
    status: "transferred-settled"
  }
];

export class CryptoBridgeService {
  private static routes: CrossChainBridgeRoute[] = [...INITIAL_ROUTES];
  private static records: BridgeTransferAuditRecord[] = [...INITIAL_RECORDS];

  public static getRoutes(options?: Partial<BridgeFilterOptions>): CrossChainBridgeRoute[] {
    let result = [...this.routes];
    if (!options) return result;

    if (options.sourceChain && options.sourceChain !== "All") {
      result = result.filter((r) => r.sourceChain === options.sourceChain);
    }

    if (options.targetChain && options.targetChain !== "All") {
      result = result.filter((r) => r.targetChain === options.targetChain);
    }

    if (options.bridgeProtocol && options.bridgeProtocol !== "All") {
      result = result.filter((r) => r.bridgeProtocol === options.bridgeProtocol);
    }

    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.bridgeName.toLowerCase().includes(q) ||
          r.tokenSymbol.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public static registerRoute(
    route: Omit<CrossChainBridgeRoute, "id" | "status">
  ): CrossChainBridgeRoute {
    const newRoute: CrossChainBridgeRoute = {
      ...route,
      id: `bridge-${Date.now()}`,
      status: "optimal-path"
    };
    this.routes.unshift(newRoute);
    return newRoute;
  }

  public static getTransferRecords(): BridgeTransferAuditRecord[] {
    return [...this.records];
  }

  public static initiateBridgeTransfer(routeId: string, amountUsd: number): BridgeTransferAuditRecord {
    const route = this.routes.find((r) => r.id === routeId);
    if (!route) throw new Error("Bridge route not found.");

    const newRecord: BridgeTransferAuditRecord = {
      id: `tx-${Date.now()}`,
      routeId,
      bridgeName: route.bridgeName,
      tokenSymbol: route.tokenSymbol,
      sourceChain: route.sourceChain,
      targetChain: route.targetChain,
      amountTransferredUsd: amountUsd,
      sourceTxHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
      targetTxHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
      initiatedTimestamp: "Just now",
      completedTimestamp: "Just now",
      status: "transferred-settled"
    };

    this.records.unshift(newRecord);
    return newRecord;
  }
}
