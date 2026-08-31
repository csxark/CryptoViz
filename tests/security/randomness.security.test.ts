import { describe, it, expect, vi } from 'vitest'
import { cryptoRandomBytes } from '../../lib/random/cryptoRandom'

describe('cryptoRandomBytes', () => {
    it('uses Web Crypto, not Math.random', () => {
        const spy = vi.spyOn(crypto, 'getRandomValues')
        cryptoRandomBytes(16)
        expect(spy).toHaveBeenCalledTimes(1)
    })
})