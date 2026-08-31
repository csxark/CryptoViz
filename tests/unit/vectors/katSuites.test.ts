import { describe, it, expect } from "vitest";
import { allKnownAnswerVectors } from "../../../lib/testVectors";
import { runKnownAnswerVectorSuite, formatMismatchDiagnostic } from "../../../lib/testVectors/runner";
import { cipherDispatchTable } from "../../../lib/testVectors/dispatch";
const REQUIRED_EDGE_CASES_PER_CATEGORY: Record<string, string[]> = {
  aes: ["NONE", "EMPTY_INPUT", "MULTI_BLOCK", "BOUNDARY_KEY"],
  sha: ["NONE", "EMPTY_INPUT"],
  hmac: ["NONE", "BOUNDARY_KEY"],
  des: ["NONE", "BOUNDARY_KEY"],
  ecc: ["NONE"],
  pqc: ["NONE"],
};

describe("NIST & RFC Known-Answer Test Vector Suite Execution", () => {
  // 1. Functional Execution: Actually run vectors against crypto logic
  describe("Cryptographic Execution Verification", () => {
    const results = runKnownAnswerVectorSuite(allKnownAnswerVectors, cipherDispatchTable);

    results.forEach((result) => {
      const { vector } = result;
      // Algorithms without a wired-up executor (e.g. ECC/PQC today) are
      // reported as skipped, not silently passed - see docs/testVectors.md.
      const test = result.mismatchType === "UNSUPPORTED_ALGORITHM" ? it.skip : it;

      test(`executes ${vector.algorithm} [${vector.id}] correctly against expected ciphertext`, () => {
        expect(result.passed, formatMismatchDiagnostic(result)).toBe(true);
      });
    });
  });
  // 2. Strict Coverage Manifest: Enforce coverage PER ALGORITHM CATEGORY
  describe("Per-Category Edge Case Coverage Manifest", () => {
    Object.entries(REQUIRED_EDGE_CASES_PER_CATEGORY).forEach(([category, requiredCases]) => {
      it(`satisfies required edge-case coverage for category '${category}'`, () => {
        const categoryVectors = allKnownAnswerVectors.filter((v) =>
          v.id.toLowerCase().startsWith(category)
        );

        expect(categoryVectors.length).toBeGreaterThan(0);

        const presentEdgeCases = new Set(
          categoryVectors.map((v) => v.edgeCase || "NONE")
        );

        requiredCases.forEach((expectedCase) => {
          expect(
            presentEdgeCases.has(expectedCase as any),
            `Category '${category}' is missing required edge case: ${expectedCase}`
          ).toBe(true);
        });
      });
    });
  });
});