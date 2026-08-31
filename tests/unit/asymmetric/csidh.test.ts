import { describe, expect, it } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS, describeCsidhGroupAction } from '@/lib/cipher/asymmetric/csidh'
describe('CSIDH', () => {
    it('commutativity: Alice.apply(Bob) == Bob.apply(Alice)', () => {
        const alicePriv = '01'
        const bobPriv = '02'

        // Mock public keys (in real CSIDH, these are curve coefficients)
        const alicePub = '0a'
        const bobPub = '0b'

        const sharedAlice = encrypt(bobPub, alicePriv)
        const sharedBob = encrypt(alicePub, bobPriv)

        // In our simplified mock, (0b + 01) == (0a + 02) => 0c == 0c
        expect(sharedAlice.output).toBe(sharedBob.output)
    })
    it('exports valid CSIDH test vectors', () => {
    expect(TEST_VECTORS.length).toBeGreaterThan(0)

    for (const vector of TEST_VECTORS) {
        const result = encrypt(vector.input, vector.key)
        expect(result.output).toBe(vector.expected)
    }
})

    it('metadata contains educational simulation disclaimer and security warning', () => {
        const result = encrypt('00', '00')
        expect(result.metadata.breakingComplexity).toContain('Pedagogical simulation')
        expect(result.metadata.securityWarning).toContain('PEDAGOGICAL SIMULATION')
    })

    it('instrumented execution step 0 includes pedagogical simulation banner', () => {
        const result = encrypt('00', '00', { instrument: true })
        expect(result.steps.length).toBeGreaterThan(1)
        expect(result.steps[0].label).toContain('Simulation')
        expect(result.steps[0].note).toContain('PEDAGOGICAL SIMULATION')
    })

    it('describeCsidhGroupAction exposes pedagogical simulation explanations', () => {
        const desc = describeCsidhGroupAction('0a', '05')
        expect(desc.simulatedSharedHex).toBeDefined()
        expect(desc.explanation).toContain('CSIDH utilizes ideal class group actions')
        expect(desc.primeBits).toBe(511)
    })
})
