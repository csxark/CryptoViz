export interface StakingValidatorNode {
  id: string;
  validatorName: string;
  network: 'Ethereum 2.0' | 'Solana' | 'Cosmos Hub' | 'Polkadot' | 'Avalanche';
  publicKey: string;
  totalStakedTokens: number;
  totalStakedUsd: number;
  validatorCommissionPercentage: number;
  uptimePercentage: number;
  attestationEfficiencyPercentage: number;
  slashingRiskLevel: 'low' | 'moderate' | 'high';
  status: 'active' | 'slashed' | 'deactivating' | 'jailed';
  registeredDate: string;
}

export interface ValidatorRewardDistribution {
  id: string;
  validatorId: string;
  validatorName: string;
  network: string;
  rewardEpoch: number;
  rewardAmountTokens: number;
  rewardAmountUsd: number;
  commissionEarnedUsd: number;
  payoutStatus: 'distributed' | 'pending' | 'slashed-penalty';
  payoutTimestamp: string;
}

export interface ValidatorFilterOptions {
  network: string;
  status: string;
  slashingRiskLevel: string;
  searchQuery: string;
}

const INITIAL_VALIDATORS: StakingValidatorNode[] = [
  {
    id: "val-101",
    validatorName: "Lido Ethereum Sentinel #42",
    network: "Ethereum 2.0",
    publicKey: "0x8f91...b420",
    totalStakedTokens: 12500,
    totalStakedUsd: 36250000,
    validatorCommissionPercentage: 5.0,
    uptimePercentage: 99.98,
    attestationEfficiencyPercentage: 99.4,
    slashingRiskLevel: "low",
    status: "active",
    registeredDate: "Jan 15, 2026",
  },
  {
    id: "val-102",
    validatorName: "Solana Velocity Node Alpha",
    network: "Solana",
    publicKey: "SolVal88...991A",
    totalStakedTokens: 480000,
    totalStakedUsd: 72000000,
    validatorCommissionPercentage: 7.0,
    uptimePercentage: 99.85,
    attestationEfficiencyPercentage: 98.9,
    slashingRiskLevel: "low",
    status: "active",
    registeredDate: "Feb 02, 2026",
  },
  {
    id: "val-103",
    validatorName: "Cosmos Hub Interchain Relay",
    network: "Cosmos Hub",
    publicKey: "cosmosvaloper190...811",
    totalStakedTokens: 850000,
    totalStakedUsd: 9350000,
    validatorCommissionPercentage: 3.5,
    uptimePercentage: 99.12,
    attestationEfficiencyPercentage: 97.2,
    slashingRiskLevel: "moderate",
    status: "active",
    registeredDate: "May 10, 2026",
  },
];

const INITIAL_REWARDS: ValidatorRewardDistribution[] = [
  {
    id: "rew-201",
    validatorId: "val-101",
    validatorName: "Lido Ethereum Sentinel #42",
    network: "Ethereum 2.0",
    rewardEpoch: 34120,
    rewardAmountTokens: 4.8,
    rewardAmountUsd: 13920,
    commissionEarnedUsd: 696,
    payoutStatus: "distributed",
    payoutTimestamp: "Aug 18, 2026",
  },
];

export class CryptoStakingValidatorService {
  private static validators: StakingValidatorNode[] = [...INITIAL_VALIDATORS];
  private static rewards: ValidatorRewardDistribution[] = [...INITIAL_REWARDS];

  public static getValidators(options?: Partial<ValidatorFilterOptions>): StakingValidatorNode[] {
    let result = [...this.validators];
    if (!options) return result;

    if (options.network && options.network !== "All") {
      result = result.filter((v) => v.network === options.network);
    }

    if (options.status && options.status !== "All") {
      result = result.filter((v) => v.status === options.status);
    }

    if (options.slashingRiskLevel && options.slashingRiskLevel !== "All") {
      result = result.filter((v) => v.slashingRiskLevel === options.slashingRiskLevel);
    }

    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.validatorName.toLowerCase().includes(q) ||
          v.publicKey.toLowerCase().includes(q) ||
          v.network.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public static getValidatorById(id: string): StakingValidatorNode | undefined {
    return this.validators.find((v) => v.id === id);
  }

  public static registerValidator(
    validator: Omit<StakingValidatorNode, "id" | "status" | "registeredDate">
  ): StakingValidatorNode {
    const newValidator: StakingValidatorNode = {
      ...validator,
      id: `val-${Date.now()}`,
      status: "active",
      registeredDate: "Just now",
    };
    this.validators.unshift(newValidator);
    return newValidator;
  }

  public static getRewardDistributions(): ValidatorRewardDistribution[] {
    return [...this.rewards];
  }

  public static triggerEpochRewardPayout(
    validatorId: string,
    rewardEpoch: number,
    rewardAmountTokens: number
  ): ValidatorRewardDistribution {
    const validator = this.getValidatorById(validatorId);
    if (!validator) throw new Error("Staking validator node not found.");

    const rewardAmountUsd = Math.round(rewardAmountTokens * 2900);
    const commissionEarnedUsd = Math.round(
      (rewardAmountUsd * validator.validatorCommissionPercentage) / 100
    );

    const newReward: ValidatorRewardDistribution = {
      id: `rew-${Date.now()}`,
      validatorId,
      validatorName: validator.validatorName,
      network: validator.network,
      rewardEpoch,
      rewardAmountTokens,
      rewardAmountUsd,
      commissionEarnedUsd,
      payoutStatus: "distributed",
      payoutTimestamp: "Just now",
    };

    this.rewards.unshift(newReward);
    return newReward;
  }
}
