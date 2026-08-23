/**
 * Crypto Options Volatility Smile & Term Structure Helper
 */

export interface VolatilityTermStructure {
  expiryDays: number;
  atmVolatilityPercent: number;
}

export class OptionsVolatilitySurfaceEngine {
  public static generateTermStructure(): VolatilityTermStructure[] {
    return [
      { expiryDays: 7, atmVolatilityPercent: 52.5 },
      { expiryDays: 14, atmVolatilityPercent: 55.0 },
      { expiryDays: 30, atmVolatilityPercent: 60.0 },
      { expiryDays: 60, atmVolatilityPercent: 65.5 },
      { expiryDays: 90, atmVolatilityPercent: 68.0 }
    ];
  }
}
