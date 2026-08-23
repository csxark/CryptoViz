/**
 * Enterprise Unit Test Suite for Options Greeks Engine
 * 
 * Architectural Specifications:
 * - Validates Black-Scholes call/put pricing formulas, analytical Greeks (Delta, Gamma, Theta, Vega, Rho),
 *   and Newton-Raphson implied volatility numerical solver.
 *
 * @module OptionsGreeksServiceTest
 * @version 6.0.0
 * @author Enterprise Cryptographic Architecture Team
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OptionsState, OptionContract } from '@/lib/OptionsGreeksModel';
import { OptionsGreeksService } from '@/lib/OptionsGreeksService';

describe('OptionsGreeksEngine Unit Tests', () => {
  let state: OptionsState;
  let service: OptionsGreeksService;

  beforeEach(() => {
    state = new OptionsState();
    service = new OptionsGreeksService(state);
  });

  describe('Black-Scholes & Greeks Computation', () => {
    it('should compute valid ATM Call option price and Delta close to 0.5', () => {
      const contract: OptionContract = {
        id: 'test-atm-call',
        symbol: 'BTC-CALL',
        underlyingSymbol: 'BTC',
        optionType: 'CALL',
        strikePriceUsd: 65000,
        underlyingPriceUsd: 65000,
        daysToExpiration: 30,
        riskFreeRate: 0.045,
        volatility: 0.60
      };

      const greeks = service.calculateOptionGreeks(contract);
      expect(greeks.priceUsd).toBeGreaterThan(0);
      expect(greeks.delta).toBeGreaterThan(0.45);
      expect(greeks.delta).toBeLessThan(0.65);
      expect(greeks.gamma).toBeGreaterThan(0);
      expect(greeks.vega).toBeGreaterThan(0);
      expect(greeks.theta).toBeLessThan(0); // Daily decay
    });

    it('should compute Put Delta as negative (Delta_put = Delta_call - 1)', () => {
      const contract: OptionContract = {
        id: 'test-atm-put',
        symbol: 'BTC-PUT',
        underlyingSymbol: 'BTC',
        optionType: 'PUT',
        strikePriceUsd: 65000,
        underlyingPriceUsd: 65000,
        daysToExpiration: 30,
        riskFreeRate: 0.045,
        volatility: 0.60
      };

      const greeks = service.calculateOptionGreeks(contract);
      expect(greeks.delta).toBeLessThan(0);
      expect(greeks.delta).toBeGreaterThan(-1.0);
    });
  });

  describe('Newton-Raphson Implied Volatility Solver', () => {
    it('should solve for IV given market price accurately', () => {
      const contract: OptionContract = {
        id: 'test-iv',
        symbol: 'BTC-CALL',
        underlyingSymbol: 'BTC',
        optionType: 'CALL',
        strikePriceUsd: 65000,
        underlyingPriceUsd: 65000,
        daysToExpiration: 30,
        riskFreeRate: 0.045,
        volatility: 0.60
      };

      const targetGreeks = service.calculateOptionGreeks(contract);
      const solvedIv = service.calculateImpliedVolatility(targetGreeks.priceUsd, contract);

      expect(solvedIv).toBeCloseTo(0.60, 2);
    });
  });
});
