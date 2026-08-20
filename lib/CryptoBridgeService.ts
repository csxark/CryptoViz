import {
  CryptoBridgeService,
  CrossChainBridgeRoute,
  BridgeTransferAuditRecord,
  BridgeFilterOptions
} from "./CryptoBridgeModel";

export class CryptoBridgeServiceHandler {
  public static fetchRoutes(filters?: Partial<BridgeFilterOptions>): CrossChainBridgeRoute[] {
    return CryptoBridgeService.getRoutes(filters);
  }

  public static registerNewRoute(
    payload: Omit<CrossChainBridgeRoute, "id" | "status">
  ): CrossChainBridgeRoute {
    return CryptoBridgeService.registerRoute(payload);
  }

  public static fetchTransferRecords(): BridgeTransferAuditRecord[] {
    return CryptoBridgeService.getTransferRecords();
  }

  public static executeBridgeTransfer(routeId: string, amountUsd: number): BridgeTransferAuditRecord {
    return CryptoBridgeService.initiateBridgeTransfer(routeId, amountUsd);
  }
}
