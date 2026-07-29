import { describe, it, expect } from 'vitest'
import {
  buildMerkleTree,
  generateMerkleProof,
  verifyMerkleProof,
  computeSingleHash,
  computePairHash,
} from '@/lib/utils/merkle'

describe('Merkle Tree Utility Unit Tests', () => {
  const leavesEven = ['Tx0', 'Tx1', 'Tx2', 'Tx3']
  const leavesOdd = ['Tx0', 'Tx1', 'Tx2']

  it('correctly hashes values', () => {
    const valHash = computeSingleHash('abc', 'sha256')
    // Expected SHA-256 of 'abc'
    expect(valHash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('builds an empty tree', () => {
    const { levels, root } = buildMerkleTree([], 'sha256')
    expect(levels.length).toBe(1)
    expect(levels[0].length).toBe(1)
    expect(root.label).toBe('Root (Empty)')
    expect(root.hash).toBe(computeSingleHash('', 'sha256'))
  })

  it('builds a single node tree', () => {
    const { levels, root } = buildMerkleTree(['Tx0'], 'sha256')
    expect(levels.length).toBe(1)
    expect(levels[0].length).toBe(1)
    expect(root.type).toBe('root')
    expect(root.hash).toBe(computeSingleHash('Tx0', 'sha256'))
  })

  it('builds a tree with even number of leaves', () => {
    const { levels, root } = buildMerkleTree(leavesEven, 'sha256')
    // 4 leaves -> level 0 (4 nodes), level 1 (2 nodes), level 2 (1 root node)
    expect(levels.length).toBe(3)
    expect(levels[0].length).toBe(4)
    expect(levels[1].length).toBe(2)
    expect(levels[2].length).toBe(1)
    
    // Check root calculation
    const h0 = computeSingleHash('Tx0', 'sha256')
    const h1 = computeSingleHash('Tx1', 'sha256')
    const h2 = computeSingleHash('Tx2', 'sha256')
    const h3 = computeSingleHash('Tx3', 'sha256')

    const h01 = computePairHash(h0, h1, 'sha256')
    const h23 = computePairHash(h2, h3, 'sha256')
    const expectedRoot = computePairHash(h01, h23, 'sha256')

    expect(root.hash).toBe(expectedRoot)
  })

  it('builds an odd tree using duplicate strategy', () => {
    const { levels, root } = buildMerkleTree(leavesOdd, 'sha256', 'duplicate')
    // 3 leaves -> level 0 gets duplicated to 4 nodes
    // Level 0: [H0, H1, H2, H2_Dup]
    // Level 1: [H01, H22]
    // Level 2: [Root]
    expect(levels.length).toBe(3)
    expect(levels[0].length).toBe(4)
    expect(levels[0][3].isDuplicated).toBe(true)
    expect(levels[0][3].hash).toBe(levels[0][2].hash)

    const h0 = computeSingleHash('Tx0', 'sha256')
    const h1 = computeSingleHash('Tx1', 'sha256')
    const h2 = computeSingleHash('Tx2', 'sha256')

    const h01 = computePairHash(h0, h1, 'sha256')
    const h22 = computePairHash(h2, h2, 'sha256')
    const expectedRoot = computePairHash(h01, h22, 'sha256')

    expect(root.hash).toBe(expectedRoot)
  })

  it('builds an odd tree using promote strategy', () => {
    const { levels, root } = buildMerkleTree(leavesOdd, 'sha256', 'promote')
    // 3 leaves, promote strategy:
    // Level 0: [H0, H1, H2] -> length is 3 (odd)
    // Level 1: H01 is paired, H2 is promoted -> [H01, H2]
    // Level 2: [H(H01 + H2)] -> Root
    expect(levels.length).toBe(3)
    expect(levels[0].length).toBe(3) // no duplication
    expect(levels[1].length).toBe(2)
    expect(levels[1][1].hash).toBe(levels[0][2].hash) // promoted directly

    const h0 = computeSingleHash('Tx0', 'sha256')
    const h1 = computeSingleHash('Tx1', 'sha256')
    const h2 = computeSingleHash('Tx2', 'sha256')

    const h01 = computePairHash(h0, h1, 'sha256')
    const expectedRoot = computePairHash(h01, h2, 'sha256')

    expect(root.hash).toBe(expectedRoot)
  })

  it('generates and verifies Merkle Proofs', () => {
    const { levels, root } = buildMerkleTree(leavesEven, 'sha256')

    // Test for Leaf index 2 ("Tx2")
    const proof = generateMerkleProof(levels, 2)
    expect(proof.leafValue).toBe('Tx2')
    expect(proof.leafIndex).toBe(2)
    expect(proof.auditPath.length).toBe(2)

    // Audit Path for index 2:
    // Sibling 1 (level 0): index 3 ("Tx3") hash
    // Sibling 2 (level 1): index 0 (H01) hash
    expect(proof.auditPath[0].hash).toBe(levels[0][3].hash)
    expect(proof.auditPath[0].isLeft).toBe(false) // sibling on right

    expect(proof.auditPath[1].hash).toBe(levels[1][0].hash)
    expect(proof.auditPath[1].isLeft).toBe(true) // sibling on left

    // Verify proof
    const { verified, computedHashes } = verifyMerkleProof(
      proof.leafHash,
      proof.auditPath,
      root.hash,
      'sha256'
    )
    expect(verified).toBe(true)
    expect(computedHashes.length).toBe(3)
    expect(computedHashes[computedHashes.length - 1]).toBe(root.hash)
  })

  it('fails verification on modified parameters', () => {
    const { levels, root } = buildMerkleTree(leavesEven, 'sha256')
    const proof = generateMerkleProof(levels, 1)

    // Verify correct proof succeeds
    const ok = verifyMerkleProof(proof.leafHash, proof.auditPath, root.hash, 'sha256')
    expect(ok.verified).toBe(true)

    // Wrong root fails
    const badRoot = verifyMerkleProof(proof.leafHash, proof.auditPath, 'wrongroot', 'sha256')
    expect(badRoot.verified).toBe(false)

    // Wrong leaf fails
    const badLeaf = verifyMerkleProof(computeSingleHash('ModifiedTx', 'sha256'), proof.auditPath, root.hash, 'sha256')
    expect(badLeaf.verified).toBe(false)

    // Modified audit path fails
    const modifiedPath = [...proof.auditPath]
    const fakeHash = 'a'.repeat(proof.auditPath[0].hash.length)
    modifiedPath[0] = { ...modifiedPath[0], hash: fakeHash }
    const badPath = verifyMerkleProof(proof.leafHash, modifiedPath, root.hash, 'sha256')
    expect(badPath.verified).toBe(false)
  })
})
