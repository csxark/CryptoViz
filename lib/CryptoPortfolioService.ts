import {
  CryptoPortfolioService,
  PortfolioRiskMetric,
  RebalanceExecutionLog,
  PortfolioFilterOptions
} from "./CryptoPortfolioModel";

export class CryptoPortfolioServiceHandler {
  public static fetchPortfolios(filters?: Partial<PortfolioFilterOptions>): PortfolioRiskMetric[] {
    return CryptoPortfolioService.getPortfolios(filters);
  }

  public static registerNewPortfolio(
    payload: Omit<PortfolioRiskMetric, "id" | "status">
  ): PortfolioRiskMetric {
    return CryptoPortfolioService.registerPortfolio(payload);
  }

  public static fetchRebalanceLogs(): RebalanceExecutionLog[] {
    return CryptoPortfolioService.getRebalanceLogs();
  }

  public static executePortfolioRebalance(portfolioId: string): RebalanceExecutionLog {
    return CryptoPortfolioService.executeRebalance(portfolioId);
  }
}
