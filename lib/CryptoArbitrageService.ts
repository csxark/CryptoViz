import {
  CryptoArbitrageService,
  FlashLoanArbitrageOpportunity,
  ArbitrageExecutionRecord,
  ArbitrageFilterOptions,
} from "./CryptoArbitrageModel";

export class CryptoArbitrageServiceHandler {
  public static fetchOpportunities(filters?: Partial<ArbitrageFilterOptions>): FlashLoanArbitrageOpportunity[] {
    return CryptoArbitrageService.getOpportunities(filters);
  }

  public static fetchOpportunityDetails(id: string): FlashLoanArbitrageOpportunity | undefined {
    return CryptoArbitrageService.getOpportunityById(id);
  }

  public static registerNewOpportunity(
    payload: Omit<FlashLoanArbitrageOpportunity, "id" | "status" | "detectedTimestamp">
  ): FlashLoanArbitrageOpportunity {
    return CryptoArbitrageService.registerOpportunity(payload);
  }

  public static fetchExecutionRecords(): ArbitrageExecutionRecord[] {
    return CryptoArbitrageService.getExecutionRecords();
  }

  public static simulateArbitrageBotTrade(opportunityId: string): ArbitrageExecutionRecord {
    return CryptoArbitrageService.simulateFlashLoanArbitrage(opportunityId);
  }
}
