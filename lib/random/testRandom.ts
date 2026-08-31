import prand from 'pure-rand'

export function testRandom(seed: number) {
    let rng = prand.xoroshiro128plus(seed)
    return {
        int(min: number, max: number): number {
            const [v, next] = prand.uniformIntDistribution(min, max, rng)
            rng = next
            return v
        },
        bytes(length: number): Uint8Array {
            const out = new Uint8Array(length)
            for (let i = 0; i < length; i++) out[i] = this.int(0, 255)
            return out
        },
    }
}