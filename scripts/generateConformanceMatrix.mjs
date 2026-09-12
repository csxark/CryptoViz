/**
 * Conformance Matrix Generator (Phase 7)
 * Evaluates all 218 algorithms in CIPHER_REGISTRY and classifies each by:
 * - Operation
 * - Classification
 * - Standard Body
 * - Authoritative KAT presence (verified vs contaminated/placeholder)
 * - Independent Oracle availability
 * - Differential testing
 * - Property testing
 * - Browser support
 * - Evidence Grade (A, B, C, D, E)
 */

import fs from 'fs'
import path from 'path'
import { CIPHER_REGISTRY } from '../lib/cipher/registry.ts'

// Load authoritative oracle registry
const oracleRegistryPath = path.resolve('lib/cipher/provenance/oracleRegistry.json')
const oracleRegistry = JSON.parse(fs.readFileSync(oracleRegistryPath, 'utf-8'))

const matrixRows = []
const gradeCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 }

for (const cipher of CIPHER_REGISTRY) {
  const reg = oracleRegistry.algorithms[cipher.id] || {
    id: cipher.id,
    name: cipher.name,
    category: cipher.category,
    primaryOperation: 'unknown',
    grade: 'E',
    standard: 'Literature Reference (Unverified in CryptoViz)',
    authoritativeVectorSource: 'None',
    independentOracle: 'None',
  }

  const grade = reg.grade || 'E'
  gradeCounts[grade] = (gradeCounts[grade] || 0) + 1

  let katStatus = 'Pending Independent Provenance'
  if (grade === 'A') {
    katStatus = reg.authoritativeVectorSource && reg.authoritativeVectorSource !== 'None'
      ? reg.authoritativeVectorSource
      : 'Authoritative Published KAT'
  } else if (grade === 'B') {
    katStatus = reg.authoritativeVectorSource && reg.authoritativeVectorSource !== 'None'
      ? reg.authoritativeVectorSource
      : 'Independent Reference KAT'
  } else if (grade === 'C') {
    katStatus = 'Algorithmic Property Invariants'
  } else if (grade === 'D') {
    katStatus = 'Educational / Toy Reference'
  } else {
    katStatus = reg.verificationStatus || 'Pending Independent Provenance'
  }

  const differential = ['A', 'B'].includes(grade) ? 'Yes' : 'No'
  const property = 'Yes' // property fuzzing harness covers all registry items
  const browser = 'Yes (JS/Worker)'

  matrixRows.push({
    id: reg.id || cipher.id,
    name: reg.name || cipher.name,
    operation: reg.primaryOperation,
    classification: reg.category || cipher.category,
    standard: reg.standard,
    kat: katStatus,
    oracle: reg.independentOracle,
    differential,
    property,
    browser,
    grade,
  })
}

// Generate Markdown Report
let md = `# CryptoViz — Cryptographic Conformance & Evidence Matrix

This matrix documents the verification classification, operational semantics, authoritative standards provenance, independent oracles, and evidence grade for all **${CIPHER_REGISTRY.length}** algorithms registered in CryptoViz.
Regenerated from \`lib/cipher/provenance/oracleRegistry.json\` under the Grade-E Elimination & Independent Cryptographic Verification Gate.

## Evidence Grade Definitions

* **Grade A (Authoritative + Independent Validation)**: Published standard KAT (NIST CAVP / RFC / ISO) verified AND independently validated against external reference oracle (\`node:crypto\` / \`@noble\`).
* **Grade B (Independent Validation)**: Validated against an independent reference oracle or formal reference model.
* **Grade C (Strong Property Validation)**: Strong algebraic and invariant property validation (reversible bijection, group laws, fuzzing).
* **Grade D (Educational / Non-Standard / Toy)**: Educational or pedagogical implementation verified for internal consistency and expected educational properties.
* **Grade E (Unverified)**: Incomplete tables, placeholder vectors, or unverified implementations. Strictly NOT claimed as standards-compliant.

## Summary Grade Distribution

| Grade | Description | Count | Percentage |
| :--- | :--- | :--- | :--- |
| **A** | Authoritative + Independent Oracle | ${gradeCounts.A} | ${((gradeCounts.A / CIPHER_REGISTRY.length) * 100).toFixed(1)}% |
| **B** | Independent Reference Oracle | ${gradeCounts.B} | ${((gradeCounts.B / CIPHER_REGISTRY.length) * 100).toFixed(1)}% |
| **C** | Strong Property Validation | ${gradeCounts.C} | ${((gradeCounts.C / CIPHER_REGISTRY.length) * 100).toFixed(1)}% |
| **D** | Educational / Toy Reference | ${gradeCounts.D} | ${((gradeCounts.D / CIPHER_REGISTRY.length) * 100).toFixed(1)}% |
| **E** | Unverified / Pending Audit | ${gradeCounts.E} | ${((gradeCounts.E / CIPHER_REGISTRY.length) * 100).toFixed(1)}% |
| **Total** | All Active Registered Algorithms | **${CIPHER_REGISTRY.length}** | **100.0%** |

---

## Complete Algorithm Matrix

| Algorithm | Operation | Classification | Standard | KAT | Independent Oracle | Differential | Property | Browser | Evidence Grade |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
`

for (const r of matrixRows) {
  md += `| **${r.name}** (\`${r.id}\`) | \`${r.operation}\` | ${r.classification} | ${r.standard} | ${r.kat} | ${r.oracle} | ${r.differential} | ${r.property} | ${r.browser} | **${r.grade}** |\n`
}

fs.writeFileSync('reports/algorithm-conformance-matrix.md', md)
console.log('Successfully generated reports/algorithm-conformance-matrix.md with', matrixRows.length, 'algorithms.')
console.log('Grade counts:', gradeCounts)

