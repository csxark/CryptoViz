'use client';

/**
 * Enterprise Crypto Portfolio Risk & Rebalancing Analytics Component Visualizer
 * 
 * Architectural Specifications:
 * - Interactive glassmorphic React visualizer featuring real-time risk telemetry, portfolio asset allocation sliders,
 *   Value at Risk (VaR 95%) gauge indicators, multi-vector macro stress testing simulator, and algorithmic rebalancing suite.
 * - Engineered with modern UI patterns (Google Inter typography, HSL dark themes, vibrant glowing cards, smooth transitions).
 * - Fully customizable target allocations with real-time recalculation of Sharpe ratios, CVaR, and Herfindahl concentration metrics.
 *
 * @module CryptoPortfolioRiskVisualizer
 * @version 2.4.0
 * @author Enterprise Cryptographic Architecture Team
 */

import React, { useState, useMemo } from 'react';
import { CryptoAssetAllocation, RebalanceStrategy } from '@/lib/CryptoPortfolioRiskModel';
import { CryptoPortfolioRiskService } from '@/lib/CryptoPortfolioRiskService';

export default function CryptoPortfolioRiskVisualizer() {
  const [riskService] = useState(() => new CryptoPortfolioRiskService());
  const [, setRefreshState] = useState(0);
  const [selectedTab, setSelectedTab] = useState<'OVERVIEW' | 'REBALANCE' | 'STRESS_TEST' | 'AUDIT_LOGS'>('OVERVIEW');
  const [customAssetSymbol, setCustomAssetSymbol] = useState('');
  const [customAssetName, setCustomAssetName] = useState('');
  const [customAssetPrice, setCustomAssetPrice] = useState(100);
  const [customAssetVol, setCustomAssetVol] = useState(0.50);

  const forceRender = () => setRefreshState(prev => prev + 1);

  const portfolioState = riskService.getPortfolioState();
  const assets = portfolioState.getAssets();
  const riskMetrics = useMemo(() => riskService.calculateRiskMetrics(), [assets, portfolioState.getRebalanceStrategy(), selectedTab]);
  const rebalanceTrades = useMemo(() => riskService.generateRebalanceTrades(), [assets, portfolioState.getRebalanceStrategy()]);
  const stressScenarios = useMemo(() => riskService.runStressTesting(), [assets]);
  const auditLogs = portfolioState.getAuditLogs();

  const handleStrategyChange = (strategy: RebalanceStrategy) => {
    portfolioState.setRebalanceStrategy(strategy);
    forceRender();
  };

  const handleWeightChange = (id: string, newWeight: number) => {
    const asset = portfolioState.getAssetById(id);
    if (asset) {
      asset.targetWeight = Number(newWeight.toFixed(4));
      portfolioState.setRebalanceStrategy('CUSTOM_TARGET');
      forceRender();
    }
  };

  const handleExecuteRebalance = () => {
    riskService.executeRebalance('UserVisualizerUI');
    forceRender();
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAssetSymbol || !customAssetName) return;

    const newAsset: CryptoAssetAllocation = {
      id: `custom-${customAssetSymbol.toLowerCase()}-${Date.now()}`,
      symbol: customAssetSymbol.toUpperCase(),
      name: customAssetName,
      category: 'Layer1',
      currentWeight: 0.10,
      targetWeight: 0.10,
      priceUsd: customAssetPrice,
      quantityHeld: 10,
      volatility30d: customAssetVol,
      beta: 1.1,
      historicalReturns: [0.01, -0.02, 0.03, -0.01, 0.02, -0.015, 0.025]
    };

    portfolioState.addOrUpdateAsset(newAsset, 'UserVisualizerUI');
    setCustomAssetSymbol('');
    setCustomAssetName('');
    forceRender();
  };

  const handleRemoveAsset = (id: string) => {
    portfolioState.removeAsset(id, 'UserVisualizerUI');
    forceRender();
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* Header Banner */}
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-full border border-cyan-500/30 uppercase tracking-wider">
              Enterprise Risk Intelligence
            </span>
            <span className="text-slate-400 text-xs font-mono">v2.4.0 • Zero-Egress Architecture</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">
            Crypto Portfolio Risk & Rebalancing Suite
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Real-time Value-at-Risk (VaR), Conditional Shortfall (CVaR), Shannon Entropy Diversification Index,
            and algorithmic portfolio rebalancing engine with macro stress testing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExecuteRebalance}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-emerald-900/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            ⚡ Auto-Rebalance Portfolio
          </button>
        </div>
      </header>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Total Value</div>
          <div className="text-xl font-bold text-slate-100">${riskMetrics.totalValueUsd.toLocaleString()}</div>
          <div className="text-emerald-400 text-xs mt-1 font-mono">Active Allocation</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Exp. Annual Return</div>
          <div className="text-xl font-bold text-cyan-400">{(riskMetrics.portfolioReturn * 100).toFixed(1)}%</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">Weighted Mean</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Portfolio Volatility</div>
          <div className="text-xl font-bold text-amber-400">{(riskMetrics.portfolioVolatility * 100).toFixed(1)}%</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">30D Annualized</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Sharpe / Sortino</div>
          <div className="text-xl font-bold text-indigo-300">
            {riskMetrics.sharpeRatio} <span className="text-slate-500 text-sm font-normal">/ {riskMetrics.sortinoRatio}</span>
          </div>
          <div className="text-slate-400 text-xs mt-1 font-mono">Rf = 4.5%</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">95% Daily VaR</div>
          <div className="text-xl font-bold text-rose-400">${riskMetrics.valueAtRisk95.toLocaleString()}</div>
          <div className="text-rose-400/80 text-xs mt-1 font-mono">CVaR: ${riskMetrics.conditionalVaR95.toLocaleString()}</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Diversification</div>
          <div className="text-xl font-bold text-teal-300">{riskMetrics.diversificationScore}/100</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">HHI Index: {riskMetrics.herfindahlIndex}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 mb-6 gap-2">
        {(['OVERVIEW', 'REBALANCE', 'STRESS_TEST', 'AUDIT_LOGS'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
              selectedTab === tab
                ? 'border-cyan-400 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {tab === 'OVERVIEW' && '📊 Asset Allocation & Risk'}
            {tab === 'REBALANCE' && '🔄 Algorithmic Rebalancing'}
            {tab === 'STRESS_TEST' && '🌩️ Macro Stress Testing'}
            {tab === 'AUDIT_LOGS' && '📜 System Audit Trail'}
          </button>
        ))}
      </div>

      {/* TAB CONTENT 1: OVERVIEW */}
      {selectedTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Asset Allocation Table & Controls */}
          <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-200">Portfolio Asset Allocations</h2>
              <div className="text-xs text-slate-400 font-mono">Total Assets: {assets.length}</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-3">Asset</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Price</th>
                    <th className="py-3 px-3">30D Vol</th>
                    <th className="py-3 px-3">Current %</th>
                    <th className="py-3 px-3">Target %</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {assets.map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-200">{asset.symbol}</div>
                        <div className="text-xs text-slate-400">{asset.name}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {asset.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-200">${asset.priceUsd.toLocaleString()}</td>
                      <td className="py-3.5 px-3 font-mono text-amber-400">{(asset.volatility30d * 100).toFixed(0)}%</td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-cyan-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, asset.currentWeight * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-slate-200">{(asset.currentWeight * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={asset.targetWeight}
                          onChange={e => handleWeightChange(asset.id, parseFloat(e.target.value))}
                          className="w-24 accent-cyan-400 cursor-pointer"
                        />
                        <span className="font-mono text-xs text-cyan-300 ml-2">{(asset.targetWeight * 100).toFixed(1)}%</span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => handleRemoveAsset(asset.id)}
                          className="text-rose-400 hover:text-rose-300 text-xs px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Custom Asset Form */}
            <form onSubmit={handleAddAsset} className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3">
              <input
                type="text"
                placeholder="Symbol (e.g. LINK)"
                value={customAssetSymbol}
                onChange={e => setCustomAssetSymbol(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <input
                type="text"
                placeholder="Asset Name"
                value={customAssetName}
                onChange={e => setCustomAssetName(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <input
                type="number"
                placeholder="Price ($)"
                value={customAssetPrice}
                onChange={e => setCustomAssetPrice(parseFloat(e.target.value) || 0)}
                className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <input
                type="number"
                step="0.05"
                placeholder="Volatility (e.g. 0.60)"
                value={customAssetVol}
                onChange={e => setCustomAssetVol(parseFloat(e.target.value) || 0)}
                className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="col-span-2 sm:col-span-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded px-3 py-2 transition-colors"
              >
                + Add Asset
              </button>
            </form>
          </div>

          {/* Risk Metrics Visual Breakdown */}
          <div className="space-y-6">
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-md font-bold text-slate-200 mb-3">Portfolio Concentration (HHI)</h3>
              <p className="text-xs text-slate-400 mb-4">
                Herfindahl-Hirschman Index measures allocation concentration. Lower values indicate higher diversification health.
              </p>
              <div className="w-full bg-slate-950 h-4 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    riskMetrics.herfindahlIndex < 2500
                      ? 'bg-emerald-500'
                      : riskMetrics.herfindahlIndex < 4500
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, (riskMetrics.herfindahlIndex / 10000) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-slate-400 mt-2">
                <span>Well Diversified (&lt;2500)</span>
                <span className="font-bold text-slate-200">{riskMetrics.herfindahlIndex}</span>
                <span>Concentrated (&gt;5000)</span>
              </div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-md font-bold text-slate-200 mb-3">Value at Risk Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">95% Daily Parametric VaR:</span>
                  <span className="font-mono font-bold text-rose-400">${riskMetrics.valueAtRisk95.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">95% Conditional VaR (Expected Shortfall):</span>
                  <span className="font-mono font-bold text-rose-500">${riskMetrics.conditionalVaR95.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Max Historical Drawdown Estimate:</span>
                  <span className="font-mono font-bold text-amber-400">{(riskMetrics.maxDrawdown * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: REBALANCE */}
      {selectedTab === 'REBALANCE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-200 mb-4">Rebalancing Strategy Model</h2>
            <div className="space-y-3">
              {[
                { id: 'EQUAL_WEIGHT', name: 'Equal Weighting', desc: 'Distributes target weights uniformly across all assets.' },
                { id: 'RISK_PARITY', name: 'Risk Parity (Inverse Vol)', desc: 'Weights assets inversely proportional to 30-day volatility.' },
                { id: 'MIN_VOLATILITY', name: 'Minimum Volatility', desc: 'Minimizes expected variance using volatility & beta weights.' },
                { id: 'MAX_SHARPE', name: 'Max Sharpe Ratio', desc: 'Allocates higher target weight to risk-adjusted momentum leaders.' },
                { id: 'CUSTOM_TARGET', name: 'Custom Targets', desc: 'User-configured manual allocation target weights.' }
              ].map(strat => (
                <div
                  key={strat.id}
                  onClick={() => handleStrategyChange(strat.id as RebalanceStrategy)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    portfolioState.getRebalanceStrategy() === strat.id
                      ? 'bg-cyan-950/40 border-cyan-500/50 text-slate-100 shadow-md'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-sm text-cyan-300">{strat.name}</div>
                  <div className="text-xs mt-1 opacity-80">{strat.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-200">Execution Trade Instructions</h2>
              <button
                onClick={handleExecuteRebalance}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded shadow transition-colors"
              >
                Apply Rebalance Now
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-3">Asset</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3">Current → Target %</th>
                    <th className="py-3 px-3">Trade Amount (USD)</th>
                    <th className="py-3 px-3">Est. Quantity</th>
                    <th className="py-3 px-3 text-right">Est. Slippage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rebalanceTrades.map(trade => (
                    <tr key={trade.assetId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-slate-200">{trade.symbol}</td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded ${
                            trade.action === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : trade.action === 'SELL'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {trade.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs">
                        {(trade.currentWeight * 100).toFixed(1)}% → {(trade.targetWeight * 100).toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-200">
                        {trade.amountUsd > 0 ? `$${trade.amountUsd.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-cyan-300">
                        {trade.estimatedQuantity > 0 ? trade.estimatedQuantity.toLocaleString() : '—'}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-right text-slate-400">
                        {trade.estimatedSlippage > 0 ? `${(trade.estimatedSlippage * 100).toFixed(2)}%` : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: STRESS TEST */}
      {selectedTab === 'STRESS_TEST' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stressScenarios.map(scen => (
            <div key={scen.id} className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-rose-300">{scen.name}</h3>
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-xs font-mono rounded border border-rose-500/30">
                    Vol Multiplier: {scen.marketVolatilityMultiplier}x
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">{scen.description}</p>

                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono mb-4">
                  <div>
                    <span className="text-slate-500 block">BTC Shock</span>
                    <span className="text-rose-400 font-bold">{(scen.btcShockPercent * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">ETH Shock</span>
                    <span className="text-rose-400 font-bold">{(scen.ethShockPercent * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Alt Shock</span>
                    <span className="text-rose-400 font-bold">{(scen.altcoinShockPercent * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Estimated Portfolio Drawdown</div>
                  <div className="text-xl font-bold text-rose-400 font-mono">
                    {(scen.estimatedPortfolioDrawdown * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Post-Shock Portfolio Value</div>
                  <div className="text-xl font-bold text-slate-200 font-mono">
                    ${scen.impactedValueUsd.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB CONTENT 4: AUDIT LOGS */}
      {selectedTab === 'AUDIT_LOGS' && (
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-slate-200 mb-4">System Audit & Governance Trail</h2>
          <div className="space-y-3 font-mono text-xs">
            {auditLogs.map((log, idx) => (
              <div key={idx} className="p-3 bg-slate-950 rounded border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-cyan-400 font-semibold">[{log.eventType}]</span>
                  <span className="text-slate-300">{log.details}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-500 text-xs">
                  <span>Actor: {log.actor}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
