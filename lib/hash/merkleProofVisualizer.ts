export interface MerkleProofInput { leavesText: string; selectedLeafIndex: number }
export interface MerkleLeaf { index: number; value: string; hash: string }
export interface MerkleTreeNode { level: number; index: number; hash: string; leftHash: string | null; rightHash: string | null; duplicated: boolean }
export interface MerkleProofStep { level: number; siblingIndex: number; siblingHash: string; siblingPosition: "left" | "right"; combined: string; resultingHash: string; note: string }
export interface MerkleProofResult { leaves: MerkleLeaf[]; levels: MerkleTreeNode[][]; root: string; selectedLeaf: MerkleLeaf; proof: MerkleProofStep[]; verificationSteps: MerkleProofStep[]; verified: boolean }

export const DEFAULT_MERKLE_PROOF_INPUT: MerkleProofInput = {
  leavesText: "Alice pays Bob 5\nBob pays Carol 2\nCarol pays Dave 1\nDave pays Eve 3",
  selectedLeafIndex: 1,
}

function toHex32(value: number) { return (value >>> 0).toString(16).padStart(8, "0") }

export function demoHash(input: string): string {
  let hash = 0x811c9dc5
  for (const char of input) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  hash ^= hash >>> 16; hash = Math.imul(hash, 0x7feb352d) >>> 0
  hash ^= hash >>> 15; hash = Math.imul(hash, 0x846ca68b) >>> 0
  hash ^= hash >>> 16
  return toHex32(hash)
}

export function parseMerkleLeaves(leavesText: string): string[] {
  return leavesText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

export function validateMerkleProofInput(input: MerkleProofInput): MerkleProofInput {
  const leaves = parseMerkleLeaves(input.leavesText)
  if (leaves.length < 2) throw new Error("Add at least two leaves to build a Merkle tree.")
  if (leaves.length > 16) throw new Error("This educational demo supports up to 16 leaves.")
  if (!Number.isInteger(input.selectedLeafIndex)) throw new Error("Selected leaf index must be an integer.")
  if (input.selectedLeafIndex < 0 || input.selectedLeafIndex >= leaves.length) throw new Error("Selected leaf index must point to an existing leaf.")
  return { leavesText: leaves.join("\n"), selectedLeafIndex: input.selectedLeafIndex }
}

export function hashLeaf(value: string, index: number): string { return demoHash(`leaf:${index}:${value}`) }
export function hashParent(leftHash: string, rightHash: string): string { return demoHash(`node:${leftHash}:${rightHash}`) }

export function verifyMerkleProof(leafHash: string, proof: MerkleProofStep[], expectedRoot: string): MerkleProofStep[] {
  let currentHash = leafHash
  return proof.map((step) => {
    const leftHash = step.siblingPosition === "left" ? step.siblingHash : currentHash
    const rightHash = step.siblingPosition === "left" ? currentHash : step.siblingHash
    currentHash = hashParent(leftHash, rightHash)
    return { ...step, combined: `${leftHash}${rightHash}`, resultingHash: currentHash, note: currentHash === expectedRoot ? "This step reaches the expected Merkle root, so the proof verifies." : step.note }
  })
}

export function buildMerkleProofVisualization(rawInput: MerkleProofInput): MerkleProofResult {
  const input = validateMerkleProofInput(rawInput)
  const leafValues = parseMerkleLeaves(input.leavesText)
  const leaves: MerkleLeaf[] = leafValues.map((value, index) => ({ index, value, hash: hashLeaf(value, index) }))
  const levels: MerkleTreeNode[][] = [leaves.map((leaf) => ({ level: 0, index: leaf.index, hash: leaf.hash, leftHash: null, rightHash: null, duplicated: false }))]
  let currentLevel = levels[0]
  let level = 1
  while (currentLevel.length > 1) {
    const nextLevel: MerkleTreeNode[] = []
    for (let index = 0; index < currentLevel.length; index += 2) {
      const left = currentLevel[index]
      const right = currentLevel[index + 1] ?? left
      const duplicated = currentLevel[index + 1] === undefined
      nextLevel.push({ level, index: nextLevel.length, leftHash: left.hash, rightHash: right.hash, duplicated, hash: hashParent(left.hash, right.hash) })
    }
    levels.push(nextLevel); currentLevel = nextLevel; level += 1
  }
  let proofIndex = input.selectedLeafIndex
  const proof: MerkleProofStep[] = []
  for (let proofLevel = 0; proofLevel < levels.length - 1; proofLevel += 1) {
    const nodes = levels[proofLevel]
    const isRightNode = proofIndex % 2 === 1
    const siblingIndex = isRightNode ? proofIndex - 1 : proofIndex + 1
    const currentNode = nodes[proofIndex]
    const sibling = nodes[siblingIndex] ?? currentNode
    const siblingPosition = isRightNode ? "left" : "right"
    const leftHash = siblingPosition === "left" ? sibling.hash : currentNode.hash
    const rightHash = siblingPosition === "left" ? currentNode.hash : sibling.hash
    proof.push({ level: proofLevel, siblingIndex: sibling.index, siblingHash: sibling.hash, siblingPosition, combined: `${leftHash}${rightHash}`, resultingHash: hashParent(leftHash, rightHash), note: sibling === currentNode ? "The level has an odd number of nodes, so the selected node is duplicated before hashing upward." : `The sibling is on the ${siblingPosition}, so verification must preserve this order before hashing.` })
    proofIndex = Math.floor(proofIndex / 2)
  }
  const root = levels.at(-1)?.[0].hash ?? ""
  const verificationSteps = verifyMerkleProof(leaves[input.selectedLeafIndex].hash, proof, root)
  return { leaves, levels, root, selectedLeaf: leaves[input.selectedLeafIndex], proof, verificationSteps, verified: verificationSteps.at(-1)?.resultingHash === root }
}

export function buildMerkleProofManualChecklist(): string[] {
  return [
    "Open the Merkle Proof Demonstration page.",
    "Confirm the default leaves build a visible Merkle tree.",
    "Select different leaves and confirm the proof path updates.",
    "Confirm the displayed root remains stable for unchanged leaves.",
    "Add a fifth leaf and confirm the odd node duplication explanation appears.",
    "Edit one leaf and confirm the root changes.",
    "Clear all but one leaf and confirm a friendly validation error appears.",
    "Resize to mobile width and confirm tree, proof, and verification sections remain usable.",
  ]
}
