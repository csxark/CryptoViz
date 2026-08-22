# Pull Request

## Description

Please provide a brief summary of your changes.

---

## Related Issue

Closes #

---

## Scope

**This PR touches exactly one of the following.** If it touches more than
one, split it into separate PRs — multi-scope PRs are the pattern that
introduces inconsistent architecture and will not be reviewed as-is.

- [ ] Cipher module (`lib/cipher/**`)
- [ ] Visualizer/route (`app/**`, `components/**`)
- [ ] Worker/protocol (`lib/workers/**`, `hooks/use*Worker.ts`)
- [ ] Documentation only (`docs/**`, `*.md`, MDX content)
- [ ] Security fix (CSP, key handling, sanitization, dependency CVE)
- [ ] Test-only (`tests/**`)
- [ ] Config/chore (build, deps, CI)

---

## Changes Made

- 
- 
- 

---

## Testing

- [ ] Unit tests added/updated for every code path changed (not just the happy path).
- [ ] `pnpm test` passes locally.
- [ ] `pnpm typecheck` passes locally.
- [ ] `pnpm lint` passes locally.
- [ ] Coverage on any touched `lib/cipher/**` file stays at or above 80%.
- [ ] E2E/a11y tests added if a route or interactive component changed.

A PR that adds functionality without a corresponding test in the same PR will not be merged. "Will add tests later" is not accepted.

## Simulation vs. Live Data

- [ ] I have read the Simulation vs. Live Data Policy: docs/simulation-vs-live-data-policy.md
- [ ] This change does not describe, label, or imply that a simulated operation (reduced parameters, mocked peer, synthetic randomness) is a verified or real cryptographic operation, in code, UI copy, or this PR description.

---

## Screenshots

If applicable, attach screenshots or screen recordings.

---

## Checklist

- [ ] My code follows the project guidelines.
- [ ] I have tested my changes.
- [ ] I have updated the documentation if required.
- [ ] My changes address the related issue.
- [ ] This PR focuses on a single issue.

---

## Applicable Checklist

Complete the checklist matching the scope above, then paste the completed
checklist (or a link to it) here:

- New cipher -> Cipher Checklist: docs/contribution-checklists.md#1-new-cipher-checklist
- New visualizer -> Visualizer Checklist: docs/contribution-checklists.md#2-new-visualizer-checklist
- Security-sensitive -> Security Checklist: docs/contribution-checklists.md#3-security-sensitive-feature-checklist

---

## Architecture Review Checklist
Before adding another domain suite or feature suite, please identify and document the following to prevent code duplication:

- [ ] **Existing shared abstractions**: 
- [ ] **Existing persistence mechanism**: 
- [ ] **Existing operation state machine**: 
- [ ] **Existing authorization boundary**: 
- [ ] **Existing error model**: 
- [ ] **Existing telemetry/audit mechanism**:
## Additional Notes

Add any additional information for reviewers here.
