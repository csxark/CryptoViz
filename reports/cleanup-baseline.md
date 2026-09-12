# CryptoViz — Codebase Elimination & Cleanup Baseline (Phase 0)

**Date**: 2026-09-12  
**Phase**: Phase 0 — Freeze Current State  

---

## 1. Environment & Version Metadata

| Component | Identifier / Version | Details |
| :--- | :--- | :--- |
| **Git Commit** | `30c47439b5bef918728b1ce7146b3aa89df0323c` | `Independent Cryptographic Verification` |
| **Working Tree** | `clean` | Branch `main`, up to date with `origin/main` |
| **Package Manager** | `npm 11.12.1` | Lockfile: `package-lock.json` (lockfileVersion 3) |
| **Node Version** | `v24.15.0` | Runtime environment |
| **TypeScript** | `5.9.3` (`typescript@^5`) | Target: `ES2022`, moduleResolution: `bundler` |
| **Framework** | Next.js `16.3.2` (`next@^16.2.9`) | React `19.2.4`, React-DOM `19.2.4` |
| **Test Framework** | Vitest `4.1.8` (`vitest@^4.1.8`) | Environment: `jsdom` (29.1.1) |

---

## 2. Configuration State

* **Build Configuration**:
  * `next.config.ts`: `output: 'export'`, `trailingSlash: true`, unoptimized images, turbopack root set.
  * `postcss.config.mjs`: `@tailwindcss/postcss`.
  * Tailwind CSS: v4.
* **Lint Configuration**:
  * `eslint.config.mjs`: Flat config with `eslint-config-next/core-web-vitals` & `eslint-config-next/typescript`.
  * Ignores: `.next/**`, `out/**`, `build/**`, `dist/**`, `next-env.d.ts`, `scratch/**`, `scripts/**`, `fetch_all_issues.ts`.
* **TypeScript Configuration**:
  * `tsconfig.json`: Paths mapped (`@/*`, `@cipher/*`), excludes `node_modules`, `out`, `.next`, `tests`, `**/*.test.ts(x)`, `lib/random/testRandom.ts`, `lib/testVectors/index.ts`, `playwright.config.ts`.
* **Test Configurations**:
  * `vitest.config.ts`: Base Vitest config targeting `tests/**/*.test.ts(x)` with jsdom and setup `./tests/setup.ts`.
  * `vitest.stable.config.ts`: Forked isolation setup using `./tests/setup/stableTestEnvironment.ts`.
  * `playwright.config.ts`: E2E / visual test config.
* **CI Configuration**:
  * `.github/workflows/ci.yml`: Mandatory PR / push gates (`static`, `tests`, `build`, `merge-gate`).
  * `.github/workflows/test-suite.yml`: Workflow dispatch for manual stable tests.
  * Additional workflows: `e2e.yml`, `reliability-baseline.yml`, `audit-issues.yml`, `create-issues.yml`, etc.
* **Deployment Configuration**:
  * `vercel.json`: Strict security headers (CSP, HSTS, X-Frame-Options, COOP, CORP, Permissions-Policy).

---

## 3. Baseline Verification Results

### A. Core Quality Gates

| Command | Exit Code | Output Summary |
| :--- | :---: | :--- |
| `npm run typecheck` | **0** | `tsc --noEmit` passed with 0 errors. |
| `npm run lint` | **0** | `eslint` passed with 0 errors and 0 warnings. |
| `npm run build` | **0** | Prebuild `generate:sw` succeeded. Next.js compiled in 12.6s, TypeScript in 17.4s, 372 static HTML pages successfully prerendered. |

### B. CI Quality Gate & Budget Verification

| Command | Exit Code | Output Summary |
| :--- | :---: | :--- |
| `npm run validate:ci` | **0** | All 5 CI quality gates, typechecks, and build steps validated. |
| `npm run check:budgets` | **0** | All 3 worker entry points (<25 KB), 243 cipher modules (<40 KB), and 9 visualizer modules (<50 KB) within lazy-loading budgets. |
| `npm run check:bundle-budget` | **0** | Production bundle budget passed: 311,858 bytes gzipped across 412 chunks (limit: 819,200 bytes). |
| `npm run conformance` | **0** | Cryptographic conformance runner loaded AES and SHA256 test vectors successfully. |

### C. Test Suite Subsets

| Suite / Command | Exit Code | Files Passed / Total | Tests Passed / Total | Notes |
| :--- | :---: | :---: | :---: | :--- |
| `npm run test:security` | **0** | 13 / 13 passed | 190 / 190 passed | All prototype pollution, CSP, sanitize, permalink, npm standardization tests pass. |
| `npm run test:a11y` | **0** | 15 / 15 passed | 51 / 51 passed | All axe-core accessibility tests pass. |
| `npm test` (`vitest run`) | **1** | 491 passed / 28 failed (519 total) | 8,303 passed / 52 failed (8,355 total) | 3 failed snapshots. Failures isolate to 28 files (e.g. invalid import path in `workloadLimits.test.ts`, obsolete mock demo in `reedSolomonDemo.test.ts`, UI component tab switches). |

---

## 4. Observations for Elimination Gate

1. **Working Tree & Cleanliness**: Git tree is completely clean on commit `30c47439`.
2. **Package Manager Invariant**: System is fully locked to npm lockfileVersion 3; `.pnpmrc` is lingering from prior setups.
3. **Redundant & Temporary Artifacts**: Found `scratch/patch.js`, `reports/full_prompt.txt`, and multiple historical verification logs.
4. **Invalid / Mock Tests**: `tests/reedSolomonDemo.test.ts` uses local mock XOR parity with random mutation and fails. `tests/unit/security/workloadLimits.test.ts` references non-existent relative paths `../../../lib/security/workloadLimits`.
5. **Dual Directory Structures**: Root directory contains `components/`, `constants/`, `lib/` while `src/` also contains `components/`, `constants/`, `contracts/`, `lib/`, `schemas/`, `workers/`. Investigation needed to confirm active paths vs dead duplicate trees.
