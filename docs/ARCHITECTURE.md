# Architecture Overview

CryptoViz is a fully static Next.js export. There is no server runtime in
production. This document is the entry point into the engineering contracts
that govern the codebase; it links out to the detailed specs rather than
duplicating them.

## Layers

```
app/[route]              UI route, thin — composes components, no crypto math
components/[feature]     Presentation + interaction, calls hooks for compute
hooks/use*Worker.ts      Bridges UI to Web Worker, manages request lifecycle
lib/workers/*.worker.ts  Worker entry point, decodes request, dispatches
lib/cipher/**            Pure cipher/algorithm modules, no DOM access
content/**                MDX docs, resource registry, static data
```

Data flows one direction: `app` → `components` → `hooks` → `worker` →
`lib/cipher`, and results flow back the same path. Cipher modules never
import from `components/` or `hooks/`; `components/` never imports directly
from `lib/workers/**` internals — always through the hook.

## Source-of-truth documents

| Concern | Document |
| :--- | :--- |
| Architectural non-negotiables, cipher module contract, worker message protocol, design system, dependency policy, commit conventions | [GUIDELINES.md](../GUIDELINES.md) |
| Per-contribution-type checklists (new cipher, new visualizer, security-sensitive) | [contribution-checklists.md](./contribution-checklists.md) |
| Worker lifecycle rationale | [worker-architecture.md](./worker-architecture.md) |
| Cipher dispatch registry internals | [cipher-worker-registry.md](./cipher-worker-registry.md) |
| Testing requirements (unit, E2E, a11y) | [GUIDELINES.md § Testing Requirements](../GUIDELINES.md) and [testing-strategy.md](./testing-strategy.md) |
| Security hardening checklist, CSP | [GUIDELINES.md § Security Hardening Checklist](../GUIDELINES.md), [content-security-policy.md](./content-security-policy.md) |
| Simulation vs. real/verified operations | [simulation-vs-live-data-policy.md](./simulation-vs-live-data-policy.md) |
| Performance budgets | [GUIDELINES.md § Performance Budgets](../GUIDELINES.md) |
| Error codes across all layers | [error-taxonomy.md](./error-taxonomy.md) |
| Visualizer component patterns | [visualizer-development-guide.md](./visualizer-development-guide.md) |
| Standardized product vocabulary | [product-vocabulary-architecture.md](./product-vocabulary-architecture.md) |
| PR requirements | [.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md) |

## Why duplication across feature suites keeps happening

Large PRs that add a full feature (route + components + lib + worker
wiring + tests) in one shot are the primary source of drift, because
reviewers cannot fully cross-check a large diff against every contract
above. Two structural mitigations:

1. **Scope field in the PR template** forces one PR = one concern (cipher,
   visualizer, worker, docs, security, tests, or config), not a bundle.
2. **Checklists are copy-pasteable and checkable**, not prose a reviewer
   has to re-derive per PR.

This does not eliminate the need for reviewer judgment. It gives the
reviewer a fixed list to check the diff against instead of reconstructing
the architecture rules from memory each time.

## Adding a new top-level feature area

If a contribution doesn't fit cipher/visualizer/worker (e.g. a new section
like `pqc-lattices` or `signal-lab`), it still decomposes into the same
layers: a `lib/**` module with pure logic, a route under `app/`, and
components. Route it through the same checklists — treat the `lib/**`
portion as the cipher checklist's non-cipher analog (pure functions,
tested, no DOM access, worker-isolated if computationally heavy) and the
UI portion as the visualizer checklist.
