/**
 * Tests for cryptographic diagnostic system.
 * @see lib/utils/cryptoDiagnostics.ts
 */

import { describe, it, expect } from 'vitest'
import { CipherError } from '../../../lib/utils/errors'
import {
  diagnoseError,
  hasDiagnosticSupport,
  getAllDiagnosticCodes,
} from '../../../lib/utils/cryptoDiagnostics'

describe('cryptoDiagnostics', () => {
  describe('diagnoseError', () => {
    it('should return null for unsupported error codes', () => {
      const error = new CipherError('INPUT_REQUIRED', 'Input is required')
      const diagnostic = diagnoseError(error)
      expect(diagnostic).toBeNull()
    })

    it('should return null for errors without context', () => {
      const error = new CipherError('INVALID_KEY', 'Invalid key')
      const diagnostic = diagnoseError(error)
      expect(diagnostic).toBeNull()
    })

    describe('Affine non-coprime multiplier', () => {
      it('should diagnose non-coprime multiplier for Affine cipher', () => {
        const error = new CipherError('INVALID_KEY', 'Invalid key')
        const diagnostic = diagnoseError(error, {
          cipherId: 'affine',
          fieldName: 'a',
          fieldValue: 4, // gcd(4, 26) = 2, not coprime
        })

        expect(diagnostic).not.toBeNull()
        expect(diagnostic?.errorCode).toBe('NON_COPRIME_MULTIPLIER')
        expect(diagnostic?.explanation).toContain('4')
        expect(diagnostic?.explanation).toContain('26')
        expect(diagnostic?.explanation).toContain('GCD')
        expect(diagnostic?.suggestedRemediation.length).toBeGreaterThan(0)
        expect(diagnostic?.suggestedRemediation[0].label).toContain('multiplier')
      })

      it('should provide valid coprime suggestions', () => {
        const error = new CipherError('INVALID_KEY', 'Invalid key')
        const diagnostic = diagnoseError(error, {
          cipherId: 'affine',
          fieldName: 'a',
          fieldValue: 13, // gcd(13, 26) = 13, not coprime
        })

        expect(diagnostic).not.toBeNull()
        const suggestions = diagnostic?.suggestedRemediation || []
        
        // Check that suggestions are actually coprime with 26
        suggestions.forEach((suggestion) => {
          const value = Number(suggestion.value)
          const gcd = (a: number, b: number) => {
            a = Math.abs(a)
            b = Math.abs(b)
            while (b) {
              const t = b
              b = a % b
              a = t
            }
            return a
          }
          expect(gcd(value, 26)).toBe(1)
        })
      })

      it('should still generate diagnostic for coprime multipliers when error is thrown', () => {
        const error = new CipherError('INVALID_KEY', 'Invalid key')
        const diagnostic = diagnoseError(error, {
          cipherId: 'affine',
          fieldName: 'a',
          fieldValue: 5, // gcd(5, 26) = 1, coprime
        })

        // The diagnostic system generates suggestions based on the error,
        // not based on whether the value is actually valid
        expect(diagnostic).not.toBeNull()
        expect(diagnostic?.errorCode).toBe('NON_COPRIME_MULTIPLIER')
      })
    })

    describe('Hill singular matrix', () => {
      it('should diagnose singular matrix for Hill cipher', () => {
        const error = new CipherError('INVALID_KEY', 'Invalid key')
        const diagnostic = diagnoseError(error, {
          cipherId: 'hill',
          fieldName: 'key',
          fieldValue: 'AAAA',
          additionalData: { determinant: 0 }, // det = 0, not invertible
        })

        expect(diagnostic).not.toBeNull()
        expect(diagnostic?.errorCode).toBe('SINGULAR_MATRIX')
        expect(diagnostic?.explanation).toContain('determinant')
        expect(diagnostic?.explanation).toContain('0')
        expect(diagnostic?.explanation).toContain('26')
        expect(diagnostic?.suggestedRemediation.length).toBeGreaterThan(0)
      })

      it('should provide valid Hill key suggestions', () => {
        const error = new CipherError('INVALID_KEY', 'Invalid key')
        const diagnostic = diagnoseError(error, {
          cipherId: 'hill',
          fieldName: 'key',
          fieldValue: 'ABCD',
          additionalData: { determinant: 2 }, // gcd(2, 26) = 2, not coprime
        })

        expect(diagnostic).not.toBeNull()
        const suggestions = diagnostic?.suggestedRemediation || []
        
        // Check that suggestions are strings
        suggestions.forEach((suggestion) => {
          expect(typeof suggestion.value).toBe('string')
          expect(suggestion.label).toContain('key')
        })
      })
    })

    describe('RSA composite prime input', () => {
      it('should diagnose composite prime for RSA', () => {
        const error = new CipherError('INVALID_KEY', 'Invalid key')
        const diagnostic = diagnoseError(error, {
          cipherId: 'rsa',
          fieldName: 'p',
          fieldValue: 15, // 15 = 3*5, composite
        })

        expect(diagnostic).not.toBeNull()
        expect(diagnostic?.errorCode).toBe('COMPOSITE_PRIME_INPUT')
        expect(diagnostic?.explanation).toContain('15')
        expect(diagnostic?.explanation).toContain('prime')
        expect(diagnostic?.explanation).toContain('RSA')
        expect(diagnostic?.suggestedRemediation.length).toBeGreaterThan(0)
      })

      it('should diagnose composite prime for q parameter', () => {
        const error = new CipherError('INVALID_KEY', 'Invalid key')
        const diagnostic = diagnoseError(error, {
          cipherId: 'rsa',
          fieldName: 'q',
          fieldValue: 21, // 21 = 3*7, composite
        })

        expect(diagnostic).not.toBeNull()
        expect(diagnostic?.errorCode).toBe('COMPOSITE_PRIME_INPUT')
        expect(diagnostic?.explanation).toContain('21')
      })

      it('should provide nearest prime suggestion', () => {
        const error = new CipherError('INVALID_KEY', 'Invalid key')
        const diagnostic = diagnoseError(error, {
          cipherId: 'rsa',
          fieldName: 'p',
          fieldValue: 14, // nearest prime is 13
        })

        expect(diagnostic).not.toBeNull()
        const suggestions = diagnostic?.suggestedRemediation || []
        
        // Should suggest a prime number
        const suggestedValue = Number(suggestions[0].value)
        const isPrime = (n: number) => {
          if (n < 2) return false
          if (n === 2 || n === 3) return true
          if (n % 2 === 0) return false
          for (let i = 3; i <= Math.sqrt(n); i += 2) {
            if (n % i === 0) return false
          }
          return true
        }
        expect(isPrime(suggestedValue)).toBe(true)
      })

      it('should return null for actual prime values', () => {
        const error = new CipherError('INVALID_KEY', 'Invalid key')
        const diagnostic = diagnoseError(error, {
          cipherId: 'rsa',
          fieldName: 'p',
          fieldValue: 61, // prime
        })

        expect(diagnostic).toBeNull()
      })
    })

    describe('Odd hex length', () => {
      it('should diagnose odd hex length', () => {
        const error = new CipherError('INVALID_INPUT', 'Input must contain an even number of hexadecimal characters')
        const diagnostic = diagnoseError(error, {
          cipherId: 'aes',
          fieldName: 'input',
          fieldValue: 'ABC',
        })

        expect(diagnostic).not.toBeNull()
        expect(diagnostic?.errorCode).toBe('ODD_HEX_LENGTH')
        expect(diagnostic?.explanation).toContain('even')
        expect(diagnostic?.explanation).toContain('input') // Should contain the field name
        expect(diagnostic?.explanation).toMatch(/hex/i) // Case-insensitive match for hex/hexadecimal
        expect(diagnostic?.suggestedRemediation.length).toBeGreaterThan(0)
      })

      it('should provide remediation options for odd hex', () => {
        const error = new CipherError('INVALID_INPUT', 'Input must contain an even number of characters')
        const diagnostic = diagnoseError(error, {
          cipherId: 'aes',
          fieldName: 'input',
          fieldValue: 'A',
        })

        expect(diagnostic).not.toBeNull()
        const suggestions = diagnostic?.suggestedRemediation || []
        
        // Should have options like "Add leading zero" and "Remove last character"
        expect(suggestions.length).toBeGreaterThanOrEqual(2)
        expect(suggestions.some(s => s.label.includes('zero'))).toBe(true)
        expect(suggestions.some(s => s.label.includes('Remove'))).toBe(true)
      })
    })

    describe('ECC off-curve point', () => {
      it('should diagnose off-curve point for ECC', () => {
        const error = new CipherError('INVALID_INPUT', 'Point not on curve')
        const diagnostic = diagnoseError(error, {
          cipherId: 'ecc',
          fieldName: 'point',
          fieldValue: '123',
          additionalData: { x: '123', y: '456', curve: 'secp256k1' },
        })

        expect(diagnostic).not.toBeNull()
        expect(diagnostic?.errorCode).toBe('OFF_CURVE_POINT')
        expect(diagnostic?.explanation).toContain('curve')
        expect(diagnostic?.explanation).toContain('point')
        expect(diagnostic?.suggestedRemediation.length).toBeGreaterThan(0)
      })

      it('should provide curve-specific remediation', () => {
        const error = new CipherError('INVALID_INPUT', 'Invalid point')
        const diagnostic = diagnoseError(error, {
          cipherId: 'ecdsa',
          fieldName: 'point',
          fieldValue: 'invalid',
          additionalData: { x: '999', y: '999', curve: 'secp256k1' },
        })

        expect(diagnostic).not.toBeNull()
        const suggestions = diagnostic?.suggestedRemediation || []
        
        // Should suggest using generator point or clearing
        expect(suggestions.some(s => s.label.includes('generator') || s.label.includes('Generator'))).toBe(true)
        expect(suggestions.some(s => s.label.includes('Clear') || s.label.includes('clear'))).toBe(true)
      })
    })

    describe('Unknown error fallback', () => {
      it('should return null for unmapped error codes', () => {
        const error = new CipherError('WEAK_KEY', 'Weak key detected')
        const diagnostic = diagnoseError(error, {
          cipherId: 'aes',
          fieldName: 'key',
          fieldValue: 'weak',
        })

        expect(diagnostic).toBeNull()
      })

      it('should return null for errors without required context', () => {
        const error = new CipherError('INVALID_KEY', 'Invalid key')
        const diagnostic = diagnoseError(error, {
          cipherId: 'affine',
          // Missing fieldName and fieldValue
        })

        expect(diagnostic).toBeNull()
      })
    })
  })

  describe('hasDiagnosticSupport', () => {
    it('should return true for supported error codes', () => {
      expect(hasDiagnosticSupport('INVALID_KEY')).toBe(true)
      expect(hasDiagnosticSupport('INVALID_INPUT')).toBe(true)
    })

    it('should return false for unsupported error codes', () => {
      expect(hasDiagnosticSupport('INPUT_REQUIRED')).toBe(false)
      expect(hasDiagnosticSupport('WEAK_KEY')).toBe(false)
      expect(hasDiagnosticSupport('ALGORITHM_UNSUPPORTED')).toBe(false)
    })
  })

  describe('getAllDiagnosticCodes', () => {
    it('should return all diagnostic codes', () => {
      const codes = getAllDiagnosticCodes()
      
      expect(codes).toContain('NON_COPRIME_MULTIPLIER')
      expect(codes).toContain('SINGULAR_MATRIX')
      expect(codes).toContain('COMPOSITE_PRIME_INPUT')
      expect(codes).toContain('ODD_HEX_LENGTH')
      expect(codes).toContain('OFF_CURVE_POINT')
      expect(codes.length).toBe(5)
    })

    it('should return a stable list', () => {
      const codes1 = getAllDiagnosticCodes()
      const codes2 = getAllDiagnosticCodes()
      
      expect(codes1).toEqual(codes2)
    })
  })

  describe('Diagnostic structure', () => {
    it('should contain required fields', () => {
      const error = new CipherError('INVALID_KEY', 'Invalid key')
      const diagnostic = diagnoseError(error, {
        cipherId: 'affine',
        fieldName: 'a',
        fieldValue: 4,
      })

      if (diagnostic) {
        expect(diagnostic).toHaveProperty('errorCode')
        expect(diagnostic).toHaveProperty('explanation')
        expect(diagnostic).toHaveProperty('suggestedRemediation')
        expect(Array.isArray(diagnostic.suggestedRemediation)).toBe(true)
        
        if (diagnostic.suggestedRemediation.length > 0) {
          expect(diagnostic.suggestedRemediation[0]).toHaveProperty('label')
          expect(diagnostic.suggestedRemediation[0]).toHaveProperty('value')
        }
      }
    })

    it('should have non-empty explanation', () => {
      const error = new CipherError('INVALID_KEY', 'Invalid key')
      const diagnostic = diagnoseError(error, {
        cipherId: 'affine',
        fieldName: 'a',
        fieldValue: 4,
      })

      if (diagnostic) {
        expect(diagnostic.explanation.length).toBeGreaterThan(0)
        expect(diagnostic.explanation.trim()).not.toBe('')
      }
    })
  })
})
