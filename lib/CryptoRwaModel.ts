export interface RwaAssetToken {
  id: string;
  assetName: string;
  assetCategory: 'Treasury Bills' | 'Real Estate' | 'Private Credit' | 'Precious Metals' | 'Carbon Credits';
  tokenSymbol: string;
  underlyingCustodian: 'Ondo Finance' | 'Centrifuge' | 'Paxos' | 'Maple Finance' | 'Tangible';
  tokenizedValuationUsd: number;
  annualizedYieldPercentage: number;
  proofOfReserveStatus: 'verified-on-chain' | 'pending-oracle-audit' | 'audit-flagged';
  collateralRatioPercentage: number;
  status: 'trading-active' | 'issuance-paused' | 'matured';
  issuanceDate: string;
}

export interface RwaDistributionPayout {
  id: string;
  assetId: string;
  assetName: string;
  tokenSymbol: string;
  payoutEpoch: number;
  distributionYieldUsd: number;
  oracleAttestationHash: string;
  payoutTimestamp: string;
  status: 'settled-on-chain' | 'pending-oracle-attestation';
}

export interface RwaFilterOptions {
  assetCategory: string;
  underlyingCustodian: string;
  proofOfReserveStatus: string;
  searchQuery: string;
}

const INITIAL_RWA_ASSETS: RwaAssetToken[] = [
  {
    id: "rwa-101",
    assetName: "US Short-Term Treasury Bill Vault (OUSG)",
    assetCategory: "Treasury Bills",
    tokenSymbol: "OUSG",
    underlyingCustodian: "Ondo Finance",
    tokenizedValuationUsd: 220000000,
    annualizedYieldPercentage: 5.15,
    proofOfReserveStatus: "verified-on-chain",
    collateralRatioPercentage: 102.5,
    status: "trading-active",
    issuanceDate: "Jan 10, 2026",
  },
  {
    id: "rwa-102",
    assetName: "Prime Commercial Real Estate Pool #4",
    assetCategory: "Real Estate",
    tokenSymbol: "RE-PRIME",
    underlyingCustodian: "Tangible",
    tokenizedValuationUsd: 85000000,
    annualizedYieldPercentage: 8.40,
    proofOfReserveStatus: "verified-on-chain",
    collateralRatioPercentage: 110.0,
    status: "trading-active",
    issuanceDate: "Mar 04, 2026",
  },
  {
    id: "rwa-103",
    assetName: "Institutional Structured Private Credit",
    assetCategory: "Private Credit",
    tokenSymbol: "MPL-CRED",
    underlyingCustodian: "Maple Finance",
    tokenizedValuationUsd: 45000000,
    annualizedYieldPercentage: 11.20,
    proofOfReserveStatus: "verified-on-chain",
    collateralRatioPercentage: 105.0,
    status: "trading-active",
    issuanceDate: "Apr 22, 2026",
  },
];

const INITIAL_DISTRIBUTIONS: RwaDistributionPayout[] = [
  {
    id: "dist-201",
    assetId: "rwa-101",
    assetName: "US Short-Term Treasury Bill Vault (OUSG)",
    tokenSymbol: "OUSG",
    payoutEpoch: 18,
    distributionYieldUsd: 944000,
    oracleAttestationHash: "0x9c41...11a8",
    payoutTimestamp: "Aug 18, 2026",
    status: "settled-on-chain",
  },
];

export class CryptoRwaService {
  private static assets: RwaAssetToken[] = [...INITIAL_RWA_ASSETS];
  private static distributions: RwaDistributionPayout[] = [...INITIAL_DISTRIBUTIONS];

  public static getAssets(options?: Partial<RwaFilterOptions>): RwaAssetToken[] {
    let result = [...this.assets];
    if (!options) return result;

    if (options.assetCategory && options.assetCategory !== "All") {
      result = result.filter((a) => a.assetCategory === options.assetCategory);
    }

    if (options.underlyingCustodian && options.underlyingCustodian !== "All") {
      result = result.filter((a) => a.underlyingCustodian === options.underlyingCustodian);
    }

    if (options.proofOfReserveStatus && options.proofOfReserveStatus !== "All") {
      result = result.filter((a) => a.proofOfReserveStatus === options.proofOfReserveStatus);
    }

    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.assetName.toLowerCase().includes(q) ||
          a.tokenSymbol.toLowerCase().includes(q) ||
          a.underlyingCustodian.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public static getAssetById(id: string): RwaAssetToken | undefined {
    return this.assets.find((a) => a.id === id);
  }

  public static registerRwaAsset(
    asset: Omit<RwaAssetToken, "id" | "status" | "issuanceDate">
  ): RwaAssetToken {
    const newAsset: RwaAssetToken = {
      ...asset,
      id: `rwa-${Date.now()}`,
      status: "trading-active",
      issuanceDate: "Just now",
    };
    this.assets.unshift(newAsset);
    return newAsset;
  }

  public static getDistributionHistory(): RwaDistributionPayout[] {
    return [...this.distributions];
  }

  public static triggerYieldDistribution(
    assetId: string,
    payoutEpoch: number,
    distributionYieldUsd: number
  ): RwaDistributionPayout {
    const asset = this.getAssetById(assetId);
    if (!asset) throw new Error("RWA tokenized asset profile not found.");

    const newDist: RwaDistributionPayout = {
      id: `dist-${Date.now()}`,
      assetId,
      assetName: asset.assetName,
      tokenSymbol: asset.tokenSymbol,
      payoutEpoch,
      distributionYieldUsd,
      oracleAttestationHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
      payoutTimestamp: "Just now",
      status: "settled-on-chain",
    };

    this.distributions.unshift(newDist);
    return newDist;
  }
}
