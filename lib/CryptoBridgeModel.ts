export interface CrossChainBridgeRoute {
  id: string;
  sourceChain: 'Ethereum' | 'Arbitrum' | 'Optimism' | 'Solana' | 'Polygon' | 'Avalanche';
  targetChain: 'Ethereum' | 'Arbitrum' | 'Optimism' | 'Solana' | 'Polygon' | 'Avalanche';
  bridgeProtocol: 'Stargate' | 'Hop Protocol' | 'Synapse' | 'Wormhole' | 'Across';
  supportedTokens: string[];
  totalBridgeLiquidityUsd: number;
  estimatedTransferTimeMinutes: number;
  protocolFeePercentage: number;
  gasCostEstimateUsd: number;
  bridgeSecurityScore: number; // 0 - 100
  status: 'operational' | 'congested' | 'maintenance' | 'paused';
}

export interface BridgeTransferTransaction {
  id: string;
  routeId: string;
  sourceChain: string;
  targetChain: string;
  bridgeProtocol: string;
  tokenSymbol: string;
  transferAmount: number;
  transferValueUsd: number;
  feePaidUsd: number;
  sourceTxHash: string;
  targetTxHash: string;
  transferredTimestamp: string;
  status: 'relayed' | 'pending-confirmation' | 'relayer-refunding';
}

export interface BridgeFilterOptions {
  sourceChain: string;
  targetChain: string;
  bridgeProtocol: string;
  searchQuery: string;
}

const INITIAL_ROUTES: CrossChainBridgeRoute[] = [
  {
    id: "route-101",
    sourceChain: "Ethereum",
    targetChain: "Arbitrum",
    bridgeProtocol: "Stargate",
    supportedTokens: ["USDC", "USDT", "ETH"],
    totalBridgeLiquidityUsd: 85000000,
    estimatedTransferTimeMinutes: 2,
    protocolFeePercentage: 0.06,
    gasCostEstimateUsd: 14.50,
    bridgeSecurityScore: 96,
    status: "operational",
  },
  {
    id: "route-102",
    sourceChain: "Ethereum",
    targetChain: "Optimism",
    bridgeProtocol: "Across",
    supportedTokens: ["WETH", "USDC", "WBTC"],
    totalBridgeLiquidityUsd: 42000000,
    estimatedTransferTimeMinutes: 1,
    protocolFeePercentage: 0.04,
    gasCostEstimateUsd: 9.80,
    bridgeSecurityScore: 94,
    status: "operational",
  },
  {
    id: "route-103",
    sourceChain: "Solana",
    targetChain: "Ethereum",
    bridgeProtocol: "Wormhole",
    supportedTokens: ["SOL", "USDC", "BONK"],
    totalBridgeLiquidityUsd: 29000000,
    estimatedTransferTimeMinutes: 8,
    protocolFeePercentage: 0.12,
    gasCostEstimateUsd: 28.00,
    bridgeSecurityScore: 88,
    status: "congested",
  },
];

const INITIAL_TRANSFERS: BridgeTransferTransaction[] = [
  {
    id: "tx-201",
    routeId: "route-101",
    sourceChain: "Ethereum",
    targetChain: "Arbitrum",
    bridgeProtocol: "Stargate",
    tokenSymbol: "USDC",
    transferAmount: 25000,
    transferValueUsd: 25000,
    feePaidUsd: 29.50,
    sourceTxHash: "0x4a12...99b2",
    targetTxHash: "0x8e91...33c1",
    transferredTimestamp: "Aug 18, 2026",
    status: "relayed",
  },
];

export class CryptoBridgeService {
  private static routes: CrossChainBridgeRoute[] = [...INITIAL_ROUTES];
  private static transfers: BridgeTransferTransaction[] = [...INITIAL_TRANSFERS];

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
          r.bridgeProtocol.toLowerCase().includes(q) ||
          r.sourceChain.toLowerCase().includes(q) ||
          r.targetChain.toLowerCase().includes(q) ||
          r.supportedTokens.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public static getRouteById(id: string): CrossChainBridgeRoute | undefined {
    return this.routes.find((r) => r.id === id);
  }

  public static registerBridgeRoute(
    route: Omit<CrossChainBridgeRoute, "id" | "status">
  ): CrossChainBridgeRoute {
    const newRoute: CrossChainBridgeRoute = {
      ...route,
      id: `route-${Date.now()}`,
      status: "operational",
    };
    this.routes.unshift(newRoute);
    return newRoute;
  }

  public static getTransferHistory(): BridgeTransferTransaction[] {
    return [...this.transfers];
  }

  public static executeBridgeTransfer(
    routeId: string,
    tokenSymbol: string,
    transferAmount: number
  ): BridgeTransferTransaction {
    const route = this.getRouteById(routeId);
    if (!route) throw new Error("Cross-chain bridge route profile not found.");

    const transferValueUsd = transferAmount;
    const feePaidUsd = Math.round(
      route.gasCostEstimateUsd + (transferValueUsd * route.protocolFeePercentage) / 100
    );

    const newTransfer: BridgeTransferTransaction = {
      id: `tx-${Date.now()}`,
      routeId,
      sourceChain: route.sourceChain,
      targetChain: route.targetChain,
      bridgeProtocol: route.bridgeProtocol,
      tokenSymbol,
      transferAmount,
      transferValueUsd,
      feePaidUsd,
      sourceTxHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
      targetTxHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
      transferredTimestamp: "Just now",
      status: "relayed",
    };

    this.transfers.unshift(newTransfer);
    return newTransfer;
  }
}
