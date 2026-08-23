'use client';

/**
 * Enterprise Options Greeks & Volatility Surface Visualizer Component
 * 
 * Architectural Specifications:
 * - Interactive glassmorphic React visualizer for Black-Scholes options pricing, Greeks (Delta, Gamma, Theta, Vega, Rho),
 *   Newton-Raphson Implied Volatility solver, and Deribit volatility smile/skew surface.
 *
 * @module OptionsGreeksVisualizer
 * @version 6.0.0
 * @author Enterprise Cryptographic Architecture Team
 */

import React, { useState, useMemo } from 'react';
import { OptionsGreeksService } from '@/lib/OptionsGreeksService';
import { OptionContract, OptionType } from '@/lib/OptionsGreeksModel';

export default function OptionsGreeksVisualizer() {
  const [service] = useState(() => new OptionsGreeksService());

  const [underlyingPrice, setUnderlyingPrice] = useState<number>(65000);
  const [strikePrice, setStrikePrice] = useState<number>(65000);
  const [daysToExp, setDaysToExp] = useState<number>(30);
  const [volatilityPercent, setVolatilityPercent] = useState<number>(60);
  const [optionType, setOptionType] = useState<OptionType>('CALL');
  const [targetMarketPrice, setTargetMarketPrice] = useState<number>(3200);

  const contract: OptionContract = useMemo(() => {
    return {
      id: 'custom-contract',
      symbol: `BTC-CUSTOM-${strikePrice}-${optionType[0]}`,
      underlyingSymbol: 'BTC',
      optionType,
      strikePriceUsd: strikePrice,
      underlyingPriceUsd: underlyingPrice,
      daysToExpiration: daysToExp,
      riskFreeRate: 0.045,
      volatility: volatilityPercent / 100
    };
  }, [underlyingPrice, strikePrice, daysToExp, volatilityPercent, optionType]);

  const greeks = useMemo(() => {
    return service.calculateOptionGreeks(contract);
  }, [service, contract]);

  const solvedIv = useMemo(() => {
    return service.calculateImpliedVolatility(targetMarketPrice, contract);
  }, [service, targetMarketPrice, contract]);

  const skewPoints = useMemo(() => {
    return service.generateVolatilitySkew(underlyingPrice);
  }, [service, underlyingPrice]);

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* Banner */}
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded-full border border-purple-500/30 uppercase tracking-wider">
              Crypto Options & Derivatives
            </span>
            <span className="text-slate-400 text-xs font-mono">v6.0.0 • Black-Scholes & IV Solver</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-400">
            Options Greeks & Volatility Surface Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Real-time Black-Scholes option pricing engine, analytical Greeks (Δ, Γ, Θ, ν, ρ), Newton-Raphson Implied Volatility solver, and volatility skew surface.
          </p>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Option Premium</div>
          <div className="text-xl font-bold text-purple-300">${greeks.priceUsd.toLocaleString()}</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">Black-Scholes</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Delta (Δ)</div>
          <div className="text-xl font-bold text-cyan-400">{greeks.delta}</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">dC / dS</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Gamma (Γ)</div>
          <div className="text-xl font-bold text-emerald-400">{greeks.gamma}</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">d²C / dS²</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Theta (Θ / Day)</div>
          <div className="text-xl font-bold text-rose-400">${greeks.theta}</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">Daily Decay</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Vega (ν / 1% Vol)</div>
          <div className="text-xl font-bold text-amber-400">${greeks.vega}</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">Vol Sensitivity</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Solved IV</div>
          <div className="text-xl font-bold text-fuchsia-300">{(solvedIv * 100).toFixed(1)}%</div>
          <div className="text-slate-400 text-xs mt-1 font-mono">Newton-Raphson</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <h2 className="text-lg font-bold text-slate-200 mb-4">Option Parameters</h2>

          <div className="flex gap-2 mb-4">
            {(['CALL', 'PUT'] as const).map(t => (
              <button
                key={t}
                onClick={() => setOptionType(t)}
                className={`flex-1 py-2 text-xs font-bold rounded transition-colors ${
                  optionType === t
                    ? 'bg-purple-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t} OPTION
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Underlying BTC Price ($USD)</label>
            <input
              type="number"
              value={underlyingPrice}
              onChange={e => setUnderlyingPrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Strike Price ($USD)</label>
            <input
              type="number"
              value={strikePrice}
              onChange={e => setStrikePrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Days to Expiration (DTE)</label>
            <input
              type="number"
              value={daysToExp}
              onChange={e => setDaysToExp(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 font-mono"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Implied Volatility</span>
              <span className="text-purple-300 font-mono font-bold">{volatilityPercent}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              value={volatilityPercent}
              onChange={e => setVolatilityPercent(parseInt(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Volatility Skew Table */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-slate-200 mb-4">Deribit Volatility Skew Surface</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-3 px-3">Strike Price ($USD)</th>
                  <th className="py-3 px-3">Moneyness (K/S)</th>
                  <th className="py-3 px-3">Implied Volatility (%)</th>
                  <th className="py-3 px-3 text-right">Option Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {skewPoints.map(point => (
                  <tr key={point.strikePriceUsd} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 text-slate-200 font-bold">${point.strikePriceUsd.toLocaleString()}</td>
                    <td className="py-3 px-3 text-slate-400">{point.moneyness}</td>
                    <td className="py-3 px-3 text-purple-300 font-bold">{point.impliedVolatilityPercent}%</td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 text-xs rounded ${point.optionType === 'CALL' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {point.optionType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
