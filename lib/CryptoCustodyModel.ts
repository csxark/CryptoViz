export interface CustodyVault {
  id: string;
  vaultName: string;
  institutionTier: 'Tier 1 Prime' | 'Enterprise' | 'Hedge Fund' | 'Sovereign';
  storageType: 'Cold Storage (HSM)' | 'MPC Multi-Sig' | 'Warm Treasury';
  totalAumUsd: number;
  signersRequired: number;
  signersTotal: number;
  complianceScore: number; // 0 - 100
  proofOfReserveVerified: boolean;
  custodianPartner: string;
  primaryAssets: { asset: string; balanceUsd: number }[];
  status: 'active-compliant' | 'audit-pending' | 'risk-alert';
}

export interface GovernanceAuthorizationRequest {
  id: string;
  vaultId: string;
  vaultName: string;
  transferAsset: string;
  amountUsd: number;
  destinationAddress: string;
  signaturesCollected: number;
  signaturesNeeded: number;
  requestedBy: string;
  requestedTimestamp: string;
  status: 'pending-signatures' | 'approved-broadcast' | 'rejected';
}

export interface CustodyFilterOptions {
  storageType: string;
  institutionTier: string;
  searchQuery: string;
}

const INITIAL_VAULTS: CustodyVault[] = [
  {
    id: "vault-101",
    vaultName: "Aegis Prime Cold Storage",
    institutionTier: "Tier 1 Prime",
    storageType: "Cold Storage (HSM)",
    totalAumUsd: 145000000,
    signersRequired: 3,
    signersTotal: 5,
    complianceScore: 98,
    proofOfReserveVerified: true,
    custodianPartner: "BitGo Prime Custody",
    primaryAssets: [
      { asset: "BTC", balanceUsd: 95000000 },
      { asset: "ETH", balanceUsd: 50000000 }
    ],
    status: "active-compliant"
  },
  {
    id: "vault-102",
    vaultName: "Titan MPC Treasury Vault",
    institutionTier: "Enterprise",
    storageType: "MPC Multi-Sig",
    totalAumUsd: 48000000,
    signersRequired: 2,
    signersTotal: 3,
    complianceScore: 92,
    proofOfReserveVerified: true,
    custodianPartner: "Fireblocks Institutional",
    primaryAssets: [
      { asset: "USDC", balanceUsd: 30000000 },
      { asset: "SOL", balanceUsd: 18000000 }
    ],
    status: "active-compliant"
  },
  {
    id: "vault-103",
    vaultName: "Apex Sovereign Yield Reserve",
    institutionTier: "Sovereign",
    storageType: "Warm Treasury",
    totalAumUsd: 82000000,
    signersRequired: 4,
    signersTotal: 7,
    complianceScore: 86,
    proofOfReserveVerified: true,
    custodianPartner: "Coinbase Custody Trust",
    primaryAssets: [
      { asset: "WBTC", balanceUsd: 52000000 },
      { asset: "USDT", balanceUsd: 30000000 }
    ],
    status: "audit-pending"
  }
];

const INITIAL_REQUESTS: GovernanceAuthorizationRequest[] = [
  {
    id: "auth-301",
    vaultId: "vault-101",
    vaultName: "Aegis Prime Cold Storage",
    transferAsset: "BTC",
    amountUsd: 2500000,
    destinationAddress: "0x7a8...91bc",
    signaturesCollected: 2,
    signaturesNeeded: 3,
    requestedBy: "Compliance Officer #42",
    requestedTimestamp: "15 minutes ago",
    status: "pending-signatures"
  }
];

export class CryptoCustodyService {
  private static vaults: CustodyVault[] = [...INITIAL_VAULTS];
  private static requests: GovernanceAuthorizationRequest[] = [...INITIAL_REQUESTS];

  public static getVaults(options?: Partial<CustodyFilterOptions>): CustodyVault[] {
    let result = [...this.vaults];
    if (!options) return result;

    if (options.storageType && options.storageType !== "All") {
      result = result.filter((v) => v.storageType === options.storageType);
    }

    if (options.institutionTier && options.institutionTier !== "All") {
      result = result.filter((v) => v.institutionTier === options.institutionTier);
    }

    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.vaultName.toLowerCase().includes(q) ||
          v.custodianPartner.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public static registerVault(
    vault: Omit<CustodyVault, "id" | "complianceScore" | "proofOfReserveVerified">
  ): CustodyVault {
    const newVault: CustodyVault = {
      ...vault,
      id: `vault-${Date.now()}`,
      complianceScore: 95,
      proofOfReserveVerified: true
    };
    this.vaults.unshift(newVault);
    return newVault;
  }

  public static getAuthorizationRequests(): GovernanceAuthorizationRequest[] {
    return [...this.requests];
  }

  public static approveSignature(requestId: string): GovernanceAuthorizationRequest {
    const req = this.requests.find((r) => r.id === requestId);
    if (!req) throw new Error("Authorization request not found.");

    req.signaturesCollected += 1;
    if (req.signaturesCollected >= req.signaturesNeeded) {
      req.status = "approved-broadcast";
    }

    return req;
  }
}
