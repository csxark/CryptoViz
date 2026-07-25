import { sha256 } from '@noble/hashes/sha2.js'
import { sha512 } from '@noble/hashes/sha2.js'
import { md5 } from '@noble/hashes/legacy.js'
import { sha3_256 } from '@noble/hashes/sha3.js'
import { toByteArray, fromByteArray } from './encoding'

export type HashType = 'sha256' | 'sha512' | 'md5' | 'sha3'
export type OddStrategy = 'duplicate' | 'promote'

export interface MerkleNode {
  id: string
  hash: string
  label: string
  type: 'leaf' | 'internal' | 'root'
  level: number
  index: number
  value?: string
  leftId?: string
  rightId?: string
  parentId?: string
  isDuplicated?: boolean
}

export interface MerkleProofStep {
  hash: string
  isLeft: boolean
  label: string
}

export interface MerkleProof {
  leafValue: string
  leafHash: string
  leafIndex: number
  auditPath: MerkleProofStep[]
  rootHash: string
}

function getHasher(hashType: HashType): (data: Uint8Array) => Uint8Array {
  switch (hashType) {
    case 'sha512':
      return sha512
    case 'md5':
      return md5
    case 'sha3':
      return sha3_256
    case 'sha256':
    default:
      return sha256
  }
}

export function computeSingleHash(value: string, hashType: HashType): string {
  const bytes = new TextEncoder().encode(value)
  const hashFn = getHasher(hashType)
  const hashed = hashFn(bytes)
  return fromByteArray(hashed, 'hex')
}

export function computePairHash(leftHex: string, rightHex: string, hashType: HashType): string {
  const leftBytes = toByteArray(leftHex, 'hex')
  const rightBytes = toByteArray(rightHex, 'hex')
  const combined = new Uint8Array(leftBytes.length + rightBytes.length)
  combined.set(leftBytes)
  combined.set(rightBytes, leftBytes.length)
  const hashFn = getHasher(hashType)
  const hashed = hashFn(combined)
  return fromByteArray(hashed, 'hex')
}

export function buildMerkleTree(
  leafValues: string[],
  hashType: HashType = 'sha256',
  oddStrategy: OddStrategy = 'duplicate'
): { levels: MerkleNode[][]; root: MerkleNode } {
  const levels: MerkleNode[][] = []
  
  // 1. Initialize leaves
  const leafNodes: MerkleNode[] = leafValues.map((val, idx) => {
    const hash = computeSingleHash(val, hashType)
    return {
      id: `0-${idx}`,
      hash,
      label: `Leaf ${idx}`,
      type: 'leaf',
      level: 0,
      index: idx,
      value: val,
    }
  })

  if (leafNodes.length === 0) {
    const emptyHash = computeSingleHash('', hashType)
    const rootNode: MerkleNode = {
      id: '0-0',
      hash: emptyHash,
      label: 'Root (Empty)',
      type: 'root',
      level: 0,
      index: 0,
      value: '',
    }
    return { levels: [[rootNode]], root: rootNode }
  }

  // Work with a mutable copy of leaves to build level 0
  const initialLevel = [...leafNodes]
  levels.push(initialLevel)

  let currentLevelIndex = 0
  while (levels[currentLevelIndex].length > 1) {
    const currentLevel = levels[currentLevelIndex]
    const nextLevel: MerkleNode[] = []

    const hasOddNode = currentLevel.length % 2 !== 0
    if (hasOddNode) {
      if (oddStrategy === 'duplicate') {
        const lastNode = currentLevel[currentLevel.length - 1]
        const dupNode: MerkleNode = {
          ...lastNode,
          id: `${currentLevelIndex}-${currentLevel.length}`,
          index: currentLevel.length,
          label: `${lastNode.label} (Dup)`,
          isDuplicated: true,
        }
        currentLevel.push(dupNode)
      }
    }

    for (let j = 0; j < currentLevel.length; j += 2) {
      const left = currentLevel[j]
      const right = currentLevel[j + 1]

      if (right) {
        const parentHash = computePairHash(left.hash, right.hash, hashType)
        const parentId = `${currentLevelIndex + 1}-${nextLevel.length}`
        const parentNode: MerkleNode = {
          id: parentId,
          hash: parentHash,
          label: `H_${left.id.replace(/-/g, '_')}_${right.id.replace(/-/g, '_')}`,
          type: 'internal',
          level: currentLevelIndex + 1,
          index: nextLevel.length,
          leftId: left.id,
          rightId: right.id,
        }
        left.parentId = parentId
        right.parentId = parentId
        nextLevel.push(parentNode)
      } else {
        // promote strategy, right is undefined
        const parentId = `${currentLevelIndex + 1}-${nextLevel.length}`
        const parentNode: MerkleNode = {
          id: parentId,
          hash: left.hash,
          label: left.label,
          type: 'internal',
          level: currentLevelIndex + 1,
          index: nextLevel.length,
          leftId: left.id,
        }
        left.parentId = parentId
        nextLevel.push(parentNode)
      }
    }

    levels.push(nextLevel)
    currentLevelIndex++
  }

  const rootLevel = levels[levels.length - 1]
  if (rootLevel.length > 0) {
    rootLevel[0].type = 'root'
    rootLevel[0].label = 'Root'
  }

  return {
    levels,
    root: rootLevel[0],
  }
}

export function generateMerkleProof(
  levels: MerkleNode[][],
  leafIndex: number
): MerkleProof {
  const leafLevel = levels[0]
  if (leafIndex < 0 || leafIndex >= leafLevel.length) {
    throw new Error('Leaf index out of bounds')
  }

  const auditPath: MerkleProofStep[] = []
  let currentIndex = leafIndex

  for (let i = 0; i < levels.length - 1; i++) {
    const level = levels[i]
    const isOdd = currentIndex % 2 !== 0
    const siblingIndex = isOdd ? currentIndex - 1 : currentIndex + 1

    if (siblingIndex < level.length) {
      const siblingNode = level[siblingIndex]
      auditPath.push({
        hash: siblingNode.hash,
        isLeft: isOdd,
        label: siblingNode.label,
      })
    }

    currentIndex = Math.floor(currentIndex / 2)
  }

  return {
    leafValue: leafLevel[leafIndex].value || '',
    leafHash: leafLevel[leafIndex].hash,
    leafIndex,
    auditPath,
    rootHash: levels[levels.length - 1][0].hash,
  }
}

export function verifyMerkleProof(
  leafHash: string,
  auditPath: MerkleProofStep[],
  rootHash: string,
  hashType: HashType = 'sha256'
): { verified: boolean; computedHashes: string[] } {
  let currentHash = leafHash
  const computedHashes: string[] = [currentHash]

  for (const step of auditPath) {
    if (step.isLeft) {
      currentHash = computePairHash(step.hash, currentHash, hashType)
    } else {
      currentHash = computePairHash(currentHash, step.hash, hashType)
    }
    computedHashes.push(currentHash)
  }

  return {
    verified: currentHash === rootHash,
    computedHashes,
  }
}
