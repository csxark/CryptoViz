/**
 * Enterprise Crypto Portfolio Risk & Rebalancing Analytics Service Engine
 * 
 * Architectural Specifications:
 * - Provides mathematical calculation routines for VaR (Value at Risk), CVaR (Conditional VaR),
 *   Portfolio Volatility (Covariance matrix multiplication), Sharpe Ratio, Sortino Ratio, and Max Drawdown.
 * - Formulates precise trade rebalancing execution orders based on target weight deviations.
 * - Performs multi-vector stress testing scenarios (Crypto Market Crash, Altcoin Capitulation, Volatility Spike).
 * - High-speed, deterministic mathematical algorithms optimized for real-time risk analytics engine.
 *
 * @module CryptoPortfolioRiskService
 * @version 2.4.0
 * @author Enterprise Cryptographic Architecture Team
 */

import {
  CryptoAssetAllocation,
  PortfolioState,
  PortfolioRiskMetrics,
  RebalanceTradeInstruction,
  StressTestScenario
} from './CryptoPortfolioRiskModel';

export class CryptoPortfolioRiskService {
  private portfolioState: PortfolioState;

  constructor(portfolioState?: PortfolioState) {
    this.portfolioState = portfolioState || new PortfolioState();
  }

  public getPortfolioState(): PortfolioState {
    return this.portfolioState;
  }

  /**
   * Computes comprehensive enterprise portfolio risk metrics.
   */
  public calculateRiskMetrics(riskFreeRate: number = 0.045): PortfolioRiskMetrics {
    const assets = this.portfolioState.getAssets();
    if (assets.length === 0) {
      return {
        totalValueUsd: 0,
        portfolioReturn: 0,
        portfolioVolatility: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        valueAtRisk95: 0,
        conditionalVaR95: 0,
        diversificationScore: 0,
        herfindahlIndex: 0
      };
    }

    // 1. Total Portfolio USD Value
    const totalValueUsd = assets.reduce((sum, asset) => sum + (asset.priceUsd * asset.quantityHeld), 0);

    // 2. Weighted Portfolio Expected Annual Return
    const weightedReturns = assets.map(asset => {
      const avgDaily = asset.historicalReturns.reduce((a, b) => a + b, 0) / (asset.historicalReturns.length || 1);
      const annualizedReturn = avgDaily * 365;
      return asset.currentWeight * annualizedReturn;
    });
    const portfolioReturn = weightedReturns.reduce((a, b) => a + b, 0);

    // 3. Covariance Matrix & Portfolio Volatility
    const covMatrix = this.calculateCovarianceMatrix(assets);
    let portfolioVariance = 0;
    for (let i = 0; i < assets.length; i++) {
      for (let j = 0; j < assets.length; j++) {
        portfolioVariance += assets[i].currentWeight * assets[j].currentWeight * covMatrix[i][j];
      }
    }
    const portfolioVolatility = Math.sqrt(Math.max(portfolioVariance, 0.0001));

    // 4. Sharpe Ratio
    const excessReturn = portfolioReturn - riskFreeRate;
    const sharpeRatio = excessReturn / Math.max(portfolioVolatility, 0.001);

    // 5. Downside Volatility & Sortino Ratio
    const downsideVariance = assets.reduce((acc, asset) => {
      const negativeReturns = asset.historicalReturns.filter(r => r < 0);
      const downsideVol = negativeReturns.length > 0
        ? Math.sqrt(negativeReturns.reduce((s, r) => s + r * r, 0) / negativeReturns.length) * Math.sqrt(365)
        : asset.volatility30d * 0.5;
      return acc + (asset.currentWeight * asset.currentWeight * downsideVol * downsideVol);
    }, 0);
    const downsideVolatility = Math.sqrt(Math.max(downsideVariance, 0.0001));
    const sortinoRatio = excessReturn / Math.max(downsideVolatility, 0.001);

    // 6. Value at Risk (VaR 95%) & Conditional VaR (CVaR 95%)
    // Parametric VaR (1.645 standard deviations for 95% confidence)
    const zScore95 = 1.645;
    const valueAtRisk95 = totalValueUsd * (zScore95 * (portfolioVolatility / Math.sqrt(365)));
    const conditionalVaR95 = valueAtRisk95 * 1.28; // Standard normal tail ratio factor for CVaR

    // 7. Max Drawdown Estimation
    const maxDrawdown = Math.min(
      0.85,
      Math.max(0.12, assets.reduce((acc, a) => acc + (a.currentWeight * a.volatility30d * 0.95), 0))
    );

    // 8. Concentration & Diversification Metrics
    // Herfindahl-Hirschman Index (HHI): sum of squared percentage weights (0 to 10,000)
    const herfindahlIndex = assets.reduce((sum, asset) => sum + Math.pow(asset.currentWeight * 100, 2), 0);

    // Shannon Entropy Diversification Score (0 to 100)
    const maxEntropy = Math.log(assets.length || 1);
    const actualEntropy = assets.reduce((sum, asset) => {
      const p = asset.currentWeight;
      return p > 0 ? sum - p * Math.log(p) : sum;
    }, 0);
    const diversificationScore = maxEntropy > 0 ? Math.min(100, Math.max(0, (actualEntropy / maxEntropy) * 100)) : 0;

    return {
      totalValueUsd: Number(totalValueUsd.toFixed(2)),
      portfolioReturn: Number(portfolioReturn.toFixed(4)),
      portfolioVolatility: Number(portfolioVolatility.toFixed(4)),
      sharpeRatio: Number(sharpeRatio.toFixed(2)),
      sortinoRatio: Number(sortinoRatio.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(4)),
      valueAtRisk95: Number(valueAtRisk95.toFixed(2)),
      conditionalVaR95: Number(conditionalVaR95.toFixed(2)),
      diversificationScore: Number(diversificationScore.toFixed(1)),
      herfindahlIndex: Number(herfindahlIndex.toFixed(0))
    };
  }

  /**
   * Generates actionable rebalance trade instructions based on target weight differences.
   */
  public generateRebalanceTrades(thresholdPercent: number = 0.01): RebalanceTradeInstruction[] {
    const assets = this.portfolioState.getAssets();
    const totalValueUsd = assets.reduce((sum, a) => sum + (a.priceUsd * a.quantityHeld), 0);
    const instructions: RebalanceTradeInstruction[] = [];

    assets.forEach(asset => {
      const weightDelta = asset.targetWeight - asset.currentWeight;
      const absDelta = Math.abs(weightDelta);

      if (absDelta >= thresholdPercent) {
        const action: 'BUY' | 'SELL' = weightDelta > 0 ? 'BUY' : 'SELL';
        const amountUsd = Math.abs(weightDelta * totalValueUsd);
        const estimatedQuantity = asset.priceUsd > 0 ? amountUsd / asset.priceUsd : 0;
        
        // Slippage model function based on trade size vs asset liquidity proxy
        const estimatedSlippage = Number(Math.min(0.025, 0.0005 + (amountUsd / 5000000) * 0.01).toFixed(4));

        instructions.push({
          assetId: asset.id,
          symbol: asset.symbol,
          action,
          currentWeight: asset.currentWeight,
          targetWeight: asset.targetWeight,
          weightDelta: Number(weightDelta.toFixed(4)),
          amountUsd: Number(amountUsd.toFixed(2)),
          estimatedQuantity: Number(estimatedQuantity.toFixed(4)),
          estimatedSlippage
        });
      } else {
        instructions.push({
          assetId: asset.id,
          symbol: asset.symbol,
          action: 'HOLD',
          currentWeight: asset.currentWeight,
          targetWeight: asset.targetWeight,
          weightDelta: 0,
          amountUsd: 0,
          estimatedQuantity: 0,
          estimatedSlippage: 0
        });
      }
    });

    return instructions;
  }

  /**
   * Executes rebalance strategy and aligns current asset weights with target weights.
   */
  public executeRebalance(actor: string = 'AutomatedRebalancer'): void {
    const assets = this.portfolioState.getAssets();
    assets.forEach(asset => {
      asset.currentWeight = asset.targetWeight;
    });
    this.portfolioState.normalizeCurrentWeights();
  }

  /**
   * Evaluates multi-vector macro stress testing scenarios against portfolio asset allocations.
   */
  public runStressTesting(): StressTestScenario[] {
    const assets = this.portfolioState.getAssets();
    const totalValueUsd = assets.reduce((sum, a) => sum + (a.priceUsd * a.quantityHeld), 0);

    const scenarios: Omit<StressTestScenario, 'estimatedPortfolioDrawdown' | 'impactedValueUsd'>[] = [
      {
        id: 'btc-halving-dump',
        name: 'Macro Liquidation Cascade (-35% BTC Shock)',
        description: 'Simulates systemic market liquidation driven by a sudden -35% crash in Bitcoin price.',
        btcShockPercent: -0.35,
        ethShockPercent: -0.42,
        altcoinShockPercent: -0.55,
        marketVolatilityMultiplier: 2.2
      },
      {
        id: 'defi-exploit-contagion',
        name: 'DeFi & Altcoin Capitulation (-60% Alt Shock)',
        description: 'Simulates smart contract exploit contagion causing extreme sell-off in Altcoins and DeFi tokens.',
        btcShockPercent: -0.15,
        ethShockPercent: -0.28,
        altcoinShockPercent: -0.60,
        marketVolatilityMultiplier: 2.8
      },
      {
        id: 'fed-hawkish-pivot',
        name: 'Federal Reserve Rate Hike Shock (-20% All)',
        description: 'Macro risk-off environment triggered by unexpected central bank interest rate tightening.',
        btcShockPercent: -0.20,
        ethShockPercent: -0.22,
        altcoinShockPercent: -0.30,
        marketVolatilityMultiplier: 1.5
      },
      {
        id: 'stablecoin-depeg-panic',
        name: 'Stablecoin De-peg Stress Scenario',
        description: 'Market panic following minor stablecoin de-pegging, leading to flight-to-quality into BTC and fiat.',
        btcShockPercent: 0.08,
        ethShockPercent: -0.10,
        altcoinShockPercent: -0.35,
        marketVolatilityMultiplier: 3.0
      }
    ];

    return scenarios.map(scen => {
      let totalAssetLossUsd = 0;

      assets.forEach(asset => {
        const assetValue = asset.currentWeight * totalValueUsd;
        let shock = 0;

        if (asset.symbol === 'BTC') shock = scen.btcShockPercent;
        else if (asset.symbol === 'ETH') shock = scen.ethShockPercent;
        else if (asset.category === 'Stablecoin') shock = scen.id === 'stablecoin-depeg-panic' ? -0.05 : 0;
        else shock = scen.altcoinShockPercent;

        const assetLoss = assetValue * shock;
        totalAssetLossUsd += assetLoss;
      });

      const estimatedPortfolioDrawdown = Number((totalAssetLossUsd / Math.max(totalValueUsd, 1)).toFixed(4));
      const impactedValueUsd = Number((totalValueUsd + totalAssetLossUsd).toFixed(2));

      return {
        ...scen,
        estimatedPortfolioDrawdown,
        impactedValueUsd
      };
    });
  }

  /**
   * Helper routine to generate asset covariance matrix from volatility and correlation proxies.
   */
  private calculateCovarianceMatrix(assets: CryptoAssetAllocation[]): number[][] {
    const n = assets.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = assets[i].volatility30d * assets[i].volatility30d;
        } else {
          // Empirical correlation estimation model between asset categories
          let correlation = 0.65; // Default crypto intra-market correlation
          if (assets[i].category === 'Stablecoin' || assets[j].category === 'Stablecoin') {
            correlation = 0.02;
          } else if (assets[i].symbol === 'BTC' || assets[j].symbol === 'BTC') {
            correlation = 0.78;
          }
          matrix[i][j] = correlation * assets[i].volatility30d * assets[j].volatility30d;
        }
      }
    }
    return matrix;
  }
}
