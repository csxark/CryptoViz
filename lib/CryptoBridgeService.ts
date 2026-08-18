import {
  CryptoBridgeService,
  CrossChainBridgeRoute,
  BridgeTransferTransaction,
  BridgeFilterOptions,
} from "./CryptoBridgeModel";

export class CryptoBridgeServiceHandler {
  public static fetchBridgeRoutes(filters?: Partial<BridgeFilterOptions>): CrossChainBridgeRoute[] {
    return CryptoBridgeService.getRoutes(filters);
  }

  public static fetchRouteDetails(id: string): CrossChainBridgeRoute | undefined {
    return CryptoBridgeService.getRouteById(id);
  }

  public static registerNewBridgeRoute(
    payload: Omit<CrossChainBridgeRoute, "id" | "status">
  ): CrossChainBridgeRoute {
    return CryptoBridgeService.registerBridgeRoute(payload);
  }

  public static fetchTransferHistory(): BridgeTransferTransaction[] {
    return CryptoBridgeService.getTransferHistory();
  }

  public static executeCrossChainRelay(
    routeId: string,
    tokenSymbol: string,
    transferAmount: number
  ): BridgeTransferTransaction {
    return CryptoBridgeService.executeBridgeTransfer(
      routeId,
      tokenSymbol,
      transferAmount
    );
  }
}
