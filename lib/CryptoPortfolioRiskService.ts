import {
  CryptoPortfolioRiskService,
  PortfolioRiskMetric,
  RebalanceExecutionLog,
  CryptoFilterOptions,
} from "./CryptoPortfolioRiskModel";

export class CryptoPortfolioRiskServiceHandler {
  public static fetchPortfolios(filters?: Partial<CryptoFilterOptions>): PortfolioRiskMetric[] {
    return CryptoPortfolioRiskService.getPortfolios(filters);
  }

  public static fetchPortfolioDetails(id: string): PortfolioRiskMetric | undefined {
    return CryptoPortfolioRiskService.getPortfolioById(id);
  }

  public static registerNewPortfolio(
    payload: Omit<PortfolioRiskMetric, "id" | "rebalanceRequired" | "createdDate">
  ): PortfolioRiskMetric {
    return CryptoPortfolioRiskService.createPortfolio(payload);
  }

  public static fetchRebalanceExecutionLogs(): RebalanceExecutionLog[] {
    return CryptoPortfolioRiskService.getRebalanceLogs();
  }

  public static triggerRebalanceExecution(
    portfolioId: string,
    assetSymbol: string,
    tradeType: 'buy' | 'sell',
    tradeAmountUsd: number
  ): RebalanceExecutionLog {
    return CryptoPortfolioRiskService.executeRebalanceTrade(
      portfolioId,
      assetSymbol,
      tradeType,
      tradeAmountUsd
    );
  }
}
