/**
 * Security metrics and cost-to-break calculations for cryptographic algorithms.
 * Provides effective security strength, quantum resistance indicators, and theoretical attack costs.
 * @see CIPHER_ENGINE.md section on security analysis
 */

import type { CipherDefinition } from '../cipher/registry'

export interface SecurityMetrics {
  effectiveBits: number
  quantumEffectiveBits: number
  quantumResistance: 'quantum-resistant' | 'quantum-vulnerable' | 'unknown'
  quantumAlgorithm: 'grover' | 'shor' | 'none' | 'unknown'
  crackEstimates: CrackEstimates
  nistGuidance: NISTGuidance
}

export interface CrackEstimates {
  operations: string // String representation of BigInt
  timeAt10_12: TimeEstimate
  timeAt10_15: TimeEstimate
  energy: EnergyEstimate
  cost: CostEstimate
}

export interface TimeEstimate {
  years: string
  readable: string
}

export interface EnergyEstimate {
  joules: string
  kwh: string
  readable: string
}

export interface CostEstimate {
  usd: string
  readable: string
}

export interface NISTGuidance {
  status: 'recommended' | 'acceptable' | 'deprecated' | 'insufficient'
  message: string
}

/**
 * Configuration constants for cost calculations.
 * Centralized to allow easy updates as hardware costs change.
 */
const CONFIG = {
  // Operations per second assumptions
  OPS_PER_SECOND_FAST: 10n ** 12n, // 1 trillion ops/sec (high-end GPU/ASIC)
  OPS_PER_SECOND_MODERATE: 10n ** 15n, // 1 quadrillion ops/sec (future/optimized)
  
  // Energy assumptions: 1 nanojoule per operation. Stored as a divisor because a
  // fractional BigInt literal (1n / 10n ** 9n) truncates to 0n.
  OPERATIONS_PER_JOULE: 10n ** 9n, // joules = operations / OPERATIONS_PER_JOULE

  // Cost assumptions: $0.10 per kWh as a numerator/denominator (same reason).
  USD_PER_KWH_NUM: 1n,
  USD_PER_KWH_DEN: 10n,
  HARDWARE_COST_USD: 10_000_000n, // $10M for specialized hardware
} as const

/**
 * Extract effective security bits from cipher definition.
 * Maps cipher types and key sizes to equivalent symmetric security strength.
 */
function getEffectiveSecurityBits(cipher: CipherDefinition, options?: { keySize?: number }): number {
  const { id, category } = cipher
  
  // Handle symmetric ciphers - key size = security bits
  if (category === 'symmetric') {
    if (id === 'aes') {
      // Parse key size from options or default
      const keyLength = options?.keySize || 128 // Default to 128-bit
      return keyLength
    }
    if (id === '3des') {
      return 112 // 3DES effective security is 112 bits (2-key TDEA)
    }
    if (id === 'des') {
      return 56 // DES effective security is 56 bits
    }
    if (id === 'otp') {
      return Infinity // One-time pad is information-theoretically secure
    }
    // For generic symmetric ciphers, use provided keySize or default
    return options?.keySize || 128 // Use provided keySize if available
  }
  
  // Handle asymmetric ciphers - map to equivalent symmetric security
  if (category === 'asymmetric') {
    if (id === 'rsa') {
      // Map RSA key sizes to equivalent symmetric security
      const rsaKeySize = options?.keySize || 2048
      if (rsaKeySize <= 1024) return 80
      if (rsaKeySize <= 2048) return 112
      if (rsaKeySize <= 3072) return 128
      if (rsaKeySize <= 4096) return 150
      if (rsaKeySize <= 8192) return 192
      return 256 // For very large keys
    }
    
    if (id === 'ecc' || id === 'ecies') {
      // ECC key size ≈ equivalent symmetric security
      const eccKeySize = options?.keySize || 256
      return Math.min(eccKeySize / 2, 256) // P-256 ≈ 128-bit security
    }
    
    if (id === 'dh') {
      // DH key size mapping
      const dhKeySize = options?.keySize || 2048
      if (dhKeySize <= 1024) return 80
      if (dhKeySize <= 2048) return 112
      if (dhKeySize <= 3072) return 128
      return 150
    }
    
    // Post-quantum algorithms
    if (id === 'ml-kem' || id === 'ml-dsa' || id === 'frodokem' || 
        id === 'ntru' || id === 'mceliece' || id === 'sphincs+') {
      // PQC algorithms are designed for specific security levels
      if (id.includes('768') || id.includes('65')) return 128 // ML-KEM-768, ML-DSA-65
      if (id.includes('1024') || id.includes('87')) return 192 // Higher security levels
      if (id.includes('640')) return 128 // FrodoKEM-640
      return 128 // Conservative default for PQC
    }
    
    // Classical asymmetric algorithms vulnerable to Shor's algorithm
    return 112 // Conservative default for asymmetric
  }
  
  // Hash functions
  if (category === 'hash') {
    // Hash security is typically min(output_bits/2, collision_resistance)
    return 128 // Conservative default
  }
  
  // Classical ciphers have negligible security
  if (category === 'classical') {
    return 0 // No effective security
  }
  
  return 128 // Conservative default for unknown cases
}

/**
 * Determine quantum resistance status for a cipher.
 */
function getQuantumResistance(cipher: CipherDefinition): {
  resistance: 'quantum-resistant' | 'quantum-vulnerable' | 'unknown'
  algorithm: 'grover' | 'shor' | 'none' | 'unknown'
} {
  const { id, category } = cipher
  
  // Post-quantum algorithms are quantum-resistant
  const pqcAlgorithms = ['ml-kem', 'ml-dsa', 'frodokem', 'ntru', 'mceliece', 'sphincs+', 'kyber', 'dilithium']
  if (pqcAlgorithms.some(pqc => id.includes(pqc))) {
    return { resistance: 'quantum-resistant', algorithm: 'none' }
  }
  
  // Symmetric algorithms affected by Grover's algorithm
  if (category === 'symmetric' && id !== 'otp') {
    return { resistance: 'quantum-vulnerable', algorithm: 'grover' }
  }
  
  // One-time pad is quantum-resistant (information-theoretic security)
  if (id === 'otp') {
    return { resistance: 'quantum-resistant', algorithm: 'none' }
  }
  
  // Classical asymmetric algorithms vulnerable to Shor's algorithm
  if (category === 'asymmetric') {
    return { resistance: 'quantum-vulnerable', algorithm: 'shor' }
  }
  
  // Hash functions affected by Grover (preimage) but not collision
  if (category === 'hash') {
    return { resistance: 'quantum-vulnerable', algorithm: 'grover' }
  }
  
  // Classical ciphers have no meaningful quantum analysis
  if (category === 'classical') {
    return { resistance: 'unknown', algorithm: 'none' }
  }
  
  return { resistance: 'unknown', algorithm: 'unknown' }
}

/**
 * Calculate quantum-effective security bits.
 * Grover's algorithm provides quadratic speedup: k → k/2
 * Shor's algorithm breaks classical asymmetric: k → 0
 */
function getQuantumEffectiveBits(
  classicalBits: number,
  quantumAlgorithm: 'grover' | 'shor' | 'none' | 'unknown'
): number {
  if (quantumAlgorithm === 'shor') {
    return 0 // Shor's algorithm completely breaks classical asymmetric
  }
  if (quantumAlgorithm === 'grover') {
    return Math.max(0, Math.floor(classicalBits / 2)) // Grover provides quadratic speedup
  }
  if (quantumAlgorithm === 'none') {
    return classicalBits // Quantum-resistant algorithms maintain classical security
  }
  return classicalBits // Conservative default for unknown
}

/**
 * Calculate 2^k using BigInt to avoid overflow.
 * Returns string representation for very large numbers.
 */
function powerOfTwo(k: number): string {
  if (k <= 0) return '1'
  if (k === Infinity) return 'Infinity'
  
  // For reasonable sizes, calculate directly
  if (k <= 1024) {
    return (2n ** BigInt(k)).toString()
  }
  
  // For very large sizes, use scientific notation
  const exponent = k
  const mantissa = Math.log10(2) * exponent
  const magnitude = Math.floor(mantissa)
  const normalized = 10 ** (mantissa - magnitude)
  
  return `${normalized.toFixed(2)} × 10^${magnitude}`
}

/**
 * Calculate time estimate for given operations and ops/sec rate.
 */
function calculateTime(operations: bigint, opsPerSecond: bigint): TimeEstimate {
  if (operations === 0n) {
    return { years: '0', readable: 'Instant' }
  }
  
  const seconds = operations / opsPerSecond
  
  if (seconds < 1n) {
    return { years: '0', readable: '< 1 second' }
  }
  
  const minutes = seconds / 60n
  const hours = minutes / 60n
  const days = hours / 24n
  const years = days / 365n
  
  const yearsNum = Number(years)
  
  if (yearsNum < 1) {
    if (Number(days) < 1) {
      if (Number(hours) < 1) {
        return { years: years.toString(), readable: `${Number(minutes)} minutes` }
      }
      return { years: years.toString(), readable: `${Number(hours)} hours` }
    }
    return { years: years.toString(), readable: `${Number(days)} days` }
  }
  
  if (yearsNum < 1_000_000) {
    return { years: years.toString(), readable: `${yearsNum.toLocaleString()} years` }
  }
  
  if (yearsNum < 1_000_000_000) {
    return { years: years.toString(), readable: `${(yearsNum / 1_000_000).toFixed(1)} million years` }
  }
  
  if (yearsNum < 1_000_000_000_000) {
    return { years: years.toString(), readable: `${(yearsNum / 1_000_000_000).toFixed(1)} billion years` }
  }
  
  return { years: years.toString(), readable: `${(yearsNum / 1_000_000_000_000).toFixed(1)} trillion years` }
}

/**
 * Calculate energy estimate for given operations.
 */
function calculateEnergy(operations: bigint): EnergyEstimate {
  if (operations === 0n) {
    return { joules: '0', kwh: '0', readable: '0 J' }
  }
  
  // Joules = operations / operations_per_joule (1 nJ/op)
  const joules = operations / CONFIG.OPERATIONS_PER_JOULE
  
  // Convert to kWh (1 kWh = 3.6 MJ = 3.6 × 10^6 J)
  const kwh = joules / (3_600_000n)
  
  const kwhNum = Number(kwh)
  
  if (kwhNum < 1) {
    return { 
      joules: joules.toString(), 
      kwh: kwh.toString(), 
      readable: `${Number(joules).toFixed(2)} J` 
    }
  }
  
  if (kwhNum < 1_000) {
    return { 
      joules: joules.toString(), 
      kwh: kwh.toString(), 
      readable: `${kwhNum.toFixed(2)} kWh` 
    }
  }
  
  if (kwhNum < 1_000_000) {
    return { 
      joules: joules.toString(), 
      kwh: kwh.toString(), 
      readable: `${(kwhNum / 1_000).toFixed(2)} MWh` 
    }
  }
  
  return { 
    joules: joules.toString(), 
    kwh: kwh.toString(), 
    readable: `${(kwhNum / 1_000_000).toFixed(2)} GWh` 
  }
}

/**
 * Calculate cost estimate for given operations.
 */
function calculateCost(operations: bigint): CostEstimate {
  if (operations === 0n) {
    return { usd: '0', readable: '$0' }
  }
  
  const energy = calculateEnergy(operations)
  const kwh = BigInt(energy.kwh)
  
  // Energy cost = kwh * $0.10/kWh
  const energyCost = (kwh * CONFIG.USD_PER_KWH_NUM) / CONFIG.USD_PER_KWH_DEN
  
  // Add hardware cost (amortized over attack time)
  const totalCost = energyCost + CONFIG.HARDWARE_COST_USD
  
  const costNum = Number(totalCost)
  
  if (costNum < 1) {
    return { usd: totalCost.toString(), readable: '< $1' }
  }
  
  if (costNum < 1_000) {
    return { usd: totalCost.toString(), readable: `$${costNum.toFixed(2)}` }
  }
  
  if (costNum < 1_000_000) {
    return { usd: totalCost.toString(), readable: `$${(costNum / 1_000).toFixed(2)}K` }
  }
  
  if (costNum < 1_000_000_000) {
    return { usd: totalCost.toString(), readable: `$${(costNum / 1_000_000).toFixed(2)}M` }
  }
  
  if (costNum < 1_000_000_000_000) {
    return { usd: totalCost.toString(), readable: `$${(costNum / 1_000_000_000).toFixed(2)}B` }
  }
  
  return { usd: totalCost.toString(), readable: `$${(costNum / 1_000_000_000_000).toFixed(2)}T` }
}

/**
 * Get NIST guidance for security level.
 */
function getNistGuidance(effectiveBits: number): NISTGuidance {
  if (effectiveBits >= 256) {
    return {
      status: 'recommended',
      message: 'Suitable for long-term protection (≥ 2030 and beyond)'
    }
  }
  
  if (effectiveBits >= 192) {
    return {
      status: 'recommended',
      message: 'Suitable for long-term protection (≥ 2030)'
    }
  }
  
  if (effectiveBits >= 128) {
    return {
      status: 'recommended',
      message: 'Acceptable for near-term use (through 2030)'
    }
  }
  
  if (effectiveBits >= 112) {
    return {
      status: 'acceptable',
      message: 'Acceptable for legacy use - migrate to 128-bit or higher'
    }
  }
  
  if (effectiveBits >= 80) {
    return {
      status: 'deprecated',
      message: 'Deprecated - insufficient for most applications'
    }
  }
  
  return {
    status: 'insufficient',
    message: 'Insufficient security - not recommended for any use'
  }
}

/**
 * Main function to calculate security metrics for a cipher.
 */
export function calculateSecurityMetrics(
  cipher: CipherDefinition,
  options?: { keySize?: number }
): SecurityMetrics {
  const effectiveBits = getEffectiveSecurityBits(cipher, options)
  const { resistance: quantumResistance, algorithm: quantumAlgorithm } = getQuantumResistance(cipher)
  const quantumEffectiveBits = getQuantumEffectiveBits(effectiveBits, quantumAlgorithm)
  
  // Calculate crack estimates only for meaningful security levels
  let crackEstimates: CrackEstimates
  if (effectiveBits <= 0 || effectiveBits === Infinity) {
    crackEstimates = {
      operations: 'N/A',
      timeAt10_12: { years: 'N/A', readable: 'N/A' },
      timeAt10_15: { years: 'N/A', readable: 'N/A' },
      energy: { joules: 'N/A', kwh: 'N/A', readable: 'N/A' },
      cost: { usd: 'N/A', readable: 'N/A' }
    }
  } else {
    const operationsStr = powerOfTwo(effectiveBits)
    const operations = effectiveBits <= 1024 ? 2n ** BigInt(effectiveBits) : 0n
    
    crackEstimates = {
      operations: operationsStr,
      timeAt10_12: operations > 0n ? calculateTime(operations, CONFIG.OPS_PER_SECOND_FAST) : { years: '∞', readable: 'Infeasible' },
      timeAt10_15: operations > 0n ? calculateTime(operations, CONFIG.OPS_PER_SECOND_MODERATE) : { years: '∞', readable: 'Infeasible' },
      energy: operations > 0n ? calculateEnergy(operations) : { joules: '∞', kwh: '∞', readable: 'Infeasible' },
      cost: operations > 0n ? calculateCost(operations) : { usd: '∞', readable: 'Infeasible' }
    }
  }
  
  const nistGuidance = getNistGuidance(effectiveBits)
  
  return {
    effectiveBits,
    quantumEffectiveBits,
    quantumResistance,
    quantumAlgorithm,
    crackEstimates,
    nistGuidance
  }
}

/**
 * Parse key size from cipher options or metadata.
 */
export function parseKeySize(cipher: CipherDefinition, key?: string): number {
  // Try to extract from key string
  if (key) {
    // For hex keys, calculate bit length
    if (/^[0-9a-fA-F]+$/.test(key)) {
      return key.length * 4 // Each hex character = 4 bits
    }
    
    // For RSA-style keys (comma-separated), try to parse modulus
    if (key.includes(',')) {
      const parts = key.split(',').map(p => parseInt(p.trim(), 10))
      const validParts = parts.filter(p => !isNaN(p) && p > 0)
      if (validParts.length >= 2) {
        // Estimate RSA key size from prime factors
        const n = validParts[0] * validParts[1]
        return Math.floor(Math.log2(n)) * 2 // Rough estimate
      }
    }
  }
  
  // Try to extract from keySize metadata
  if (cipher.keySize) {
    const sizeMatch = cipher.keySize.match(/(\d+)/)
    if (sizeMatch) {
      return parseInt(sizeMatch[1], 10)
    }
  }
  
  // Default values for common ciphers
  const defaults: Record<string, number> = {
    'aes': 128,
    'rsa': 2048,
    'ecc': 256,
    'dh': 2048,
    '3des': 168, // 3-key TDEA
    'des': 56,
  }
  
  return defaults[cipher.id] || 128
}
