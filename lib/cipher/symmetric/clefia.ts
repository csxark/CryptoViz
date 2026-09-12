/**
 * CLEFIA — Sony Corporation, 2007.
 * ISO/IEC 29192-2:2012, RFC 6114.
 * 128-bit block cipher supporting 128-, 192-, and 256-bit keys.
 * 4-branch Generalized Feistel Network (GFN_{4,r}) with F0/F1 functions,
 * S-boxes S0/S1, diffusion matrices M0/M1 over GF(2^8), and DoubleSwap key schedule.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'CLEFIA',
    keySize: 128,
    blockSize: 128,
    rounds: 18,
    securityStatus: 'secure',
    breakingComplexity: 'No practical attacks; ISO/IEC 29192-2 lightweight standard.',
    yearDesigned: 2007,
    standardBody: 'ISO/IEC 29192-2; RFC 6114',
}

const S0: number[] = [
    0x57, 0x49, 0xd1, 0xc6, 0x2f, 0x33, 0x74, 0xfb, 0x95, 0x6d, 0x82, 0xea, 0x0e, 0xb0, 0xa8, 0x1c,
    0x28, 0xd0, 0x4b, 0x92, 0x5c, 0xee, 0x85, 0xb1, 0xc4, 0x0a, 0x76, 0x3d, 0x63, 0xf9, 0x17, 0xaf,
    0xbf, 0xa1, 0x19, 0x65, 0xf7, 0x7a, 0x32, 0x20, 0x06, 0xce, 0xe4, 0x83, 0x9d, 0x5b, 0x4c, 0xd8,
    0x42, 0x5d, 0x2e, 0xe8, 0xd4, 0x9b, 0x0f, 0x13, 0x3c, 0x89, 0x67, 0xc0, 0x71, 0xaa, 0xb6, 0xf5,
    0xa4, 0xbe, 0xfd, 0x8c, 0x12, 0x00, 0x97, 0xda, 0x78, 0xe1, 0xcf, 0x6b, 0x39, 0x43, 0x55, 0x26,
    0x30, 0x98, 0xcc, 0xdd, 0xeb, 0x54, 0xb3, 0x8f, 0x4e, 0x16, 0xfa, 0x22, 0xa5, 0x77, 0x09, 0x61,
    0xd6, 0x2a, 0x53, 0x37, 0x45, 0xc1, 0x6c, 0xae, 0xef, 0x70, 0x08, 0x99, 0x8b, 0x1d, 0xf2, 0xb4,
    0xe9, 0xc7, 0x9f, 0x4a, 0x31, 0x25, 0xfe, 0x7c, 0xd3, 0xa2, 0xbd, 0x56, 0x14, 0x88, 0x60, 0x0b,
    0xcd, 0xe2, 0x34, 0x50, 0x9e, 0xdc, 0x11, 0x05, 0x2b, 0xb7, 0xa9, 0x48, 0xff, 0x66, 0x8a, 0x73,
    0x03, 0x75, 0x86, 0xf1, 0x6a, 0xa7, 0x40, 0xc2, 0xb9, 0x2c, 0xdb, 0x1f, 0x58, 0x94, 0x3e, 0xed,
    0xfc, 0x1b, 0xa0, 0x04, 0xb8, 0x8d, 0xe6, 0x59, 0x62, 0x93, 0x35, 0x7e, 0xca, 0x21, 0xdf, 0x47,
    0x15, 0xf3, 0xba, 0x7f, 0xa6, 0x69, 0xc8, 0x4d, 0x87, 0x3b, 0x9c, 0x01, 0xe0, 0xde, 0x24, 0x52,
    0x7b, 0x0c, 0x68, 0x1e, 0x80, 0xb2, 0x5a, 0xe7, 0xad, 0xd5, 0x23, 0xf4, 0x46, 0x3f, 0x91, 0xc9,
    0x6e, 0x84, 0x72, 0xbb, 0x0d, 0x18, 0xd9, 0x96, 0xf0, 0x5f, 0x41, 0xac, 0x27, 0xc5, 0xe3, 0x3a,
    0x81, 0x6f, 0x07, 0xa3, 0x79, 0xf6, 0x2d, 0x38, 0x1a, 0x44, 0x5e, 0xb5, 0xd2, 0xec, 0xcb, 0x90,
    0x9a, 0x36, 0xe5, 0x29, 0xc3, 0x4f, 0xab, 0x64, 0x51, 0xf8, 0x10, 0xd7, 0xbc, 0x02, 0x7d, 0x8e,
]

const S1: number[] = [
    0x6c, 0xda, 0xc3, 0xe9, 0x4e, 0x9d, 0x0a, 0x3d, 0xb8, 0x36, 0xb4, 0x38, 0x13, 0x34, 0x0c, 0xd9,
    0xbf, 0x74, 0x94, 0x8f, 0xb7, 0x9c, 0xe5, 0xdc, 0x9e, 0x07, 0x49, 0x4f, 0x98, 0x2c, 0xb0, 0x93,
    0x12, 0xeb, 0xcd, 0xb3, 0x92, 0xe7, 0x41, 0x60, 0xe3, 0x21, 0x27, 0x3b, 0xe6, 0x19, 0xd2, 0x0e,
    0x91, 0x11, 0xc7, 0x3f, 0x2a, 0x8e, 0xa1, 0xbc, 0x2b, 0xc8, 0xc5, 0x0f, 0x5b, 0xf3, 0x87, 0x8b,
    0xfb, 0xf5, 0xde, 0x20, 0xc6, 0xa7, 0x84, 0xce, 0xd8, 0x65, 0x51, 0xc9, 0xa4, 0xef, 0x43, 0x53,
    0x25, 0x5d, 0x9b, 0x31, 0xe8, 0x3e, 0x0d, 0xd7, 0x80, 0xff, 0x69, 0x8a, 0xba, 0x0b, 0x73, 0x5c,
    0x6e, 0x54, 0x15, 0x62, 0xf6, 0x35, 0x30, 0x52, 0xa3, 0x16, 0xd3, 0x28, 0x32, 0xfa, 0xaa, 0x5e,
    0xcf, 0xea, 0xed, 0x78, 0x33, 0x58, 0x09, 0x7b, 0x63, 0xc0, 0xc1, 0x46, 0x1e, 0xdf, 0xa9, 0x99,
    0x55, 0x04, 0xc4, 0x86, 0x39, 0x77, 0x82, 0xec, 0x40, 0x18, 0x90, 0x97, 0x59, 0xdd, 0x83, 0x1f,
    0x9a, 0x37, 0x06, 0x24, 0x64, 0x7c, 0xa5, 0x56, 0x48, 0x08, 0x85, 0xd0, 0x61, 0x26, 0xca, 0x6f,
    0x7e, 0x6a, 0xb6, 0x71, 0xa0, 0x70, 0x05, 0xd1, 0x45, 0x8c, 0x23, 0x1c, 0xf0, 0xee, 0x89, 0xad,
    0x7a, 0x4b, 0xc2, 0x2f, 0xdb, 0x5a, 0x4d, 0x76, 0x67, 0x17, 0x2d, 0xf4, 0xcb, 0xb1, 0x4a, 0xa8,
    0xb5, 0x22, 0x47, 0x3a, 0xd5, 0x10, 0x4c, 0x72, 0xcc, 0x00, 0xf9, 0xe0, 0xfd, 0xe2, 0xfe, 0xae,
    0xf8, 0x5f, 0xab, 0xf1, 0x1b, 0x42, 0x81, 0xd6, 0xbe, 0x44, 0x29, 0xa6, 0x57, 0xb9, 0xaf, 0xf2,
    0xd4, 0x75, 0x66, 0xbb, 0x68, 0x9f, 0x50, 0x02, 0x01, 0x3c, 0x7f, 0x8d, 0x1a, 0x88, 0xbd, 0xac,
    0xf7, 0xe4, 0x79, 0x96, 0xa2, 0xfc, 0x6d, 0xb2, 0x6b, 0x03, 0xe1, 0x2e, 0x7d, 0x14, 0x95, 0x1d,
]

const CON_128: number[] = [
    0xf56b7aeb, 0x994a8a42, 0x96a4bd75, 0xfa854521,
    0x735b768a, 0x1f7abac4, 0xd5bc3b45, 0xb99d5d62,
    0x52d73592, 0x3ef636e5, 0xc57a1ac9, 0xa95b9b72,
    0x5ab42554, 0x369555ed, 0x1553ba9a, 0x7972b2a2,
    0xe6b85d4d, 0x8a995951, 0x4b550696, 0x2774b4fc,
    0xc9bb034b, 0xa59a5a7e, 0x88cc81a5, 0xe4ed2d3f,
    0x7c6f68e2, 0x104e8ecb, 0xd2263471, 0xbe07c765,
    0x511a3208, 0x3d3bfbe6, 0x1084b134, 0x7ca565a7,
    0x304bf0aa, 0x5c6aaa87, 0xf4347855, 0x9815d543,
    0x4213141a, 0x2e32f2f5, 0xcd180a0d, 0xa139f97a,
    0x5e852d36, 0x32a464e9, 0xc353169b, 0xaf72b274,
    0x8db88b4d, 0xe199593a, 0x7ed56d96, 0x12f434c9,
    0xd37b36cb, 0xbf5a9a64, 0x85ac9b65, 0xe98d4d32,
    0x7adf6582, 0x16fe3ecd, 0xd17e32c1, 0xbd5f9f66,
    0x50b63150, 0x3c9757e7, 0x1052b098, 0x7c73b3a7,
]

const CON_192: number[] = [
    0xc6d61d91, 0xaaf73771, 0x5b6226f8, 0x374383ec,
    0x15b8bb4c, 0x799959a2, 0x32d5f596, 0x5ef43485,
    0xf57b7acb, 0x995a9a42, 0x96acbd65, 0xfa8d4d21,
    0x735f7682, 0x1f7ebec4, 0xd5be3b41, 0xb99f5f62,
    0x52d63590, 0x3ef737e5, 0x1162b2f8, 0x7d4383a6,
    0x30b8f14c, 0x5c995987, 0x2055d096, 0x4c74b497,
    0xfc3b684b, 0x901ada4b, 0x920cb425, 0xfe2ded25,
    0x710f7222, 0x1d2eeec6, 0xd4963911, 0xb8b77763,
    0x524234b8, 0x3e63a3e5, 0x1128b26c, 0x7d09c9a6,
    0x309df106, 0x5cbc7c87, 0xf45f7883, 0x987ebe43,
    0x963ebc41, 0xfa1fdf21, 0x73167610, 0x1f37f7c4,
    0x01829338, 0x6da363b6, 0x38c8e1ac, 0x54e9298f,
    0x246dd8e6, 0x484c8c93, 0xfe276c73, 0x9206c649,
    0x9302b639, 0xff23e324, 0x7188732c, 0x1da969c6,
    0x00cd91a6, 0x6cec2cb7, 0xec7748d3, 0x8056965b,
    0x9a2aa469, 0xf60bcb2d, 0x751c7a04, 0x193dfdc2,
    0x02879532, 0x6ea666b5, 0xed524a99, 0x8173b35a,
    0x4ea00d7c, 0x228141f9, 0x1f59ae8e, 0x7378b8a8,
    0xe3bd5747, 0x8f9c5c54, 0x9dcfaba3, 0xf1ee2e2a,
    0xa2f6d5d1, 0xced71715, 0x697242d8, 0x055393de,
    0x0cb0895c, 0x609151bb, 0x3e51ec9e, 0x5270b089,
]

const CON_256: number[] = [
    0x0221947e, 0x6e00c0b5, 0xed014a3f, 0x8120e05a,
    0x9a91a51f, 0xf6b0702d, 0xa159d28f, 0xcd78b816,
    0xbcbde947, 0xd09c5c0b, 0xb24ff4a3, 0xde6eae05,
    0xb536fa51, 0xd917d702, 0x62925518, 0x0eb373d5,
    0x094082bc, 0x6561a1be, 0x3ca9e96e, 0x5088488b,
    0xf24574b7, 0x9e64a445, 0x9533ba5b, 0xf912d222,
    0xa688dd2d, 0xcaa96911, 0x6b4d46a6, 0x076cacdc,
    0xd9b72353, 0xb596566e, 0x80ca91a9, 0xeceb2b37,
    0x786c60e4, 0x144d8dcf, 0x043f9842, 0x681edeb3,
    0xee0e4c21, 0x822fef59, 0x4f0e0e20, 0x232feff8,
    0x1f8eaf20, 0x73af6fa8, 0x37ceffa0, 0x5bef2f80,
    0x23eed7e0, 0x4fcf0f94, 0x29fec3c0, 0x45df1f9e,
    0x2cf6c9d0, 0x40d7179b, 0x2e72ccd8, 0x42539399,
    0x2f30ce5c, 0x4311d198, 0x2f91cf1e, 0x43b07098,
    0xfbd9678f, 0x97f8384c, 0x91fdb3c7, 0xfddc1c26,
    0xa4efd9e3, 0xc8ce0e13, 0xbe66ecf1, 0xd2478709,
    0x673a5e48, 0x0b1bdbd0, 0x0b948714, 0x67b575bc,
    0x3dc3ebba, 0x51e2228a, 0xf2f075dd, 0x9ed11145,
    0x417112de, 0x2d5090f6, 0xcca9096f, 0xa088487b,
    0x8a4584b7, 0xe664a43d, 0xa933c25b, 0xc512d21e,
    0xb888e12d, 0xd4a9690f, 0x644d58a6, 0x086cacd3,
    0xde372c53, 0xb216d669, 0x830a9629, 0xef2beb34,
    0x798c6324, 0x15ad6dce, 0x04cf99a2, 0x68ee2eb3,
]

function gfMul(a: number, b: number): number {
    let res = 0
    let cur = a
    let mult = b
    while (mult > 0) {
        if (mult & 1) res ^= cur
        cur <<= 1
        if (cur & 0x100) cur ^= 0x11d
        mult >>= 1
    }
    return res & 0xff
}

function M0(t: number[]): number[] {
    return [
        t[0] ^ gfMul(0x02, t[1]) ^ gfMul(0x04, t[2]) ^ gfMul(0x06, t[3]),
        gfMul(0x02, t[0]) ^ t[1] ^ gfMul(0x06, t[2]) ^ gfMul(0x04, t[3]),
        gfMul(0x04, t[0]) ^ gfMul(0x06, t[1]) ^ t[2] ^ gfMul(0x02, t[3]),
        gfMul(0x06, t[0]) ^ gfMul(0x04, t[1]) ^ gfMul(0x02, t[2]) ^ t[3]
    ]
}

function M1(t: number[]): number[] {
    return [
        t[0] ^ gfMul(0x08, t[1]) ^ gfMul(0x02, t[2]) ^ gfMul(0x0a, t[3]),
        gfMul(0x08, t[0]) ^ t[1] ^ gfMul(0x0a, t[2]) ^ gfMul(0x02, t[3]),
        gfMul(0x02, t[0]) ^ gfMul(0x0a, t[1]) ^ t[2] ^ gfMul(0x08, t[3]),
        gfMul(0x0a, t[0]) ^ gfMul(0x02, t[1]) ^ gfMul(0x08, t[2]) ^ t[3]
    ]
}

function F0(rk: number, x: number): number {
    const t = [
        S0[((rk >>> 24) & 0xff) ^ ((x >>> 24) & 0xff)],
        S1[((rk >>> 16) & 0xff) ^ ((x >>> 16) & 0xff)],
        S0[((rk >>> 8) & 0xff) ^ ((x >>> 8) & 0xff)],
        S1[(rk & 0xff) ^ (x & 0xff)]
    ]
    const y = M0(t)
    return (((y[0] << 24) | (y[1] << 16) | (y[2] << 8) | y[3]) >>> 0)
}

function F1(rk: number, x: number): number {
    const t = [
        S1[((rk >>> 24) & 0xff) ^ ((x >>> 24) & 0xff)],
        S0[((rk >>> 16) & 0xff) ^ ((x >>> 16) & 0xff)],
        S1[((rk >>> 8) & 0xff) ^ ((x >>> 8) & 0xff)],
        S0[(rk & 0xff) ^ (x & 0xff)]
    ]
    const y = M1(t)
    return (((y[0] << 24) | (y[1] << 16) | (y[2] << 8) | y[3]) >>> 0)
}

function GFN_4_r(rk: number[], r: number, X: number[]): number[] {
    let [T0, T1, T2, T3] = [X[0] >>> 0, X[1] >>> 0, X[2] >>> 0, X[3] >>> 0]
    for (let i = 0; i < r; i++) {
        const nextT1 = (T1 ^ F0(rk[2 * i], T0)) >>> 0
        const nextT3 = (T3 ^ F1(rk[2 * i + 1], T2)) >>> 0
        // Left rotation of 4 branches: T0,T1,T2,T3 <- T1,T2,T3,T0
        const nextT0 = nextT1
        const nT1 = T2
        const nT2 = nextT3
        const nT3 = T0
        T0 = nextT0; T1 = nT1; T2 = nT2; T3 = nT3
    }
    return [T3, T0, T1, T2]
}

function GFNINV_4_r(rk: number[], r: number, X: number[]): number[] {
    let [T0, T1, T2, T3] = [X[0] >>> 0, X[1] >>> 0, X[2] >>> 0, X[3] >>> 0]
    for (let i = 0; i < r; i++) {
        const updatedT1 = (T1 ^ F0(rk[2 * (r - i) - 2], T0)) >>> 0
        const updatedT3 = (T3 ^ F1(rk[2 * (r - i) - 1], T2)) >>> 0
        // Right rotation of 4 branches: T0,T1,T2,T3 <- T3,T0,T1,T2
        const nextT0 = updatedT3
        const nextT1 = T0
        const nextT2 = updatedT1
        const nextT3 = T2
        T0 = nextT0; T1 = nextT1; T2 = nextT2; T3 = nextT3
    }
    return [T1, T2, T3, T0]
}

function GFN_8_r(rk: number[], r: number, X: number[]): number[] {
    let T = X.map(x => x >>> 0)
    for (let i = 0; i < r; i++) {
        const t1 = (T[1] ^ F0(rk[4 * i], T[0])) >>> 0
        const t3 = (T[3] ^ F1(rk[4 * i + 1], T[2])) >>> 0
        const t5 = (T[5] ^ F0(rk[4 * i + 2], T[4])) >>> 0
        const t7 = (T[7] ^ F1(rk[4 * i + 3], T[6])) >>> 0
        T = [t1, T[2], t3, T[4], t5, T[6], t7, T[0]]
    }
    return [T[7], T[0], T[1], T[2], T[3], T[4], T[5], T[6]]
}

function sigma(words: number[]): number[] {
    let val = 0n
    for (let i = 0; i < 4; i++) {
        val = (val << 32n) | BigInt(words[i] >>> 0)
    }
    const p1 = (val >> 64n) & ((1n << 57n) - 1n)
    const p2 = val & ((1n << 7n) - 1n)
    const p3 = (val >> 121n) & ((1n << 7n) - 1n)
    const p4 = (val >> 7n) & ((1n << 57n) - 1n)
    const Y = (p1 << 71n) | (p2 << 64n) | (p3 << 57n) | p4
    return [
        Number((Y >> 96n) & 0xffffffffn) >>> 0,
        Number((Y >> 64n) & 0xffffffffn) >>> 0,
        Number((Y >> 32n) & 0xffffffffn) >>> 0,
        Number(Y & 0xffffffffn) >>> 0
    ]
}

function keySchedule(keyBytes: Uint8Array): { WK: number[]; RK: number[]; rounds: number } {
    const klen = keyBytes.length
    const numWords = klen / 4
    const K = new Array(numWords)
    for (let i = 0; i < numWords; i++) {
        K[i] = ((keyBytes[4 * i] << 24) | (keyBytes[4 * i + 1] << 16) | (keyBytes[4 * i + 2] << 8) | keyBytes[4 * i + 3]) >>> 0
    }

    if (klen === 16) {
        const L = GFN_4_r(CON_128.slice(0, 24), 12, K)
        const WK = K.slice(0, 4)
        const RK = new Array(36)
        let currL = L.slice()

        for (let i = 0; i < 9; i++) {
            const con = CON_128.slice(24 + 4 * i, 24 + 4 * i + 4)
            let T = [
                (currL[0] ^ con[0]) >>> 0,
                (currL[1] ^ con[1]) >>> 0,
                (currL[2] ^ con[2]) >>> 0,
                (currL[3] ^ con[3]) >>> 0
            ]
            currL = sigma(currL)
            if (i % 2 === 1) {
                T = [
                    (T[0] ^ K[0]) >>> 0,
                    (T[1] ^ K[1]) >>> 0,
                    (T[2] ^ K[2]) >>> 0,
                    (T[3] ^ K[3]) >>> 0
                ]
            }
            for (let j = 0; j < 4; j++) {
                RK[4 * i + j] = T[j]
            }
        }
        return { WK, RK, rounds: 18 }
    } else if (klen === 24 || klen === 32) {
        let KL: number[], KR: number[], CON_k: number[], max_i: number, rounds: number
        if (klen === 24) {
            KL = K.slice(0, 4)
            KR = [K[4], K[5], (~K[0]) >>> 0, (~K[1]) >>> 0]
            CON_k = CON_192
            max_i = 10
            rounds = 22
        } else {
            KL = K.slice(0, 4)
            KR = K.slice(4, 8)
            CON_k = CON_256
            max_i = 12
            rounds = 26
        }

        const resGfn = GFN_8_r(CON_k.slice(0, 40), 10, KL.concat(KR))
        let currLL = resGfn.slice(0, 4)
        let currLR = resGfn.slice(4, 8)

        const WK = [
            (KL[0] ^ KR[0]) >>> 0,
            (KL[1] ^ KR[1]) >>> 0,
            (KL[2] ^ KR[2]) >>> 0,
            (KL[3] ^ KR[3]) >>> 0
        ]
        const RK = new Array(4 * (max_i + 1))

        for (let i = 0; i <= max_i; i++) {
            const con = CON_k.slice(40 + 4 * i, 40 + 4 * i + 4)
            let T: number[]
            if ((i % 4) === 0 || (i % 4) === 1) {
                T = [
                    (currLL[0] ^ con[0]) >>> 0,
                    (currLL[1] ^ con[1]) >>> 0,
                    (currLL[2] ^ con[2]) >>> 0,
                    (currLL[3] ^ con[3]) >>> 0
                ]
                currLL = sigma(currLL)
                if (i % 2 === 1) {
                    T = [
                        (T[0] ^ KR[0]) >>> 0,
                        (T[1] ^ KR[1]) >>> 0,
                        (T[2] ^ KR[2]) >>> 0,
                        (T[3] ^ KR[3]) >>> 0
                    ]
                }
            } else {
                T = [
                    (currLR[0] ^ con[0]) >>> 0,
                    (currLR[1] ^ con[1]) >>> 0,
                    (currLR[2] ^ con[2]) >>> 0,
                    (currLR[3] ^ con[3]) >>> 0
                ]
                currLR = sigma(currLR)
                if (i % 2 === 1) {
                    T = [
                        (T[0] ^ KL[0]) >>> 0,
                        (T[1] ^ KL[1]) >>> 0,
                        (T[2] ^ KL[2]) >>> 0,
                        (T[3] ^ KL[3]) >>> 0
                    ]
                }
            }
            for (let j = 0; j < 4; j++) {
                RK[4 * i + j] = T[j]
            }
        }
        return { WK, RK, rounds }
    } else {
        throw new CipherError('INVALID_KEY_LENGTH', 'CLEFIA key must be 128, 192, or 256 bits (' + (klen * 8) + ' bits provided).')
    }
}

function parseHex(s: string, lbl: string): Uint8Array {
    const c = s.replace(/\s+/g, '').toLowerCase()
    if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) {
        throw new CipherError('INVALID_INPUT', lbl + ' must be a valid hex string with an even number of digits.')
    }
    const o = new Uint8Array(c.length / 2)
    for (let i = 0; i < o.length; i++) {
        o[i] = parseInt(c.slice(i * 2, i * 2 + 2), 16)
    }
    return o
}

function toHex(b: Uint8Array): string {
    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

function clefiaCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'CLEFIA key')
    if (![16, 24, 32].includes(keyBytes.length)) {
        throw new CipherError('INVALID_KEY_LENGTH', 'CLEFIA key must be 128, 192, or 256 bits (' + (keyBytes.length * 8) + ' bits provided).')
    }
    const inBytes = parseHex(input, 'CLEFIA input')
    if (inBytes.length === 0 || inBytes.length % 16 !== 0) {
        throw new CipherError('INVALID_INPUT', 'CLEFIA input must be a non-empty multiple of 16 bytes.')
    }

    const { WK, RK, rounds } = keySchedule(keyBytes)
    const numBlocks = inBytes.length / 16
    const outBuf = new Uint8Array(inBytes.length)
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0,
            label: 'Key schedule',
            inputState: toHex(keyBytes),
            outputState: WK.length + ' whitening keys, ' + RK.length + ' round keys',
            note: 'CLEFIA key schedule (' + rounds + ' rounds) using GFN permutation and DoubleSwap.',
            isMilestone: true,
        })
    }

    for (let b = 0; b < numBlocks; b++) {
        const blk = inBytes.slice(b * 16, b * 16 + 16)
        const P = [
            ((blk[0] << 24) | (blk[1] << 16) | (blk[2] << 8) | blk[3]) >>> 0,
            ((blk[4] << 24) | (blk[5] << 16) | (blk[6] << 8) | blk[7]) >>> 0,
            ((blk[8] << 24) | (blk[9] << 16) | (blk[10] << 8) | blk[11]) >>> 0,
            ((blk[12] << 24) | (blk[13] << 16) | (blk[14] << 8) | blk[15]) >>> 0,
        ]

        let outWords: number[]
        if (!doDecrypt) {
            // ENCr:
            // Step 1: P0 | (P1 ^ WK0) | P2 | (P3 ^ WK1)
            const T = [P[0], (P[1] ^ WK[0]) >>> 0, P[2], (P[3] ^ WK[1]) >>> 0]
            // Step 2: GFN_{4,r}
            const processed = GFN_4_r(RK, rounds, T)
            // Step 3: T0 | (T1 ^ WK2) | T2 | (T3 ^ WK3)
            outWords = [processed[0], (processed[1] ^ WK[2]) >>> 0, processed[2], (processed[3] ^ WK[3]) >>> 0]
        } else {
            // DECr:
            // Step 1: C0 | (C1 ^ WK2) | C2 | (C3 ^ WK3)
            const T = [P[0], (P[1] ^ WK[2]) >>> 0, P[2], (P[3] ^ WK[3]) >>> 0]
            // Step 2: GFNINV_{4,r}
            const processed = GFNINV_4_r(RK, rounds, T)
            // Step 3: T0 | (T1 ^ WK0) | T2 | (T3 ^ WK1)
            outWords = [processed[0], (processed[1] ^ WK[0]) >>> 0, processed[2], (processed[3] ^ WK[1]) >>> 0]
        }

        for (let i = 0; i < 4; i++) {
            outBuf[b * 16 + i * 4] = (outWords[i] >>> 24) & 0xff
            outBuf[b * 16 + i * 4 + 1] = (outWords[i] >>> 16) & 0xff
            outBuf[b * 16 + i * 4 + 2] = (outWords[i] >>> 8) & 0xff
            outBuf[b * 16 + i * 4 + 3] = outWords[i] & 0xff
        }

        if (instrument) {
            steps.push({
                index: steps.length,
                label: 'Block ' + (b + 1) + '/' + numBlocks,
                inputState: toHex(blk),
                outputState: toHex(outBuf.slice(b * 16, b * 16 + 16)),
                note: (doDecrypt ? 'Decrypted' : 'Encrypted') + ' via GFN_{4,' + rounds + '}.',
                isMilestone: true,
            })
        }
    }

    const durationMs = performance.now() - start
    return {
        output: toHex(outBuf),
        outputEncoding: 'hex',
        steps,
        metadata: {
            ...METADATA,
            rounds,
            keySize: keyBytes.length * 8,
        },
        durationMs,
    }
}

/**
 * Encrypt cipher-engine utility export.
 */
export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return clefiaCore(input, key, false, !!options.instrument)
}

/**
 * Decrypt cipher-engine utility export.
 */
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return clefiaCore(input, key, true, !!options.instrument)
}

/**
 * TEST VECTORS cipher-engine utility export.
 * Verified against RFC 6114 Appendix A.
 */
export const TEST_VECTORS: TestVector[] = [
    {
        input: '000102030405060708090a0b0c0d0e0f',
        key: 'ffeeddccbbaa99887766554433221100',
        expected: 'de2bf2fd9b74aacdf1298555459494fd',
        description: 'RFC 6114 Appendix A (128-bit key)',
    },
    {
        input: '000102030405060708090a0b0c0d0e0f',
        key: 'ffeeddccbbaa99887766554433221100f0e0d0c0b0a09080',
        expected: 'e2482f649f028dc480dda184fde181ad',
        description: 'RFC 6114 Appendix A (192-bit key)',
    },
    {
        input: '000102030405060708090a0b0c0d0e0f',
        key: 'ffeeddccbbaa99887766554433221100f0e0d0c0b0a090807060504030201000',
        expected: 'a1397814289de80c10da46d1fa48b38a',
        description: 'RFC 6114 Appendix A (256-bit key)',
    },
]
