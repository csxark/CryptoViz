/**
 * KASUMI — 3GPP TS 35.202 / ETSI SAGE.
 * Hardware-optimized block cipher used in UMTS (f8/f9) and GSM (A5/3).
 * 64-bit block, 128-bit key, 8 Feistel rounds.
 * 
 * Status: BROKEN (Dunkelman, Keller, Shamir 2010 related-key sandwich attack).
 * Included for educational and historical value as an international telecommunications standard.
 */
import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
    name: 'KASUMI',
    keySize: 128,
    blockSize: 64,
    rounds: 8,
    securityStatus: 'broken',
    breakingComplexity: 'Practical related-key attack (2010). Protocol-level weaknesses in A5/3.',
    yearDesigned: 1999,
    standardBody: '3GPP TS 35.202',
}

const S7: number[] = [
     54,  50,  62,  56,  22,  34,  94,  96,  38,   6,  63,  93,   2,  18, 123,  33,
     55, 113,  39, 114,  21,  67,  65,  12,  47,  73,  46,  27,  25, 111, 124,  81,
     53,   9, 121,  79,  52,  60,  58,  48, 101, 127,  40, 120, 104,  70,  71,  43,
     20, 122,  72,  61,  23, 109,  13, 100,  77,   1,  16,   7,  82,  10, 105,  98,
    117, 116,  76,  11,  89, 106,   0, 125, 118,  99,  86,  69,  30,  57, 126,  87,
    112,  51,  17,   5,  95,  14,  90,  84,  91,   8,  35, 103,  32,  97,  28,  66,
    102,  31,  26,  45,  75,   4,  85,  92,  37,  74,  80,  49,  68,  29, 115,  44,
     64, 107, 108,  24, 110,  83,  36,  78,  42,  19,  15,  41,  88, 119,  59,   3,
]

const S9: number[] = [
    167, 239, 161, 379, 391, 334,   9, 338,  38, 226,  48, 358, 452, 385,  90, 397,
    183, 253, 147, 331, 415, 340,  51, 362, 306, 500, 262,  82, 216, 159, 356, 177,
    175, 241, 489,  37, 206,  17,   0, 333,  44, 254, 378,  58, 143, 220,  81, 400,
     95,   3, 315, 245,  54, 235, 218, 405, 472, 264, 172, 494, 371, 290, 399,  76,
    165, 197, 395, 121, 257, 480, 423, 212, 240,  28, 462, 176, 406, 507, 288, 223,
    501, 407, 249, 265,  89, 186, 221, 428, 164,  74, 440, 196, 458, 421, 350, 163,
    232, 158, 134, 354,  13, 250, 491, 142, 191,  69, 193, 425, 152, 227, 366, 135,
    344, 300, 276, 242, 437, 320, 113, 278,  11, 243,  87, 317,  36,  93, 496,  27,
    487, 446, 482,  41,  68, 156, 457, 131, 326, 403, 339,  20,  39, 115, 442, 124,
    475, 384, 508,  53, 112, 170, 479, 151, 126, 169,  73, 268, 279, 321, 168, 364,
    363, 292,  46, 499, 393, 327, 324,  24, 456, 267, 157, 460, 488, 426, 309, 229,
    439, 506, 208, 271, 349, 401, 434, 236,  16, 209, 359,  52,  56, 120, 199, 277,
    465, 416, 252, 287, 246,   6,  83, 305, 420, 345, 153, 502,  65,  61, 244, 282,
    173, 222, 418,  67, 386, 368, 261, 101, 476, 291, 195, 430,  49,  79, 166, 330,
    280, 383, 373, 128, 382, 408, 155, 495, 367, 388, 274, 107, 459, 417,  62, 454,
    132, 225, 203, 316, 234,  14, 301,  91, 503, 286, 424, 211, 347, 307, 140, 374,
     35, 103, 125, 427,  19, 214, 453, 146, 498, 314, 444, 230, 256, 329, 198, 285,
     50, 116,  78, 410,  10, 205, 510, 171, 231,  45, 139, 467,  29,  86, 505,  32,
     72,  26, 342, 150, 313, 490, 431, 238, 411, 325, 149, 473,  40, 119, 174, 355,
    185, 233, 389,  71, 448, 273, 372,  55, 110, 178, 322,  12, 469, 392, 369, 190,
      1, 109, 375, 137, 181,  88,  75, 308, 260, 484,  98, 272, 370, 275, 412, 111,
    336, 318,   4, 504, 492, 259, 304,  77, 337, 435,  21, 357, 303, 332, 483,  18,
     47,  85,  25, 497, 474, 289, 100, 269, 296, 478, 270, 106,  31, 104, 433,  84,
    414, 486, 394,  96,  99, 154, 511, 148, 413, 361, 409, 255, 162, 215, 302, 201,
    266, 351, 343, 144, 441, 365, 108, 298, 251,  34, 182, 509, 138, 210, 335, 133,
    311, 352, 328, 141, 396, 346, 123, 319, 450, 281, 429, 228, 443, 481,  92, 404,
    485, 422, 248, 297,  23, 213, 130, 466,  22, 217, 283,  70, 294, 360, 419, 127,
    312, 377,   7, 468, 194,   2, 117, 295, 463, 258, 224, 447, 247, 187,  80, 398,
    284, 353, 105, 390, 299, 471, 470, 184,  57, 200, 348,  63, 204, 188,  33, 451,
     97,  30, 310, 219,  94, 160, 129, 493,  64, 179, 263, 102, 189, 207, 114, 402,
    438, 477, 387, 122, 192,  42, 381,   5, 145, 118, 180, 449, 293, 323, 136, 380,
     43,  66,  60, 455, 341, 445, 202, 432,   8, 237,  15, 376, 436, 464,  59, 461,
]

function rol16(val: number, n: number): number {
    return (((val << n) | (val >>> (16 - n))) & 0xffff) >>> 0
}

// FI function (16-bit input, 16-bit key)
function FI(x: number, KI: number): number {
    const l0 = (x >>> 7) & 0x1ff
    const r0 = x & 0x7f

    const r1 = S9[l0] ^ r0
    const l1 = S7[r0] ^ (r1 & 0x7f)

    const x1 = (l1 << 9) | r1
    const x2 = x1 ^ KI

    const l2 = (x2 >>> 9) & 0x7f
    const r2 = x2 & 0x1ff

    const r3 = S9[r2] ^ l2
    const l3 = S7[l2] ^ (r3 & 0x7f)

    return (((l3 << 9) | r3) & 0xffff) >>> 0
}

// FO function (32-bit input, three 16-bit KO keys, three 16-bit KI keys)
function FO(x: number, KO: number[], KI: number[]): number {
    let l = (x >>> 16) & 0xffff
    let r = x & 0xffff

    for (let j = 0; j < 3; j++) {
        const newR = (FI(l ^ KO[j], KI[j]) ^ r) & 0xffff
        const newL = r
        l = newL
        r = newR
    }

    return (((l << 16) | r) >>> 0)
}

// FL function (32-bit input, two 16-bit KL keys)
function FL(x: number, KL: number[]): number {
    let l = (x >>> 16) & 0xffff
    let r = x & 0xffff

    const rPrime = (rol16(l & KL[0], 1) ^ r) & 0xffff
    const lPrime = (rol16(rPrime | KL[1], 1) ^ l) & 0xffff

    return (((lPrime << 16) | rPrime) >>> 0)
}

const C: number[] = [0x0123, 0x4567, 0x89ab, 0xcdef, 0xfedc, 0xba98, 0x7654, 0x3210]

interface RoundKeys {
    KL: number[]
    KO: number[]
    KI: number[]
}

function keySchedule(keyBytes: Uint8Array): RoundKeys[] {
    const K = new Array(8)
    for (let i = 0; i < 8; i++) {
        K[i] = (keyBytes[2 * i] << 8) | keyBytes[2 * i + 1]
    }
    const Kp = new Array(8)
    for (let i = 0; i < 8; i++) {
        Kp[i] = (K[i] ^ C[i]) & 0xffff
    }

    const roundKeys: RoundKeys[] = []
    for (let i = 0; i < 8; i++) {
        const kl1 = rol16(K[i], 1)
        const kl2 = Kp[(i + 2) % 8]

        const ko1 = rol16(K[(i + 1) % 8], 5)
        const ko2 = rol16(K[(i + 5) % 8], 8)
        const ko3 = rol16(K[(i + 6) % 8], 13)

        const ki1 = Kp[(i + 4) % 8]
        const ki2 = Kp[(i + 3) % 8]
        const ki3 = Kp[(i + 7) % 8]

        roundKeys.push({
            KL: [kl1, kl2],
            KO: [ko1, ko2, ko3],
            KI: [ki1, ki2, ki3],
        })
    }
    return roundKeys
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

function kasumiEncryptBlock(block: Uint8Array, rk: RoundKeys[]): Uint8Array {
    let L = (((block[0] << 24) | (block[1] << 16) | (block[2] << 8) | block[3]) >>> 0)
    let R = (((block[4] << 24) | (block[5] << 16) | (block[6] << 8) | block[7]) >>> 0)

    for (let i = 0; i < 8; i++) {
        let fOut: number
        if ((i + 1) % 2 === 1) {
            fOut = FO(FL(L, rk[i].KL), rk[i].KO, rk[i].KI)
        } else {
            fOut = FL(FO(L, rk[i].KO, rk[i].KI), rk[i].KL)
        }
        const nextL = (R ^ fOut) >>> 0
        const nextR = L
        L = nextL
        R = nextR
    }

    const out = new Uint8Array(8)
    out[0] = (L >>> 24) & 0xff
    out[1] = (L >>> 16) & 0xff
    out[2] = (L >>> 8) & 0xff
    out[3] = L & 0xff
    out[4] = (R >>> 24) & 0xff
    out[5] = (R >>> 16) & 0xff
    out[6] = (R >>> 8) & 0xff
    out[7] = R & 0xff
    return out
}

function kasumiDecryptBlock(block: Uint8Array, rk: RoundKeys[]): Uint8Array {
    let L = (((block[0] << 24) | (block[1] << 16) | (block[2] << 8) | block[3]) >>> 0)
    let R = (((block[4] << 24) | (block[5] << 16) | (block[6] << 8) | block[7]) >>> 0)

    for (let i = 7; i >= 0; i--) {
        const prevL = R
        let fOut: number
        if ((i + 1) % 2 === 1) {
            fOut = FO(FL(prevL, rk[i].KL), rk[i].KO, rk[i].KI)
        } else {
            fOut = FL(FO(prevL, rk[i].KO, rk[i].KI), rk[i].KL)
        }
        const prevR = (L ^ fOut) >>> 0
        L = prevL
        R = prevR
    }

    const out = new Uint8Array(8)
    out[0] = (L >>> 24) & 0xff
    out[1] = (L >>> 16) & 0xff
    out[2] = (L >>> 8) & 0xff
    out[3] = L & 0xff
    out[4] = (R >>> 24) & 0xff
    out[5] = (R >>> 16) & 0xff
    out[6] = (R >>> 8) & 0xff
    out[7] = R & 0xff
    return out
}

function kasumiCore(input: string, key: string, doDecrypt: boolean, instrument: boolean): CipherResult {
    const start = performance.now()
    validateKey(key)
    const keyBytes = parseHex(key, 'KASUMI key')
    if (keyBytes.length !== 16) {
        throw new CipherError('INVALID_KEY_LENGTH', 'KASUMI key must be 128 bits (16 bytes).')
    }
    const inBytes = parseHex(input, 'KASUMI input')
    if (inBytes.length === 0 || inBytes.length % 8 !== 0) {
        throw new CipherError('INVALID_INPUT', 'KASUMI input must be a non-empty multiple of 8 bytes (64 bits).')
    }

    const rk = keySchedule(keyBytes)
    const numBlocks = inBytes.length / 8
    const outBuf = new Uint8Array(inBytes.length)
    const steps: CipherStep[] = []

    if (instrument) {
        steps.push({
            index: 0,
            label: 'Key schedule',
            inputState: toHex(keyBytes),
            outputState: '8 round subkeys (KL, KO, KI)',
            note: '3GPP TS 35.202 subkey generation with constant C XOR mixing and circular rotations.',
            isMilestone: true,
        })
    }

    for (let b = 0; b < numBlocks; b++) {
        const blk = inBytes.slice(b * 8, b * 8 + 8)
        const resBlk = doDecrypt ? kasumiDecryptBlock(blk, rk) : kasumiEncryptBlock(blk, rk)
        outBuf.set(resBlk, b * 8)

        if (instrument) {
            steps.push({
                index: steps.length,
                label: 'Block ' + (b + 1) + '/' + numBlocks,
                inputState: toHex(blk),
                outputState: toHex(resBlk),
                note: (doDecrypt ? 'Decrypted' : 'Encrypted') + ' 8 Feistel rounds with FO/FL.',
                isMilestone: true,
            })
        }
    }

    const durationMs = performance.now() - start
    return {
        output: toHex(outBuf),
        outputEncoding: 'hex',
        steps,
        metadata: METADATA,
        durationMs,
    }
}

/**
 * Encrypt cipher-engine utility export.
 */
export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return kasumiCore(input, key, false, !!options.instrument)
}

/**
 * Decrypt cipher-engine utility export.
 */
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
    validateInput(input)
    return kasumiCore(input, key, true, !!options.instrument)
}

/**
 * TEST VECTORS cipher-engine utility export.
 * Official 3GPP TS 35.202 test vector.
 */
export const TEST_VECTORS: TestVector[] = [
    {
        input: 'fedcba0987654321',
        key: '9900aabbccddeeff1122334455667788',
        expected: '514896226caa4f20',
        description: '3GPP TS 35.202 Section 4 test vector',
    },
]
