import {
  CryptoRwaService,
  RwaAssetToken,
  RwaDistributionPayout,
  RwaFilterOptions,
} from "./CryptoRwaModel";

export class CryptoRwaServiceHandler {
  public static fetchAssets(filters?: Partial<RwaFilterOptions>): RwaAssetToken[] {
    return CryptoRwaService.getAssets(filters);
  }

  public static fetchAssetDetails(id: string): RwaAssetToken | undefined {
    return CryptoRwaService.getAssetById(id);
  }

  public static registerNewAsset(
    payload: Omit<RwaAssetToken, "id" | "status" | "issuanceDate">
  ): RwaAssetToken {
    return CryptoRwaService.registerRwaAsset(payload);
  }

  public static fetchDistributionHistory(): RwaDistributionPayout[] {
    return CryptoRwaService.getDistributionHistory();
  }

  public static executeYieldPayout(
    assetId: string,
    payoutEpoch: number,
    distributionYieldUsd: number
  ): RwaDistributionPayout {
    return CryptoRwaService.triggerYieldDistribution(
      assetId,
      payoutEpoch,
      distributionYieldUsd
    );
  }
}
