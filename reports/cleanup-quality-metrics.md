# CryptoViz — Codebase Cleanup Quality Metrics (Phase 17)

**Date**: 2026-09-12  
**Phase**: Phase 17 — Before/After Quality Metrics  
**Baseline Commit**: `30c47439b5bef918728b1ce7146b3aa89df0323c`  

---

## 1. File Count Metrics

| Category | Baseline (Phase 0) | Post-Cleanup (Phase 17) | Delta | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Total Non-Ignored Files** | 1,728 | 1,680 | **-48** | Includes 4 new comprehensive audit reports |
| **Production Source & UI** | 973 | 942 | **-31** | Removed 22 dead UI components, 6 dead utils, 1 duplicate module, mock `src/` |
| **Test Files** | 557 | 551 | **-6** | Removed 6 dead/mock test files, consolidated duplicate entropy tests, moved 7 misplaced tests |
| **Configuration Files** | 41 | 40 | **-1** | Removed `.pnpmrc`, cleaned `tsconfig.json` & `eslint.config.mjs` |
| **Scripts** | 11 | 10 | **-1** | Removed completed one-off script `audit-encoding-helpers.mjs` |
| **Documentation & Reports** | 107 | 110 | **+3** | Removed `MIGRATION.md` & `full_prompt.txt`; added structured cleanup reports |
| **Public Assets** | 9 | 9 | **0** | No assets modified |
| **Temporary / Scratch** | 30 | 18 | **-12** | Cleaned `scratch/` directory and ad-hoc patch scripts |

---

## 2. Code Volume & Line Count Metrics

| Metric | Measurement | Notes |
| :--- | :---: | :--- |
| **Lines Deleted** | **5,647** | Extracted from `git diff --stat` across 67 files |
| **Lines Added** | **43** | Necessary fixes (noble hash legacy import, type/import repairs, bounds clipping) |
| **Net Line Reduction** | **-5,604** | Net decrease in codebase volume |
| **Production Code Reduction** | ~3,150 lines | Dead UI components, unreferenced utilities, mock subsystems |
| **Dead Test Reduction** | ~1,680 lines | Obsolete stubs, mock XOR parity, redundant debug harnesses |
| **Dead Config / Docs / Scripts** | ~774 lines | Prompt text dumps, ad-hoc patcher, migration notes, `.pnpmrc` |

---

## 3. Dependency Standardization & Package Hygiene

| Item | Baseline | Post-Cleanup | Verification Status |
| :--- | :--- | :--- | :--- |
| **`pure-rand`** | `dependencies` | **Removed completely** | 0 imports in repo; verified |
| **`@types/dompurify`** | `dependencies` | **Moved to `devDependencies`** | Type-only package; verified |
| **`package-lock.json`** | Inconsistent with changes | **Regenerated and synced** | Validated via `tests/security/npm-standardization.test.ts` (27/27 pass) |
| **`.pnpmrc`** | Present (redundant) | **Removed** | Repository is 100% npm v11 |

---

## 4. Dead Code Elimination Breakdown

### A. Subsystems & Mock Architectures
* **`src/` directory**: 100% eliminated (7 files removed). Removed abandoned prototype duplicate tree containing `ResizableSplitPane.tsx`, `benchmark.ts`, `visualizerRegistry.ts`, `formatters.ts`, `workloadValidation.ts`, and `protocol.ts`.

### B. UI Components Eliminated (22 Files)
* `DifficultyBadge.tsx`, `DocumentationProgressActions.tsx`, `LearningTrackSelector.tsx`, `Prerequisites.tsx`, `ReadingTime.tsx`, `RecommendedNextLinks.tsx` (unreferenced doc fragments)
* `SandboxExport.tsx`, `SandboxMetrics.tsx`, `SandboxToolbar.tsx`, `SandboxTrace.tsx`, `SandboxVisualizer.tsx`, `StageList.tsx`, `useSandboxAnnotations.ts`, `useSandboxState.ts` (abandoned sandbox rework)
* `typewriter.tsx` (unused text layout effect)
* `OfflineOnboarding.tsx` (abandoned offline onboarding modal)
* `SonificationToggle.tsx` (unreferenced audio experiment)
* `ProtocolStateMachine.tsx` (unused formal verification diagram)
* `KZGVisualizer.tsx` (unreferenced standalone KZG component)
* `AttackProgressMonitor.tsx` (unused attack progress UI)
* `ModeDiagramModal.tsx` (redundant modal dialog)
* `AchievementGallery.tsx` (unreferenced gamification view)

### C. Dead Utilities & Workers (6 Files)
* `lib/attacks/meetInTheMiddleWorker.ts` (abandoned mock worker with fake 99999999 match)
* `lib/attacks/attackOrchestrator.ts` (unreferenced attack orchestrator)
* `lib/storage/quotaManager.ts` (unreferenced storage quota stub)
* `lib/hash/hash-step-annotator.ts` (unreferenced step annotator)
* `lib/random/simulationRandom.ts` (unreferenced pseudo-random generator)
* `lib/testVectors/index.ts` (broken orphan export referencing non-existent `./types`)

### D. Duplicate Implementations Eliminated (1 File)
* `lib/stego/lsbEnginestego.ts` (100% identical byte-for-byte duplicate of `lsbEngine.ts`)

### E. Test Suite Relocations & Consolidations (7 Suites)
* Moved out of `lib/` and `types/` into `tests/unit/`:
  * `tests/unit/mpc/garbledCircuits.test.ts` (3 passing tests)
  * `tests/unit/crypto/jwtDecoder.test.ts` (33 passing tests)
  * `tests/unit/crypto/totp.test.ts` (37 passing tests)
  * `tests/unit/crypto/uuid.test.ts` (48 passing tests)
  * `tests/unit/security/passwordAnalyzer.test.ts` (23 passing tests)
  * `tests/unit/security/passwordGenerator.test.ts` (26 passing tests)
  * `tests/unit/utils/entropy.test.ts` (6 passing tests, consolidating `lib/entropy.test.ts` & `lib/utils/entropy.test.ts`)

---

## 5. Cryptographic Algorithm Registry & Conformance Invariants

| Invariant | Baseline | Post-Cleanup | Status |
| :--- | :---: | :---: | :--- |
| **Total Registered Algorithms** | 218 | 218 | **100% Preserved** |
| **Reachable via `/visualizer/[cipher]`** | 218 | 218 | **100% Active** |
| **Worker Dispatchable** | 218 | 218 | **100% Preserved** |
| **Operation Taxonomy Coverage** | 218 | 218 | **100% Mapped** |
| **Grade E & Unverified Retention** | Preserved | Preserved | **Zero deletions** |
| **Cryptographic Constants / Math** | Intact | Intact | **Zero changes** |

---

## 6. Verification Quality Comparison

| Verification Gate | Baseline Result | Post-Cleanup Result | Evaluation |
| :--- | :---: | :---: | :--- |
| `npm run typecheck` | Exit 0 (0 errors) | Exit 0 (0 errors) | **PASSED** |
| `npm run lint` | Exit 0 (0 warnings) | Exit 0 (0 warnings) | **PASSED** |
| `npm run build` | Exit 0 (372 pages) | Exit 0 (372 pages) | **PASSED** |
| `npm run check:budgets` | Exit 0 (255/255 within budget) | Exit 0 (255/255 within budget) | **PASSED** |
| `npm run check:bundle-budget` | Exit 0 (311 KB gzipped) | Exit 0 (326 KB gzipped, budget 819 KB) | **PASSED** |
| `npm run validate:ci` | Exit 0 (5/5 gates valid) | Exit 0 (5/5 gates valid) | **PASSED** |
| `npm run conformance` | Exit 0 (Loaded vectors) | Exit 0 (Loaded vectors) | **PASSED** |
| `npm run test:security` | Exit 0 (190/190 passing, 13 files) | Exit 0 (190/190 passing, 13 files) | **PASSED** |
| `npm run test:a11y` | Exit 0 (51/51 passing, 15 files) | Exit 0 (51/51 passing, 15 files) | **PASSED** |
| `npm test` (Total Tests Passing) | 8,303 tests passing | **8,465 tests passing (+162)** | **IMPROVED** |
| `npm test` (Test Suites Passing) | 491 suites passing | **493 suites passing (+2)** | **IMPROVED** |
