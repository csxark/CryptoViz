/**
 * Tests for security metrics calculations.
 * @see lib/utils/securityMetrics.ts
 */

import { describe, it, expect } from 'vitest'
import { calculateSecurityMetrics, parseKeySize } from '../../../lib/utils/securityMetrics'
import type { CipherDefinition } from '../../../lib/cipher/registry'

describe('securityMetrics', () => {
  const createMockCipher = (overrides: Partial<CipherDefinition> = {}): CipherDefinition => ({
    id: 'test',
    name: 'Test Cipher',
    category: 'symmetric',
    description: 'Test description',
    defaultKey: 'test',
    defaultInput: 'test',
    securityStatus: 'secure',
    ...overrides
  })

  describe('calculateSecurityMetrics', () => {
    describe('AES security levels', () => {
      it('AES-128 → 128 classical bits / ~64-bit Grover strength', () => {
        const cipher = createMockCipher({
          id: 'aes',
          name: 'AES',
          category: 'symmetric',
          keySize: '128 bits'
        })
        const metrics = calculateSecurityMetrics(cipher, { keySize: 128 })

        expect(metrics.effectiveBits).toBe(128)
        expect(metrics.quantumEffectiveBits).toBe(64) // Grover: 128/2
        expect(metrics.quantumResistance).toBe('quantum-vulnerable')
        expect(metrics.quantumAlgorithm).toBe('grover')
      })

      it('AES-256 → 256 classical bits / ~128-bit Grover strength', () => {
        const cipher = createMockCipher({
          id: 'aes',
          name: 'AES',
          category: 'symmetric',
          keySize: '256 bits'
        })
        const metrics = calculateSecurityMetrics(cipher, { keySize: 256 })

        expect(metrics.effectiveBits).toBe(256)
        expect(metrics.quantumEffectiveBits).toBe(128) // Grover: 256/2
        expect(metrics.quantumResistance).toBe('quantum-vulnerable')
        expect(metrics.quantumAlgorithm).toBe('grover')
      })
    })

    describe('RSA security levels', () => {
      it('RSA-1024 → ~80 bits', () => {
        const cipher = createMockCipher({
          id: 'rsa',
          name: 'RSA-2048',
          category: 'asymmetric',
          keySize: 'Typically 2048 to 4096 bits'
        })
        const metrics = calculateSecurityMetrics(cipher, { keySize: 1024 })

        expect(metrics.effectiveBits).toBe(80)
        expect(metrics.quantumEffectiveBits).toBe(0) // Shor breaks RSA completely
        expect(metrics.quantumResistance).toBe('quantum-vulnerable')
        expect(metrics.quantumAlgorithm).toBe('shor')
      })

      it('RSA-2048 → ~112 bits', () => {
        const cipher = createMockCipher({
          id: 'rsa',
          name: 'RSA-2048',
          category: 'asymmetric',
          keySize: 'Typically 2048 to 4096 bits'
        })
        const metrics = calculateSecurityMetrics(cipher, { keySize: 2048 })

        expect(metrics.effectiveBits).toBe(112)
        expect(metrics.quantumEffectiveBits).toBe(0) // Shor breaks RSA completely
        expect(metrics.quantumResistance).toBe('quantum-vulnerable')
        expect(metrics.quantumAlgorithm).toBe('shor')
      })

      it('RSA-3072 → ~128 bits', () => {
        const cipher = createMockCipher({
          id: 'rsa',
          name: 'RSA-2048',
          category: 'asymmetric',
          keySize: 'Typically 2048 to 4096 bits'
        })
        const metrics = calculateSecurityMetrics(cipher, { keySize: 3072 })

        expect(metrics.effectiveBits).toBe(128)
        expect(metrics.quantumEffectiveBits).toBe(0) // Shor breaks RSA completely
        expect(metrics.quantumResistance).toBe('quantum-vulnerable')
        expect(metrics.quantumAlgorithm).toBe('shor')
      })
    })

    describe('3DES security', () => {
      it('3DES → ~112 bits', () => {
        const cipher = createMockCipher({
          id: '3des',
          name: '3DES',
          category: 'symmetric'
        })
        const metrics = calculateSecurityMetrics(cipher)

        expect(metrics.effectiveBits).toBe(112)
        expect(metrics.quantumEffectiveBits).toBe(56) // Grover: 112/2
        expect(metrics.quantumResistance).toBe('quantum-vulnerable')
        expect(metrics.quantumAlgorithm).toBe('grover')
      })
    })

    describe('Classical RSA/ECC/DH quantum vulnerability', () => {
      it('Classical RSA → Shor vulnerable', () => {
        const cipher = createMockCipher({
          id: 'rsa',
          name: 'RSA',
          category: 'asymmetric'
        })
        const metrics = calculateSecurityMetrics(cipher)

        expect(metrics.quantumResistance).toBe('quantum-vulnerable')
        expect(metrics.quantumAlgorithm).toBe('shor')
        expect(metrics.quantumEffectiveBits).toBe(0)
      })

      it('ECC → Shor vulnerable', () => {
        const cipher = createMockCipher({
          id: 'ecc',
          name: 'ECC',
          category: 'asymmetric'
        })
        const metrics = calculateSecurityMetrics(cipher)

        expect(metrics.quantumResistance).toBe('quantum-vulnerable')
        expect(metrics.quantumAlgorithm).toBe('shor')
        expect(metrics.quantumEffectiveBits).toBe(0)
      })

      it('DH → Shor vulnerable', () => {
        const cipher = createMockCipher({
          id: 'dh',
          name: 'Diffie-Hellman',
          category: 'asymmetric'
        })
        const metrics = calculateSecurityMetrics(cipher)

        expect(metrics.quantumResistance).toBe('quantum-vulnerable')
        expect(metrics.quantumAlgorithm).toBe('shor')
        expect(metrics.quantumEffectiveBits).toBe(0)
      })
    })

    describe('Symmetric ciphers → Grover impact', () => {
      it('Generic symmetric cipher → Grover impact', () => {
        const cipher = createMockCipher({
          id: 'symmetric-test',
          name: 'Symmetric Test',
          category: 'symmetric'
        })
        const metrics = calculateSecurityMetrics(cipher)

        expect(metrics.quantumResistance).toBe('quantum-vulnerable')
        expect(metrics.quantumAlgorithm).toBe('grover')
        expect(metrics.quantumEffectiveBits).toBeLessThan(metrics.effectiveBits)
      })
    })

    describe('Post-quantum algorithms', () => {
      it('ML-KEM → quantum-resistant', () => {
        const cipher = createMockCipher({
          id: 'ml-kem',
          name: 'ML-KEM-768',
          category: 'asymmetric'
        })
        const metrics = calculateSecurityMetrics(cipher)

        expect(metrics.quantumResistance).toBe('quantum-resistant')
        expect(metrics.quantumAlgorithm).toBe('none')
        expect(metrics.quantumEffectiveBits).toBeGreaterThan(0)
      })

      it('ML-DSA → quantum-resistant', () => {
        const cipher = createMockCipher({
          id: 'ml-dsa',
          name: 'ML-DSA-65',
          category: 'asymmetric'
        })
        const metrics = calculateSecurityMetrics(cipher)

        expect(metrics.quantumResistance).toBe('quantum-resistant')
        expect(metrics.quantumAlgorithm).toBe('none')
      })

      it('FrodoKEM → quantum-resistant', () => {
        const cipher = createMockCipher({
          id: 'frodokem',
          name: 'FrodoKEM-640',
          category: 'asymmetric'
        })
        const metrics = calculateSecurityMetrics(cipher)

        expect(metrics.quantumResistance).toBe('quantum-resistant')
        expect(metrics.quantumAlgorithm).toBe('none')
      })
    })

    describe('Overflow safety', () => {
      it('Very large security levels do not overflow or produce Infinity/NaN', () => {
        const cipher = createMockCipher({
          id: 'test',
          name: 'Test',
          category: 'symmetric'
        })
        const metrics = calculateSecurityMetrics(cipher, { keySize: 2048 })

        expect(metrics.effectiveBits).toBeGreaterThanOrEqual(128) // Should be at least 128
        expect(metrics.crackEstimates.operations).not.toBe('NaN')
        expect(metrics.crackEstimates.timeAt10_12.years).not.toBe('NaN')
        expect(metrics.crackEstimates.energy.joules).not.toBe('NaN')
        expect(metrics.crackEstimates.cost.usd).not.toBe('NaN')
      })

      it('Zero security bits handled safely', () => {
        const cipher = createMockCipher({
          id: 'test',
          name: 'Test',
          category: 'classical'
        })
        const metrics = calculateSecurityMetrics(cipher)

        expect(metrics.effectiveBits).toBe(0)
        expect(metrics.crackEstimates.operations).toBe('N/A')
      })

      it('Infinite security (OTP) handled safely', () => {
        const cipher = createMockCipher({
          id: 'otp',
          name: 'One-Time Pad',
          category: 'symmetric'
        })
        const metrics = calculateSecurityMetrics(cipher)

        expect(metrics.effectiveBits).toBe(Infinity)
        expect(metrics.crackEstimates.operations).toBe('N/A')
        expect(metrics.quantumResistance).toBe('quantum-resistant')
      })
    })

    describe('Cost/time/energy calculations', () => {
      it('Calculations remain finite and readable', () => {
        const cipher = createMockCipher({
          id: 'aes',
          name: 'AES',
          category: 'symmetric'
        })
        const metrics = calculateSecurityMetrics(cipher, { keySize: 128 })

        expect(metrics.crackEstimates.timeAt10_12.readable).not.toBe('NaN')
        expect(metrics.crackEstimates.timeAt10_15.readable).not.toBe('NaN')
        expect(metrics.crackEstimates.energy.readable).not.toBe('NaN')
        expect(metrics.crackEstimates.cost.readable).not.toBe('NaN')
        
        // Check that readable formats are human-readable
        expect(metrics.crackEstimates.timeAt10_12.readable).toMatch(/years|hours|days|minutes|second/)
        expect(metrics.crackEstimates.energy.readable).toMatch(/J|kWh|MWh|GWh/)
        expect(metrics.crackEstimates.cost.readable).toMatch(/\$|K|M|B|T/)
      })
    })

    describe('Fallback for missing metadata', () => {
      it('Missing/unknown metadata falls back safely', () => {
        const cipher = createMockCipher({
          id: 'unknown-cipher',
          name: 'Unknown Cipher',
          category: 'symmetric' as const
        })
        const metrics = calculateSecurityMetrics(cipher)

        expect(metrics.effectiveBits).toBeGreaterThanOrEqual(0)
        expect(metrics.effectiveBits).toBeLessThanOrEqual(Infinity)
        expect(metrics.crackEstimates).toBeDefined()
        expect(metrics.nistGuidance).toBeDefined()
      })
    })

    describe('NIST guidance', () => {
      it('256+ bits → recommended', () => {
        const cipher = createMockCipher({ id: 'aes', category: 'symmetric' })
        const metrics = calculateSecurityMetrics(cipher, { keySize: 256 })

        expect(metrics.nistGuidance.status).toBe('recommended')
        expect(metrics.nistGuidance.message).toContain('long-term')
      })

      it('128 bits → recommended', () => {
        const cipher = createMockCipher({ id: 'aes', category: 'symmetric' })
        const metrics = calculateSecurityMetrics(cipher, { keySize: 128 })

        expect(metrics.nistGuidance.status).toBe('recommended')
        expect(metrics.nistGuidance.message).toContain('2030')
      })

      it('112 bits → acceptable', () => {
        const cipher = createMockCipher({ id: '3des', category: 'symmetric' })
        const metrics = calculateSecurityMetrics(cipher)

        expect(metrics.nistGuidance.status).toBe('acceptable')
        expect(metrics.nistGuidance.message).toContain('migrate')
      })

      it('80 bits → deprecated', () => {
        const cipher = createMockCipher({ id: 'rsa', category: 'asymmetric' })
        const metrics = calculateSecurityMetrics(cipher, { keySize: 1024 })

        expect(metrics.nistGuidance.status).toBe('deprecated')
        expect(metrics.nistGuidance.message).toContain('insufficient')
      })

      it('< 80 bits → insufficient', () => {
        const cipher = createMockCipher({ id: 'des', category: 'symmetric' })
        const metrics = calculateSecurityMetrics(cipher)

        expect(metrics.nistGuidance.status).toBe('insufficient')
        expect(metrics.nistGuidance.message).toContain('not recommended')
      })
    })
  })

  describe('parseKeySize', () => {
    it('parses hex key length correctly', () => {
      const cipher = createMockCipher()
      const hexKey = '0123456789abcdef' // 16 hex chars = 64 bits
      const keySize = parseKeySize(cipher, hexKey)

      expect(keySize).toBe(64)
    })

    it('handles missing key gracefully', () => {
      const cipher = createMockCipher({ id: 'aes' })
      const keySize = parseKeySize(cipher)

      expect(keySize).toBe(128) // Default for AES
    })

    it('extracts from keySize metadata', () => {
      const cipher = createMockCipher({
        keySize: '256 bits'
      })
      const keySize = parseKeySize(cipher)

      expect(keySize).toBe(256)
    })

    it('uses defaults for known ciphers', () => {
      const rsaCipher = createMockCipher({ id: 'rsa' })
      expect(parseKeySize(rsaCipher)).toBe(2048)

      const eccCipher = createMockCipher({ id: 'ecc' })
      expect(parseKeySize(eccCipher)).toBe(256)

      const desCipher = createMockCipher({ id: 'des' })
      expect(parseKeySize(desCipher)).toBe(56)
    })
  })
})
