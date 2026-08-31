import { describe, it } from 'vitest'

// Copy the core functions and variables to debug round states
const S_BOX: number[] = [
    0x35, 0x7C, 0x19, 0x5E, 0xE3, 0xA2, 0x4B, 0x81, 0x0C, 0xD8, 0x6F, 0x94, 0x27, 0xBD, 0xF0, 0x16,
    0x63, 0x8A, 0xC1, 0x4E, 0x2D, 0xF5, 0x72, 0xB9, 0x08, 0x91, 0xDC, 0x36, 0xA5, 0xE8, 0x14, 0x6B,
    0x47, 0x23, 0xB1, 0x8E, 0x5A, 0xCF, 0x92, 0x0D, 0x64, 0xD1, 0x3F, 0x78, 0xAB, 0xE0, 0x1C, 0x56,
    0xFE, 0x41, 0x89, 0x2A, 0x6D, 0xB3, 0x07, 0x95, 0xCD, 0x38, 0xA4, 0xE7, 0x1F, 0x70, 0x52, 0xBA,
    0x21, 0x9E, 0xD6, 0x4F, 0x87, 0x0A, 0x6C, 0xB5, 0x13, 0x7A, 0xE4, 0x39, 0xA1, 0xC8, 0x5D, 0xF2,
    0x68, 0xB7, 0x0E, 0x93, 0x2C, 0xE6, 0x45, 0x8B, 0x17, 0x7F, 0xAD, 0x34, 0xC9, 0x50, 0xDE, 0xA3,
    0x9C, 0x1B, 0x77, 0xC4, 0x3E, 0x85, 0xF8, 0x29, 0x61, 0xB0, 0x04, 0x97, 0xD3, 0x4A, 0x86, 0xEF,
    0xA6, 0x5B, 0x90, 0x12, 0x7E, 0xC7, 0x28, 0x83, 0xD5, 0x49, 0xBE, 0x06, 0x9D, 0x3C, 0x71, 0xFA,
    0x54, 0xAF, 0xE1, 0x2B, 0x8D, 0x09, 0x6A, 0xCC, 0x15, 0x73, 0xB4, 0x3D, 0xA0, 0xF7, 0x42, 0x98,
    0xCB, 0x62, 0x0B, 0x84, 0x2F, 0xD9, 0x46, 0xAA, 0x1A, 0x76, 0xE5, 0x3B, 0x9F, 0x58, 0xC3, 0x82,
    0xD4, 0x1D, 0x67, 0xA8, 0x33, 0x9B, 0xF4, 0x51, 0xBC, 0x03, 0x7B, 0xEA, 0x24, 0x8C, 0x65, 0xDF,
    0x43, 0x9A, 0x18, 0x7D, 0xB8, 0x2E, 0x60, 0xC6, 0x05, 0x88, 0xF1, 0x3A, 0xA7, 0x53, 0xD0, 0x4C,
    0xEE, 0x22, 0x8F, 0x11, 0x69, 0xC0, 0x37, 0xA9, 0x5F, 0xD7, 0x02, 0x74, 0xB2, 0x4D, 0x96, 0x80,
    0x26, 0xF9, 0x48, 0xBB, 0x01, 0x75, 0xAC, 0x31, 0x99, 0x6E, 0xDE, 0x10, 0x8A, 0x57, 0xC5, 0x20,
    0xF6, 0x32, 0x79, 0x0F, 0xA4, 0x59, 0xD2, 0x44, 0x8B, 0x1E, 0x66, 0xBF, 0x25, 0x9C, 0xE9, 0x30,
    0x40, 0xC2, 0x55, 0xF3, 0x1F, 0x87, 0xAE, 0x2A, 0x61, 0xDB, 0x0D, 0x9E, 0x78, 0x34, 0xB6, 0x53
]

const S_BOX_INV: number[] = new Array(256).fill(0)
S_BOX.forEach((v, i) => S_BOX_INV[v] = i)

const XS_MDS = [
    [2, 3, 1, 1],
    [1, 2, 3, 1],
    [1, 1, 2, 3],
    [3, 1, 1, 2]
]

const OUTER_MDS = [
    [4, 1, 2, 3],
    [3, 4, 1, 2],
    [2, 3, 4, 1],
    [1, 2, 3, 4]
]

const INV_OUTER_MDS = [
    [0xB4, 0x90, 0x73, 0x52],
    [0x52, 0xB4, 0x90, 0x73],
    [0x73, 0x52, 0xB4, 0x90],
    [0x90, 0x73, 0x52, 0xB4]
]

function u8(n: number): number { return n & 0xFF }

function gfMul(a: number, b: number): number {
    let p = 0, aa = a, bb = b
    for (let i = 0; i < 8; i++) {
        if (bb & 1) p ^= aa
        const carry = aa & 0x80
        aa = (aa << 1) & 0xFF
        if (carry) aa ^= 0x1B
        bb >>= 1
    }
    return p
}

function applyMatrix(state: number[], matrix: number[][]): number[] {
    const out = new Array(4).fill(0)
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            out[i] ^= gfMul(matrix[i][j], state[j])
        }
    }
    return out
}

function xsBoxLayer(state: number[]): number[] {
    const out: number[] = []
    for (let g = 0; g < 4; g++) {
        const offset = g * 4
        const substituted = [
            S_BOX[state[offset]],
            S_BOX[state[offset + 1]],
            S_BOX[state[offset + 2]],
            S_BOX[state[offset + 3]]
        ]
        const diffused = applyMatrix(substituted, XS_MDS)
        out.push(...diffused)
    }
    return out
}

function xsBoxLayerInv(state: number[]): number[] {
    const out: number[] = []
    const INV_XS_MDS = [
        [14, 11, 13, 9],
        [9, 14, 11, 13],
        [13, 9, 14, 11],
        [11, 13, 9, 14]
    ]
    for (let g = 0; g < 4; g++) {
        const offset = g * 4
        const group = [state[offset], state[offset + 1], state[offset + 2], state[offset + 3]]
        const unDiffused = applyMatrix(group, INV_XS_MDS)
        const unsubstituted = unDiffused.map(b => S_BOX_INV[b])
        out.push(...unsubstituted)
    }
    return out
}

function outerDiffusion(state: number[]): number[] {
    const out: number[] = new Array(16).fill(0)
    for (let col = 0; col < 4; col++) {
        const column = [
            state[col],
            state[col + 4],
            state[col + 8],
            state[col + 12]
        ]
        const mixed = applyMatrix(column, OUTER_MDS)
        out[col] = mixed[0]
        out[col + 4] = mixed[1]
        out[col + 8] = mixed[2]
        out[col + 12] = mixed[3]
    }
    return out
}

function outerDiffusionInv(state: number[]): number[] {
    const out: number[] = new Array(16).fill(0)
    for (let col = 0; col < 4; col++) {
        const column = [
            state[col],
            state[col + 4],
            state[col + 8],
            state[col + 12]
        ]
        const mixed = applyMatrix(column, INV_OUTER_MDS)
        out[col] = mixed[0]
        out[col + 4] = mixed[1]
        out[col + 8] = mixed[2]
        out[col + 12] = mixed[3]
    }
    return out
}

function parseHex(s: string): number[] {
    const c = s.replace(/\s+/g, '').toLowerCase()
    const o: number[] = []
    for (let i = 0; i < c.length; i += 2) o.push(parseInt(c.slice(i, i + 2), 16))
    return o
}

function toHex(b: number[]): string {
    return b.map(x => x.toString(16).padStart(2, '0')).join('')
}

function keySchedule(keyBytes: number[]): number[][] {
    const rounds = keyBytes.length === 16 ? 6 : keyBytes.length === 24 ? 7 : 8
    const roundKeys: number[][] = []
    let current = [...keyBytes]
    const RC = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1B]
    while (current.length < 16 * (rounds + 1)) {
        const lastBlock = current.slice(current.length - 16)
        const nextBlock: number[] = new Array(16).fill(0)
        const rcIdx = Math.floor(current.length / 16) - 1
        for (let i = 0; i < 16; i++) {
            const sboxVal = S_BOX[lastBlock[i]]
            nextBlock[i] = u8(sboxVal ^ RC[rcIdx % RC.length] ^ i)
        }
        current.push(...nextBlock)
    }
    for (let r = 0; r <= rounds; r++) {
        roundKeys.push(current.slice(r * 16, r * 16 + 16))
    }
    return roundKeys
}

describe('Hierocrypt-3 Trace', () => {
    it('traces encrypt and decrypt', () => {
        const keyHex = '11223344556677889900aabbccddeeff'
        const ptHex = '00112233445566778899aabbccddeeff'
        
        const keyBytes = parseHex(keyHex)
        const inBytes = parseHex(ptHex)
        const roundKeys = keySchedule(keyBytes)
        const rounds = roundKeys.length - 1

        let state = [...inBytes]
        console.log('ENC Input:', toHex(state))
        for (let i = 0; i < 16; i++) state[i] ^= roundKeys[0][i]
        console.log('ENC after KeyAdd 0:', toHex(state))

        for (let r = 1; r <= rounds; r++) {
            state = xsBoxLayer(state)
            console.log(`ENC Round ${r} after XS1:`, toHex(state))
            state = outerDiffusion(state)
            console.log(`ENC Round ${r} after MDS:`, toHex(state))
            state = xsBoxLayer(state)
            console.log(`ENC Round ${r} after XS2:`, toHex(state))
            for (let i = 0; i < 16; i++) state[i] ^= roundKeys[r][i]
            console.log(`ENC Round ${r} after KeyAdd:`, toHex(state))
        }

        const ctHex = toHex(state)
        console.log('ENC Output (CT):', ctHex)

        console.log('--- START DECRYPTION ---')
        state = parseHex(ctHex)
        console.log('DEC Input:', toHex(state))
        for (let i = 0; i < 16; i++) state[i] ^= roundKeys[rounds][i]
        console.log(`DEC after KeyAdd ${rounds}:`, toHex(state))

        for (let r = rounds - 1; r >= 0; r--) {
            state = xsBoxLayerInv(state)
            console.log(`DEC Round ${r} after XS2Inv:`, toHex(state))
            state = outerDiffusionInv(state)
            console.log(`DEC Round ${r} after MDSInv:`, toHex(state))
            state = xsBoxLayerInv(state)
            console.log(`DEC Round ${r} after XS1Inv:`, toHex(state))
            for (let i = 0; i < 16; i++) state[i] ^= roundKeys[r][i]
            console.log(`DEC Round ${r} after KeyAdd:`, toHex(state))
        }
    })
})
