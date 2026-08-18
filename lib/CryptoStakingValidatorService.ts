import {
  CryptoStakingValidatorService,
  StakingValidatorNode,
  ValidatorRewardDistribution,
  ValidatorFilterOptions,
} from "./CryptoStakingValidatorModel";

export class CryptoStakingValidatorServiceHandler {
  public static fetchValidators(filters?: Partial<ValidatorFilterOptions>): StakingValidatorNode[] {
    return CryptoStakingValidatorService.getValidators(filters);
  }

  public static fetchValidatorDetails(id: string): StakingValidatorNode | undefined {
    return CryptoStakingValidatorService.getValidatorById(id);
  }

  public static registerNewValidator(
    payload: Omit<StakingValidatorNode, "id" | "status" | "registeredDate">
  ): StakingValidatorNode {
    return CryptoStakingValidatorService.registerValidator(payload);
  }

  public static fetchRewardDistributions(): ValidatorRewardDistribution[] {
    return CryptoStakingValidatorService.getRewardDistributions();
  }

  public static executeEpochRewardPayout(
    validatorId: string,
    rewardEpoch: number,
    rewardAmountTokens: number
  ): ValidatorRewardDistribution {
    return CryptoStakingValidatorService.triggerEpochRewardPayout(
      validatorId,
      rewardEpoch,
      rewardAmountTokens
    );
  }
}
