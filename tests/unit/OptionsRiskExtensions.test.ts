/**
 * Options Risk Extensions Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { OptionsRiskExtensions } from '@/lib/OptionsRiskExtensions';

describe('OptionsRiskExtensions Tests', () => {
  it('should calculate accurate delta hedge instruction', () => {
    const hedge = OptionsRiskExtensions.calculateDeltaHedge(1.5, 65000);
    expect(hedge.tradeAction).toBe('SELL_UNDERLYING');
    expect(hedge.underlyingAmountToTrade).toBe(1.5);
  });
});
