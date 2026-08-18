import {
  CryptoCustodyService,
  CustodyVault,
  CustodyWithdrawalApproval,
  CustodyFilterOptions,
} from "./CryptoCustodyModel";

export class CryptoCustodyServiceHandler {
  public static fetchCustodyVaults(filters?: Partial<CustodyFilterOptions>): CustodyVault[] {
    return CryptoCustodyService.getVaults(filters);
  }

  public static fetchVaultDetails(id: string): CustodyVault | undefined {
    return CryptoCustodyService.getVaultById(id);
  }

  public static registerNewVault(
    payload: Omit<CustodyVault, "id" | "status" | "lastAuditedDate">
  ): CustodyVault {
    return CryptoCustodyService.registerCustodyVault(payload);
  }

  public static fetchApprovalHistory(): CustodyWithdrawalApproval[] {
    return CryptoCustodyService.getApprovalHistory();
  }

  public static submitWithdrawalRequest(
    vaultId: string,
    destinationAddress: string,
    assetSymbol: string,
    requestedAmount: number
  ): CustodyWithdrawalApproval {
    return CryptoCustodyService.requestWithdrawalApproval(
      vaultId,
      destinationAddress,
      assetSymbol,
      requestedAmount
    );
  }
}
