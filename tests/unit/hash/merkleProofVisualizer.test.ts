import { describe, expect, it } from "vitest"
import { DEFAULT_MERKLE_PROOF_INPUT, buildMerkleProofManualChecklist, buildMerkleProofVisualization, demoHash, hashParent, parseMerkleLeaves, validateMerkleProofInput, verifyMerkleProof } from "../../../lib/hash/merkleProofVisualizer"

describe("Merkle proof visualizer utilities", () => {
  it("parses non-empty leaves", () => { expect(parseMerkleLeaves("a\n\n b \n c")).toEqual(["a", "b", "c"]) })
  it("validates Merkle proof input", () => {
    expect(validateMerkleProofInput(DEFAULT_MERKLE_PROOF_INPUT).selectedLeafIndex).toBe(1)
    expect(() => validateMerkleProofInput({ leavesText: "only-one", selectedLeafIndex: 0 })).toThrow(/at least two leaves/i)
    expect(() => validateMerkleProofInput({ leavesText: "a\nb", selectedLeafIndex: 2 })).toThrow(/existing leaf/i)
  })
  it("uses deterministic demo hashing", () => {
    expect(demoHash("abc")).toBe(demoHash("abc"))
    expect(demoHash("abc")).not.toBe(demoHash("abd"))
    expect(hashParent("left", "right")).toBe(hashParent("left", "right"))
  })
  it("builds a Merkle tree with proof and verifies it", () => {
    const result = buildMerkleProofVisualization(DEFAULT_MERKLE_PROOF_INPUT)
    expect(result.leaves).toHaveLength(4)
    expect(result.levels).toHaveLength(3)
    expect(result.proof).toHaveLength(2)
    expect(result.verified).toBe(true)
    expect(result.verificationSteps.at(-1)?.resultingHash).toBe(result.root)
  })
  it("duplicates odd nodes when building upper levels", () => {
    const result = buildMerkleProofVisualization({ leavesText: "a\nb\nc", selectedLeafIndex: 2 })
    expect(result.levels[1].some((node) => node.duplicated)).toBe(true)
    expect(result.verified).toBe(true)
  })
  it("keeps root stable for unchanged leaves and changes when leaf changes", () => {
    const first = buildMerkleProofVisualization(DEFAULT_MERKLE_PROOF_INPUT)
    const second = buildMerkleProofVisualization(DEFAULT_MERKLE_PROOF_INPUT)
    const changed = buildMerkleProofVisualization({ ...DEFAULT_MERKLE_PROOF_INPUT, leavesText: DEFAULT_MERKLE_PROOF_INPUT.leavesText.replace("Bob pays Carol 2", "Bob pays Carol 9") })
    expect(first.root).toBe(second.root)
    expect(first.root).not.toBe(changed.root)
  })
  it("verifies a generated proof manually", () => {
    const result = buildMerkleProofVisualization(DEFAULT_MERKLE_PROOF_INPUT)
    const steps = verifyMerkleProof(result.selectedLeaf.hash, result.proof, result.root)
    expect(steps.at(-1)?.resultingHash).toBe(result.root)
  })
  it("builds manual testing checklist", () => {
    const checklist = buildMerkleProofManualChecklist()
    expect(checklist[0]).toMatch(/open the merkle proof/i)
    expect(checklist).toContain("Select different leaves and confirm the proof path updates.")
  })
})
