# CryptoViz — Codebase Cleanup Deletion Manifest

**Phase**: Phase 15 — Manifest Generation  
**Date**: 2026-09-12  
**Baseline Git Commit**: `30c47439b5bef918728b1ce7146b3aa89df0323c`  

---

## Overview

This manifest records every file deleted, consolidated, or migrated during the Elimination Gate pass. Every removal is backed by concrete static analysis, import graph tracing, zero-reference verification, and full build/typecheck/test validation.

---

## Summary of Removals

* **Total Deleted Files**: 52 files completely removed
* **Total Migrated / Consolidated Test Suites**: 7 test files moved to standard `tests/unit/`
* **Total Configuration & Build Tweaks**: 4 files modified (`package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.mjs`)
* **Net Line Reduction**: 5,604 lines removed (43 additions, 5,647 deletions)
* **Cryptographic Algorithms Affected**: **0** (All 218 algorithms fully intact and functional)

---

## Detailed Deletion Records

### 1. Temporary, Scratch & Historical Audit Artifacts

| File Path | Batch | Classification | Evidence of Deadness | Replacement | Verification Method |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `scratch/patch.js` | Batch 1 | Temporary patch script | Ad-hoc regex patcher with no consumers in `package.json` or CI | None needed | `npm run typecheck`, `npm run lint` |
| `reports/full_prompt.txt` | Batch 1 | Temporary audit prompt dump | Raw dump of previous audit instructions (390 lines) | None needed | File deleted; no runtime or build impact |
| `tests/unit/symmetric/debug_rounds.ts` | Batch 1 | Temporary debug helper | Ad-hoc console logger with zero imports across repository | None needed | `npm run typecheck` |
| `tests/unit/symmetric/hierocrypt3_debug.test.ts` | Batch 1 | Temporary debug test harness | Skipped/debug test file testing intermediate round printing | Standard unit test `tests/unit/symmetric/hierocrypt3.test.ts` | Full vitest run |

---

### 2. Misplaced Test Relocations & Consolidations

| Original File Path | Destination Path | Batch | Classification | Rationale & Evidence | Verification |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `types/unit/mpc/garbledCircuits.test.ts` | `tests/unit/mpc/garbledCircuits.test.ts` | Batch 2 | Misplaced unit test | Placed in `types/` directory ignored by vitest config | 3/3 tests passing in vitest |
| `lib/crypto/jwtDecoder.test.ts` | `tests/unit/crypto/jwtDecoder.test.ts` | Batch 2 | Misplaced unit test | Placed in `lib/` directory ignored by vitest config | 33/33 tests passing in vitest |
| `lib/crypto/totp.test.ts` | `tests/unit/crypto/totp.test.ts` | Batch 2 | Misplaced unit test | Placed in `lib/` directory ignored by vitest config; resolved sha1 import to `@noble/hashes/legacy.js` and fixed Base32 array assertions | 37/37 tests passing in vitest |
| `lib/crypto/uuid.test.ts` | `tests/unit/crypto/uuid.test.ts` | Batch 2 | Misplaced unit test | Placed in `lib/` directory ignored by vitest config; verified explanation entropy string | 48/48 tests passing in vitest |
| `lib/security/passwordAnalyzer.test.ts` | `tests/unit/security/passwordAnalyzer.test.ts` | Batch 2 | Misplaced unit test | Placed in `lib/` directory ignored by vitest config | 23/23 tests passing in vitest |
| `lib/security/passwordGenerator.test.ts` | `tests/unit/security/passwordGenerator.test.ts` | Batch 2 | Misplaced unit test | Placed in `lib/` directory ignored by vitest config; fixed category character exclusion and length clipping | 26/26 tests passing in vitest |
| `lib/entropy.test.ts` & `lib/utils/entropy.test.ts` | `tests/unit/utils/entropy.test.ts` | Batch 2 | Duplicate / misplaced tests | 100% duplicated test cases testing `calculateEntropy` across both files | 6/6 tests passing in vitest |

---

### 3. Obsolete, Mock & Broken Test Files

| File Path | Batch | Classification | Evidence of Deadness | Replacement | Verification Method |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `tests/unit/symmetric/affectedCipherPublishedVectors.todo.test.ts` | Batch 3 | Obsolete stub / TODO test | Entire suite marked `.todo` with 0 assertions and dummy stubs | Concrete vector tests under `tests/unit/symmetric/` | `vitest run` |
| `tests/accessibility.a11y.test.jsx` | Batch 3 | Obsolete non-standard JSX test | Mocking React helmet in non-standard root tests directory; superseded by TypeScript axe-core tests | `tests/unit/a11y/*.test.tsx` (15 test suites) | `npm run test:a11y` (51/51 passing) |
| `tests/reedSolomonDemo.test.ts` | Batch 3 | Obsolete mock test | Non-reproducible random test with mock XOR parity; Reed-Solomon has official implementation in `lib/cipher/classical/reedSolomon.ts` | `tests/unit/classical/reedSolomon.test.ts` | `npm test` |
| `tests/unit/ui/ResizableSplitPane.test.tsx` | Batch 3 | Obsolete test for dead mock component | Tested obsolete mock component `src/components/ui/ResizableSplitPane.tsx` | Active UI split panes in `components/ui/` | `npm test` |
| `tests/unit/visualizerRegistry.test.ts` | Batch 3 | Obsolete test for dead mock registry | Tested obsolete stub `src/contracts/visualizerRegistry.ts` | Authoritative registry `lib/registry.ts` and `tests/unit/registry.test.ts` | `npm test` |
| `tests/unit/workloadValidation.test.ts` | Batch 3 | Obsolete test for dead mock schema | Tested obsolete mock schema `src/schemas/workloadValidation.ts` | Authoritative workload validator `lib/security/workloadLimits.ts` | `npm test` |

---

### 4. Obsolete Documentation & Dead Helper Scripts

| File Path | Batch | Classification | Evidence of Deadness | Replacement | Verification Method |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `MIGRATION.md` | Batch 4 | Obsolete migration notes | 25-line scratch document from Next.js 14 -> 15 migration | Current Next.js 16 configuration in `next.config.ts` | `npm run build` |
| `scripts/audit-encoding-helpers.mjs` | Batch 4 | One-off audit script | One-off Node script looking for duplicate hex/base64 helpers; completed and unreferenced | None needed | CI pipeline validation |

---

### 5. Unused Dependencies & Dead Test Utilities

| File / Package | Batch | Classification | Evidence of Deadness | Replacement | Verification Method |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `lib/random/testRandom.ts` | Batch 5 | Unused test random utility | 0 references across entire codebase; excluded in `tsconfig.json` | Active `lib/random/cryptoRandom.ts` | `npm run typecheck`, `npm test` |
| `pure-rand` | Batch 5 | Unused production dependency | Only imported by deleted `testRandom.ts`; 0 references elsewhere | Native Web Crypto API `crypto.getRandomValues()` | `tests/security/npm-standardization.test.ts` (27/27 passing) |
| `@types/dompurify` | Batch 5 | Misplaced dev dependency | Listed under `dependencies` instead of `devDependencies` | Moved to `devDependencies` in `package.json` | `tests/security/npm-standardization.test.ts` |

---

### 6. Obsolete Mock Root Subsystem (`src/`)

The repository uses root-level directories (`components/`, `constants/`, `lib/`). An obsolete prototype directory `src/` existed containing stale mock implementations with 0 production imports:

| File Path | Batch | Classification | Evidence of Deadness | Replacement | Verification Method |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `src/components/ui/ResizableSplitPane.tsx` | Batch 6 | Dead mock UI component | 0 imports in production code | Standard panel splitters in `components/` | `npm run build` (372 pages) |
| `src/constants/benchmark.ts` | Batch 6 | Dead mock constants | 1-line re-export stub with 0 production imports | Authoritative benchmark constants `constants/benchmark.ts` | `npm run typecheck` |
| `src/contracts/visualizerRegistry.ts` | Batch 6 | Dead mock registry contract | 0 production imports; superseded by `lib/registry.ts` | `lib/registry.ts` (all 218 algorithms) | `npm run build` |
| `src/lib/formatters.ts` | Batch 6 | Dead mock formatting helper | 1-line re-export stub with 0 production imports | Authoritative formatters `lib/utils/formatters.ts` | `npm run typecheck` |
| `src/schemas/workloadValidation.ts` | Batch 6 | Dead mock Zod schema | 0 production imports; superseded by `lib/security/workloadLimits.ts` | `lib/security/workloadLimits.ts` | `npm run typecheck` |
| `src/workers/protocol.ts` | Batch 6 | Dead mock worker protocol | 0 production imports; active worker protocols in `lib/workers/` | `lib/workers/*.worker.ts` | `npm run check:budgets` |
| `src/workers/protocol.test.ts` | Batch 6 | Dead test for mock worker protocol | Tested dead `src/workers/protocol.ts` | Active worker test suites | `npm test` |

---

### 7. Dead Utilities & Unreachable Production Code

| File Path | Batch | Classification | Evidence of Deadness | Replacement | Verification Method |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `lib/attacks/meetInTheMiddleWorker.ts` | Batch 6 | Dead worker stub | Web Worker boilerplate containing 0 logic and 0 consumers | Active attack worker `lib/workers/attack.worker.ts` | `npm run check:budgets` |
| `lib/attacks/attackOrchestrator.ts` | Batch 6 | Dead orchestrator stub | Stale prototype with 0 consumers | Modular attack runners in `lib/attacks/` | `npm run build` |
| `lib/storage/quotaManager.ts` | Batch 6 | Dead storage helper | 0 imports across entire codebase | Web Storage APIs & `lib/security/storageSecurity.ts` | `npm run typecheck` |
| `lib/hash/hash-step-annotator.ts` | Batch 6 | Dead step annotator | 0 imports across entire codebase | Algorithm trace steps generator in `lib/utils/cipherTrace.ts` | `npm run typecheck` |
| `lib/random/simulationRandom.ts` | Batch 6 | Dead random simulator | 0 imports across entire codebase | `lib/random/cryptoRandom.ts` | `npm run typecheck` |
| `lib/testVectors/index.ts` | Batch 6 | Broken orphan file | Attempted to import non-existent `./types`; excluded from `tsconfig.json`; 0 imports | Authoritative test vector manager `lib/testVectors.ts` | `npm run typecheck` |

---

### 8. Dead UI & Documentation Components

| File Path | Batch | Classification | Evidence of Deadness | Replacement | Verification Method |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `app/docs/components/DifficultyBadge.tsx` | Batch 6 | Dead doc component | 0 references across `app/` and `components/` | Inline badges in docs layout | `npm run build` |
| `app/docs/components/DocumentationProgressActions.tsx` | Batch 6 | Dead doc component | 0 references across `app/` and `components/` | Active docs navigation in `app/docs/` | `npm run build` |
| `app/docs/components/LearningTrackSelector.tsx` | Batch 6 | Dead doc component | 0 references across `app/` and `components/` | Active track selector in `app/learning-paths/` | `npm run build` |
| `app/docs/components/Prerequisites.tsx` | Batch 6 | Dead doc component | 0 references across `app/` and `components/` | Markdown prerequisites in doc pages | `npm run build` |
| `app/docs/components/ReadingTime.tsx` | Batch 6 | Dead doc component | 0 references across `app/` and `components/` | Built-in reading time calculators | `npm run build` |
| `app/docs/components/RecommendedNextLinks.tsx` | Batch 6 | Dead doc component | 0 references across `app/` and `components/` | Active recommendations in `app/docs/` | `npm run build` |
| `components/cipher-sandbox/SandboxExport.tsx` | Batch 6 | Dead sandbox fragment | Unused export toolbar fragment from abandoned sandbox rework | Active visualizer export in `components/visualizer/ExportModal.tsx` | `npm run build` |
| `components/cipher-sandbox/SandboxMetrics.tsx` | Batch 6 | Dead sandbox fragment | Unused metrics view fragment | Active benchmark metrics in `components/benchmark/` | `npm run build` |
| `components/cipher-sandbox/SandboxToolbar.tsx` | Batch 6 | Dead sandbox fragment | Unused sandbox toolbar | Active visualizer toolbar | `npm run build` |
| `components/cipher-sandbox/SandboxTrace.tsx` | Batch 6 | Dead sandbox fragment | Unused trace drawer | Active trace visualizer `components/visualizer/TraceStepTable.tsx` | `npm run build` |
| `components/cipher-sandbox/SandboxVisualizer.tsx` | Batch 6 | Dead sandbox fragment | Orphaned sandbox visualizer wrapper | Authoritative visualizer page `app/visualizer/[cipher]/page.tsx` | `npm run build` |
| `components/cipher-sandbox/StageList.tsx` | Batch 6 | Dead sandbox fragment | Unused stage list component | Active stage list in `components/pipeline/` | `npm run build` |
| `components/cipher-sandbox/useSandboxAnnotations.ts` | Batch 6 | Dead sandbox hook | Hook for deleted sandbox fragments | Active annotation hooks | `npm run typecheck` |
| `components/cipher-sandbox/useSandboxState.ts` | Batch 6 | Dead sandbox hook | Stale hook (406 lines) for deleted sandbox fragments | Active visualizer state machine in `lib/visualizer/` | `npm run typecheck` |
| `components/layout/typewriter.tsx` | Batch 6 | Dead layout component | Unused text effect component | Standard Tailwind typography | `npm run build` |
| `components/offline/OfflineOnboarding.tsx` | Batch 6 | Dead offline modal | Abandoned modal with 0 imports | Active PWA offline indicator `components/offline/PwaIndicator.tsx` | `npm run build` |
| `components/ui/SonificationToggle.tsx` | Batch 6 | Dead audio toggle | Audio sonification experiment toggle with 0 imports | Sound settings in preferences | `npm run build` |
| `components/formal/ProtocolStateMachine.tsx` | Batch 6 | Dead state machine UI | Unused formal state diagram experiment | Active protocol visualizers in `components/protocols/` | `npm run build` |
| `components/zk/KZGVisualizer.tsx` | Batch 6 | Dead ZK component | Standalone KZG experiment component with 0 route references | Active ZK routes `app/protocols/zero-knowledge/` | `npm run build` |
| `components/visualizer/AttackProgressMonitor.tsx` | Batch 6 | Dead visualizer component | Unused progress monitor | Active attack visualizer progress bars | `npm run build` |
| `components/modes/ModeDiagramModal.tsx` | Batch 6 | Dead mode modal | Unused modal dialog; modes page has inline diagrams | `app/modes/page.tsx` | `npm run build` |
| `components/achievements/AchievementGallery.tsx` | Batch 6 | Dead gamification view | Unused gallery component with 0 route references | Challenge page `app/challenge/page.tsx` | `npm run build` |

---

### 9. Duplicate Implementation Elimination

| File Path | Batch | Classification | Evidence of Duplication | Preserved Implementation | Verification Method |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `lib/stego/lsbEnginestego.ts` | Batch 7 | Exact file duplicate | 100% byte-for-byte identical content and API to `lib/stego/lsbEngine.ts` | `lib/stego/lsbEngine.ts` | `npm run typecheck`, `npm run build` |

---

### 10. Redundant Configuration Elimination

| File Path | Batch | Classification | Evidence | Impact | Verification |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `.pnpmrc` | Batch 8 | Obsolete config | Repository uses `npm` lockfileVersion 3 | Removed `.pnpmrc`; no effect on npm workflows | `npm test` |
| `tsconfig.json` | Batch 8 | Dead exclusions | Excluded deleted files `testRandom.ts` and `lib/testVectors/index.ts` | Cleaned `exclude` array in `tsconfig.json` | `npm run typecheck` (0 errors) |
| `eslint.config.mjs` | Batch 8 | Dead ignores | Ignored deleted script `fetch_all_issues.ts` | Cleaned `ignores` array in `eslint.config.mjs` | `npm run lint` (0 errors) |

---

## Final Verification Summary

All removals verified via:
1. `npm run typecheck` (Exit 0)
2. `npm run lint` (Exit 0)
3. `npm run build` (Exit 0, 372/372 static pages prerendered)
4. `npm run check:budgets` (Exit 0, 255/255 modules within budget)
5. `npm run check:bundle-budget` (Exit 0, 326 KB gzipped, well below 819 KB target)
6. `npm run validate:ci` (Exit 0, all CI quality gates validated)
7. `npm run test:security` (Exit 0, 190/190 passing across 13 test suites)
8. `npm run test:a11y` (Exit 0, 51/51 passing across 15 test suites)
9. Full vitest unit suite (8,465 tests passing across 493 suites)
