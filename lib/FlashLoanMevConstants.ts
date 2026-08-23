/**
 * Flash Loan MEV Relay & Gas Simulation Constants
 */

export const FLASH_LOAN_MEV_CONSTANTS = {
  DEFAULT_FLASH_LOAN_FEE_BPS: 9, // 0.09% (9 BPS)
  FLASHBOTS_RELAY_ENDPOINT: 'https://relay.flashbots.net',
  EQUALIZER_FEE_BPS: 5,
  MAX_ALLOWED_SLIPPAGE_BPS: 50
};

export function getMevConstantValue(key: string): any {
  return (FLASH_LOAN_MEV_CONSTANTS as any)[key] || null;
}
