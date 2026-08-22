# Contribution Checklists

Reference checklists for the three highest-risk contribution types. These
supplement [GUIDELINES.md](../GUIDELINES.md), which remains the source of
truth for the underlying contracts (cipher module contract, worker protocol,
performance budgets, testing requirements). This document exists to give
reviewers and contributors a single pass/fail list per contribution type.

---

## 1. New Cipher Checklist

A cipher PR is not mergeable until every item is checked.

- [ ] Module lives at `lib/cipher/[category]/[cipher].ts`.
- [ ] Exports `encrypt`, `decrypt`, and `TEST_VECTORS` per the Cipher Module
      Contract in GUIDELINES.md.
- [ ] Exports `CipherMetadata` with an accurate `securityStatus`
      (`secure` | `legacy` | `deprecated` | `broken`). Status must match the
      Algorithm Compatibility Matrix conventions in
      [algorithm-matrix.md](./algorithm-matrix.md).
- [ ] Implements both the fast path (`instrument !== true`) and the
      instrumented path (`instrument === true`), and stays within the Step
      Count Budgets table in GUIDELINES.md.
- [ ] Registered in `lib/cipher/registry.ts` (or `cipherRegistry.ts`) with a
      unique `id`. Registration is the only place cipher IDs are declared.
- [ ] Dispatch wired through `cipherDispatchRegistry` — no direct edits to
      the switch statements in `lib/workers/cipher.worker.ts`
      (see [cipher-worker-registry.md](./cipher-worker-registry.md)).
- [ ] Input validation raises `CipherError` with the correct
      `CipherErrorCode` for every case in the Input Validation Rules table
      (empty input, oversized input, invalid key).
- [ ] Runs with zero DOM/global access (no `window`, `document`,
      `localStorage`, `fetch`) — cipher code executes inside the worker
      sandbox.
- [ ] Unit tests added at `tests/unit/[category]/[cipher].test.ts`:
      known-answer vectors, empty input, oversized input, invalid key,
      and a fast-check round-trip/fuzz property test.
- [ ] Meets the 80% line coverage gate on `lib/cipher/**`.
- [ ] Fast-path latency under 5ms for 1 KB payloads; instrumented path
      under 100ms. Note the measurement method in the PR description.
- [ ] `mode: 'demo' | 'real'` is set correctly and matches the
      [Simulation vs Live Data Policy](./simulation-vs-live-data-policy.md).
      If the cipher only supports demo-scale parameters (e.g. small RSA
      moduli), the UI must say so.
- [ ] Added to the Algorithm Compatibility Matrix
      (`lib/cipher/matrixData.ts`) if user-facing.
- [ ] No new runtime dependency outside the Allowed Registry in
      GUIDELINES.md.

---

## 2. New Visualizer Checklist

Applies to any new route under `app/[feature]` and its paired components.

- [ ] Follows the component/prop conventions in the
      [Visualizer Development Guide](./visualizer-development-guide.md).
- [ ] Uses `useCipherWorker` or `useAttackWorker` for any non-trivial
      computation — no heavy math on the main thread.
- [ ] Uses design tokens (`bg-card`, `text-foreground`, `cn()` for class
      merging) per the Design System rules in GUIDELINES.md. No hardcoded
      hex colors, no arbitrary Tailwind values without an explaining
      comment.
- [ ] Dark and light theme both verified.
- [ ] `prefers-reduced-motion` respected — animated components fall back
      to instant state changes.
- [ ] Keyboard navigable: all interactive elements reachable via `Tab`,
      grids navigable via arrow keys.
- [ ] ARIA labels present per the Accessibility Requirements in
      GUIDELINES.md (byte grids, step scrubbers, selection states).
- [ ] Zero `critical` or `serious` axe-core violations.
- [ ] Focus moves to the output/result container once a computation
      completes.
- [ ] Added to relevant navigation/index (`app/visualizer`,
      `content/resources.ts`, or learning path, as applicable) — no orphan
      routes.
- [ ] Playwright smoke test covers: page loads, primary action executes,
      no console errors.
- [ ] If the visualizer accepts free-text input, an XSS payload
      (`<script>alert(1)</script>`) is included in the E2E test and
      asserted to render as inert text.
- [ ] Bundle impact checked against the Performance Budgets table
      (`pnpm analyze`); PR description states the delta.

---

## 3. Security-Sensitive Feature Checklist

Applies to any change touching key handling, CSP/security headers,
cryptographic randomness, authentication demos (e.g. WebAuthn, EMV,
password hashing), or worker message boundaries.

- [ ] No key, password, or plaintext input is persisted to
      `localStorage`, `sessionStorage`, cookies, or any network call.
- [ ] Sensitive in-memory values (keys, derived secrets) are cleared on
      component unmount.
- [ ] Randomness comes from `crypto.getRandomValues` or an audited library
      (`@noble/*`) — never `Math.random()` for anything cryptographic,
      including demos.
- [ ] No `eval`, `new Function`, `innerHTML`, or
      `dangerouslySetInnerHTML` introduced.
- [ ] Any change to `vercel.json` security headers is justified in the
      PR description and cross-checked against
      [content-security-policy.md](./content-security-policy.md).
- [ ] Worker messages carry only serializable data; no `SharedArrayBuffer`
      or `postMessage` targets outside `lib/workers/`.
- [ ] Feature is explicitly labeled as a simulation, demo, or educational
      approximation wherever it does not implement the real protocol in
      full (see the Simulation vs Live Data Policy — this is mandatory,
      not optional).
- [ ] New dependency, if any, is checked against `pnpm audit` with zero
      new high/critical advisories.
- [ ] Reviewed by a second contributor before merge (self-merge
      prohibited for this category).
