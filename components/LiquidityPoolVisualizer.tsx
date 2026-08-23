'use client';

/**
 * Enterprise Liquidity Pool & Impermanent Loss Analytics Visualizer Component
 * 
 * Architectural Specifications:
 * - Interactive glassmorphic React dashboard for Uniswap v2/v3 concentrated liquidity modeling.
 * - Real-time Price Ratio Sliders, Impermanent Loss Calculators, Range Tick Adjusters, Fee APY yield forecasting.
 * - Capital efficiency leverage gauges, Break-even timeline indicators, and comparative V2 vs V3 loss matrix.
 *
 * @module LiquidityPoolVisualizer
 * @version 3.1.0
 * @author Enterprise Cryptographic Architecture Team
 */

import React, { useState, useMemo } from 'react';
import { LiquidityPoolService } from '@/lib/LiquidityPoolService';
import { LiquidityPoolConfig } from '@/lib/LiquidityPoolModel';

export default function LiquidityPoolVisualizer() {
  const [service] = useState(() => new LiquidityPoolService());
  const pools = service.getPoolState().getPools();

  const [selectedPoolId, setSelectedPoolId] = useState<string>(pools[0]?.id || '');
  const [priceChangePercent, setPriceChangePercent] = useState<number>(25); // +25% price shift
  const [depositUsd, setDepositUsd] = useState<number>(10000);
  const [rangeLowerUsd, setRangeLowerUsd] = useState<number>(2800);
  const [rangeUpperUsd, setRangeUpperUsd] = useState<number>(4200);
  const [holdingDays, setHoldingDays] = useState<number>(30);
  const [selectedTab, setSelectedTab] = useState<'SIMULATOR' | 'MATRIX' | 'POOLS'>('SIMULATOR');

  const selectedPool = useMemo(() => {
    return service.getPoolState().getPoolById(selectedPoolId) || pools[0];
  }, [selectedPoolId, pools, service]);

  const initialPrice = selectedPool.tokenA.priceUsd;
  const simulatedPrice = initialPrice * (1 + priceChangePercent / 100);

  const ilMetricsV2 = useMemo(() => {
    return service.calculateConstantProductIL(initialPrice, simulatedPrice, depositUsd);
  }, [service, initialPrice, simulatedPrice, depositUsd]);

  const ilMetricsV3 = useMemo(() => {
    return service.calculateConcentratedLiquidityIL(initialPrice, simulatedPrice, rangeLowerUsd, rangeUpperUsd, depositUsd);
  }, [service, initialPrice, simulatedPrice, rangeLowerUsd, rangeUpperUsd, depositUsd]);

  const yieldProjection = useMemo(() => {
    return service.projectYieldAndBreakEven(selectedPool, depositUsd, priceChangePercent, holdingDays);
  }, [service, selectedPool, depositUsd, priceChangePercent, holdingDays]);

  const priceMatrix = useMemo(() => {
    return service.generatePriceMatrixSimulation(initialPrice, rangeLowerUsd, rangeUpperUsd);
  }, [service, initialPrice, rangeLowerUsd, rangeUpperUsd]);

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* Top Header */}
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-teal-500/20 text-teal-400 text-xs font-semibold rounded-full border border-teal-500/30 uppercase tracking-wider">
              DeFi Yield & IL Analytics
            </span>
            <span className="text-slate-400 text-xs font-mono">v3.1.0 • Uniswap v2 / v3 Protocol Engine</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400">
            Liquidity Pool & Impermanent Loss Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Mathematical constant product (x * y = k) & concentrated liquidity range bounds, fee yield projections,
            break-even calculations, and capital efficiency leverage metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedPoolId}
            onChange={e => setSelectedPoolId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-teal-500 font-medium"
          >
            {pools.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.protocol})
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Top KPI Telemetry Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Price Change</div>
          <div className={`text-xl font-bold ${priceChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {priceChangePercent > 0 ? `+${priceChangePercent}%` : `${priceChangePercent}%`}
          </div>
          <div className="text-slate-400 text-xs mt-1 font-mono">${simulatedPrice.toLocaleString()}</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">V2 Impermanent Loss</div>
          <div className="text-xl font-bold text-rose-400">{(ilMetricsV2.impermanentLossPercent * 100).toFixed(2)}%</div>
          <div className="text-rose-400/80 text-xs mt-1 font-mono">-${Math.abs(ilMetricsV2.impermanentLossUsd).toLocaleString()}</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">V3 Concentrated Loss</div>
          <div className="text-xl font-bold text-amber-400">{(ilMetricsV3.impermanentLossPercent * 100).toFixed(2)}%</div>
          <div className="text-amber-400/80 text-xs mt-1 font-mono">-${Math.abs(ilMetricsV3.impermanentLossUsd).toLocaleString()}</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Projected Fee APY</div>
          <div className="text-xl font-bold text-teal-300">{yieldProjection.projectedFeeApy}%</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">Est. Volume Rewards</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Net Projected APY</div>
          <div className={`text-xl font-bold ${yieldProjection.projectedNetApy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {yieldProjection.projectedNetApy}%
          </div>
          <div className="text-slate-400 text-xs mt-1 font-mono">Net of Gas & IL</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Break-Even Period</div>
          <div className="text-xl font-bold text-cyan-300">{yieldProjection.breakEvenDays} Days</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">Fees surpass IL</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 mb-6 gap-2">
        {(['SIMULATOR', 'MATRIX', 'POOLS'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
              selectedTab === tab
                ? 'border-teal-400 text-teal-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {tab === 'SIMULATOR' && '⚡ Impermanent Loss & Yield Simulator'}
            {tab === 'MATRIX' && '📈 V2 vs V3 Price Ratio Loss Matrix'}
            {tab === 'POOLS' && '💧 Active DeFi Pools Directory'}
          </button>
        ))}
      </div>

      {/* TAB 1: SIMULATOR */}
      {selectedTab === 'SIMULATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls Panel */}
          <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-slate-200 mb-4">Simulation Parameters</h2>

            {/* Price Change Slider */}
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-400 font-medium">Asset A Price Change</span>
                <span className={`font-mono font-bold ${priceChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {priceChangePercent > 0 ? `+${priceChangePercent}%` : `${priceChangePercent}%`}
                </span>
              </div>
              <input
                type="range"
                min="-80"
                max="200"
                step="5"
                value={priceChangePercent}
                onChange={e => setPriceChangePercent(parseInt(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500 font-mono mt-1">
                <span>-80%</span>
                <span>0%</span>
                <span>+200%</span>
              </div>
            </div>

            {/* Deposit Capital */}
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-2">LP Capital Investment (USD)</label>
              <input
                type="number"
                value={depositUsd}
                onChange={e => setDepositUsd(Math.max(100, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            {/* Holding Period */}
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-2">Liquidity Holding Days</label>
              <input
                type="number"
                value={holdingDays}
                onChange={e => setHoldingDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            {/* V3 Concentrated Tick Range */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-teal-300">Uniswap v3 Tick Range ($USD)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Lower Price Bound</span>
                  <input
                    type="number"
                    value={rangeLowerUsd}
                    onChange={e => setRangeLowerUsd(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Upper Price Bound</span>
                  <input
                    type="number"
                    value={rangeUpperUsd}
                    onChange={e => setRangeUpperUsd(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200"
                  />
                </div>
              </div>
              <div className="text-xs text-slate-400">
                Capital Efficiency Multiplier:{' '}
                <span className="font-mono font-bold text-teal-300">{ilMetricsV3.capitalEfficiencyLeverage}x</span>
              </div>
            </div>
          </div>

          {/* Comparative Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-slate-200 mb-4">HODL vs Pool Liquidity Outcome</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Constant Product V2 Card */}
                <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-cyan-300">Uniswap v2 (Full Range 50/50)</span>
                    <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-mono rounded">1x Baseline</span>
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Initial Deposit:</span>
                      <span className="text-slate-200">${depositUsd.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">HODL Strategy Value:</span>
                      <span className="text-slate-200">${ilMetricsV2.holdValueUsd.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pool Capital Value:</span>
                      <span className="text-slate-200">${ilMetricsV2.poolValueUsd.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800/80 pt-2">
                      <span className="text-slate-400">Impermanent Loss:</span>
                      <span className="text-rose-400 font-bold">
                        {(ilMetricsV2.impermanentLossPercent * 100).toFixed(2)}% (-${Math.abs(ilMetricsV2.impermanentLossUsd).toLocaleString()})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Concentrated V3 Card */}
                <div className="p-5 bg-slate-950 rounded-xl border border-teal-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-teal-300">Uniswap v3 (Concentrated Range)</span>
                    <span className="px-2 py-0.5 bg-teal-500/20 text-teal-400 text-xs font-mono rounded">
                      {ilMetricsV3.capitalEfficiencyLeverage}x Leverage
                    </span>
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Active Tick Range:</span>
                      <span className="text-slate-200">${rangeLowerUsd} – ${rangeUpperUsd}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">HODL Strategy Value:</span>
                      <span className="text-slate-200">${ilMetricsV3.holdValueUsd.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pool Capital Value:</span>
                      <span className="text-slate-200">${ilMetricsV3.poolValueUsd.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800/80 pt-2">
                      <span className="text-slate-400">Impermanent Loss:</span>
                      <span className="text-amber-400 font-bold">
                        {(ilMetricsV3.impermanentLossPercent * 100).toFixed(2)}% (-${Math.abs(ilMetricsV3.impermanentLossUsd).toLocaleString()})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Yield Forecast Banner */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-md font-bold text-slate-200 mb-3">Net Profitability & Fee Amortization</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Est. Daily Fee Revenue</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    +${((depositUsd * (yieldProjection.projectedFeeApy / 100)) / 365).toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Total Fee Earnings ({holdingDays}d)</span>
                  <span className="text-teal-300 font-bold text-sm">
                    +${(((depositUsd * (yieldProjection.projectedFeeApy / 100)) / 365) * holdingDays).toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Impermanent Loss ({holdingDays}d)</span>
                  <span className="text-rose-400 font-bold text-sm">
                    -${Math.abs(ilMetricsV3.impermanentLossUsd).toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Net Position Profit</span>
                  <span className={`font-bold text-sm ${yieldProjection.projectedNetApy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${((((depositUsd * (yieldProjection.projectedFeeApy / 100)) / 365) * holdingDays) - Math.abs(ilMetricsV3.impermanentLossUsd) - 45).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MATRIX */}
      {selectedTab === 'MATRIX' && (
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-slate-200 mb-4">Price Ratio Impermanent Loss Matrix</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-3 px-3">Price Ratio (P / P0)</th>
                  <th className="py-3 px-3">Simulated Asset Price</th>
                  <th className="py-3 px-3">Uniswap v2 Loss (%)</th>
                  <th className="py-3 px-3">Uniswap v3 Concentrated Loss (%)</th>
                  <th className="py-3 px-3 text-right">Amplification Factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {priceMatrix.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 text-cyan-300 font-bold">{item.priceRatio}x</td>
                    <td className="py-3 px-3 text-slate-200">${item.simulatedPrice.toLocaleString()}</td>
                    <td className="py-3 px-3 text-rose-400">{item.v2LossPercent}%</td>
                    <td className="py-3 px-3 text-amber-400 font-bold">{item.v3LossPercent}%</td>
                    <td className="py-3 px-3 text-right text-teal-300 font-bold">
                      {item.v2LossPercent !== 0 ? (item.v3LossPercent / item.v2LossPercent).toFixed(1) : '1.0'}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: POOLS DIRECTORY */}
      {selectedTab === 'POOLS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pools.map(p => (
            <div key={p.id} className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-teal-300">{p.name}</h3>
                  <span className="px-2 py-0.5 bg-teal-500/20 text-teal-400 text-xs font-mono rounded border border-teal-500/30">
                    {p.protocol}
                  </span>
                </div>
                <div className="space-y-2 text-xs font-mono text-slate-400 mb-4">
                  <div className="flex justify-between">
                    <span>Fee Tier:</span>
                    <span className="text-slate-200">{p.feeTierPercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Value Locked:</span>
                    <span className="text-slate-200">${p.totalValueLockedUsd.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>24h Trading Volume:</span>
                    <span className="text-emerald-400 font-bold">${p.dailyVolumeUsd.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedPoolId(p.id);
                  setSelectedTab('SIMULATOR');
                }}
                className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded shadow transition-colors"
              >
                Analyze Pool Yield
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
