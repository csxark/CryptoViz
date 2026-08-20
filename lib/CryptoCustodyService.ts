import {
  CryptoCustodyService,
  CustodyVault,
  GovernanceAuthorizationRequest,
  CustodyFilterOptions
} from "./CryptoCustodyModel";

export class CryptoCustodyServiceHandler {
  public static fetchVaults(filters?: Partial<CustodyFilterOptions>): CustodyVault[] {
    return CryptoCustodyService.getVaults(filters);
  }

  public static registerNewVault(
    payload: Omit<CustodyVault, "id" | "complianceScore" | "proofOfReserveVerified">
  ): CustodyVault {
    return CryptoCustodyService.registerVault(payload);
  }

  public static fetchAuthorizationRequests(): GovernanceAuthorizationRequest[] {
    return CryptoCustodyService.getAuthorizationRequests();
  }

  public static signGovernanceRequest(requestId: string): GovernanceAuthorizationRequest {
    return CryptoCustodyService.approveSignature(requestId);
  }
}
