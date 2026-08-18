export interface CustodyVault {
  id: string;
  vaultName: string;
  custodianProvider: 'Fireblocks' | 'BitGo' | 'Coinbase Custody' | 'Anchorage Digital' | 'Ledger Enterprise';
  signatoryThreshold: string; // e.g. "3-of-5 MPC" or "2-of-3 Multisig"
  vaultAssetType: 'Cold Storage' | 'MPC Warm Vault' | 'Institutional Staking' | 'Settlement Collateral';
  totalBalanceUsd: number;
  primaryAssets: string[];
  amlComplianceStatus: 'verified' | 'flagged-sanction-check' | 'pending-reverification';
  timelockDelayHours: number;
  status: 'active' | 'frozen' | 'archived';
  lastAuditedDate: string;
}

export interface CustodyWithdrawalApproval {
  id: string;
  vaultId: string;
  vaultName: string;
  custodianProvider: string;
  destinationAddress: string;
  assetSymbol: string;
  requestedAmount: number;
  requestedValueUsd: number;
  requiredApprovals: number;
  currentApprovals: number;
  approvalStatus: 'approved-relayed' | 'pending-signatories' | 'rejected-policy';
  requestedTimestamp: string;
}

export interface CustodyFilterOptions {
  custodianProvider: string;
  vaultAssetType: string;
  amlComplianceStatus: string;
  searchQuery: string;
}

const INITIAL_VAULTS: CustodyVault[] = [
  {
    id: "cust-101",
    vaultName: "Institutional Treasury Cold Vault #1",
    custodianProvider: "Fireblocks",
    signatoryThreshold: "3-of-5 MPC",
    vaultAssetType: "Cold Storage",
    totalBalanceUsd: 145000000,
    primaryAssets: ["BTC", "ETH", "USDC"],
    amlComplianceStatus: "verified",
    timelockDelayHours: 24,
    status: "active",
    lastAuditedDate: "Aug 01, 2026",
  },
  {
    id: "cust-102",
    vaultName: "Institutional Prime Clearing Reserve",
    custodianProvider: "BitGo",
    signatoryThreshold: "2-of-3 Multisig",
    vaultAssetType: "Settlement Collateral",
    totalBalanceUsd: 68000000,
    primaryAssets: ["USDT", "USDC", "WBTC"],
    amlComplianceStatus: "verified",
    timelockDelayHours: 6,
    status: "active",
    lastAuditedDate: "Aug 10, 2026",
  },
  {
    id: "cust-103",
    vaultName: "DeFi Yield Staking Vault",
    custodianProvider: "Anchorage Digital",
    signatoryThreshold: "4-of-7 MPC",
    vaultAssetType: "Institutional Staking",
    totalBalanceUsd: 32000000,
    primaryAssets: ["ETH", "SOL"],
    amlComplianceStatus: "verified",
    timelockDelayHours: 12,
    status: "active",
    lastAuditedDate: "Jul 28, 2026",
  },
];

const INITIAL_APPROVALS: CustodyWithdrawalApproval[] = [
  {
    id: "appr-201",
    vaultId: "cust-101",
    vaultName: "Institutional Treasury Cold Vault #1",
    custodianProvider: "Fireblocks",
    destinationAddress: "0x7a81...44b9",
    assetSymbol: "USDC",
    requestedAmount: 5000000,
    requestedValueUsd: 5000000,
    requiredApprovals: 3,
    currentApprovals: 3,
    approvalStatus: "approved-relayed",
    requestedTimestamp: "Aug 18, 2026",
  },
];

export class CryptoCustodyService {
  private static vaults: CustodyVault[] = [...INITIAL_VAULTS];
  private static approvals: CustodyWithdrawalApproval[] = [...INITIAL_APPROVALS];

  public static getVaults(options?: Partial<CustodyFilterOptions>): CustodyVault[] {
    let result = [...this.vaults];
    if (!options) return result;

    if (options.custodianProvider && options.custodianProvider !== "All") {
      result = result.filter((v) => v.custodianProvider === options.custodianProvider);
    }

    if (options.vaultAssetType && options.vaultAssetType !== "All") {
      result = result.filter((v) => v.vaultAssetType === options.vaultAssetType);
    }

    if (options.amlComplianceStatus && options.amlComplianceStatus !== "All") {
      result = result.filter((v) => v.amlComplianceStatus === options.amlComplianceStatus);
    }

    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.vaultName.toLowerCase().includes(q) ||
          v.custodianProvider.toLowerCase().includes(q) ||
          v.primaryAssets.some((a) => a.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public static getVaultById(id: string): CustodyVault | undefined {
    return this.vaults.find((v) => v.id === id);
  }

  public static registerCustodyVault(
    vault: Omit<CustodyVault, "id" | "status" | "lastAuditedDate">
  ): CustodyVault {
    const newVault: CustodyVault = {
      ...vault,
      id: `cust-${Date.now()}`,
      status: "active",
      lastAuditedDate: "Just now",
    };
    this.vaults.unshift(newVault);
    return newVault;
  }

  public static getApprovalHistory(): CustodyWithdrawalApproval[] {
    return [...this.approvals];
  }

  public static requestWithdrawalApproval(
    vaultId: string,
    destinationAddress: string,
    assetSymbol: string,
    requestedAmount: number
  ): CustodyWithdrawalApproval {
    const vault = this.getVaultById(vaultId);
    if (!vault) throw new Error("Institutional custody vault profile not found.");

    const requestedValueUsd = requestedAmount;

    const newApproval: CustodyWithdrawalApproval = {
      id: `appr-${Date.now()}`,
      vaultId,
      vaultName: vault.vaultName,
      custodianProvider: vault.custodianProvider,
      destinationAddress,
      assetSymbol,
      requestedAmount,
      requestedValueUsd,
      requiredApprovals: 3,
      currentApprovals: 3,
      approvalStatus: "approved-relayed",
      requestedTimestamp: "Just now",
    };

    this.approvals.unshift(newApproval);
    return newApproval;
  }
}
