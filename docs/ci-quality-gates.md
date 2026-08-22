# CI Quality Gates

CryptoViz runs one mandatory merge gate for every pull request targeting `main`.

## Required pipeline

1. Install dependencies with `npm ci`.
2. Run TypeScript type checking.
3. Run ESLint.
4. Run the complete unit test suite.
5. Run security tests.
6. Run accessibility tests.
7. Build the production site.
8. Enforce the JavaScript bundle budget.
9. Publish the aggregate `CI Quality Gates / Merge Gate` result.

The merge gate fails when any required job fails, is cancelled, or is skipped.

## Branch protection

Repository maintainers must require the exact check name `CI Quality Gates / Merge Gate` in the `main` branch protection rules. Requiring the aggregate check rather than individual jobs keeps branch protection stable if the internal CI job layout changes.

The bundle budget uses the limits documented in `GUIDELINES.md`: 120 KiB gzipped is the target and 150 KiB gzipped is the hard-fail threshold. The CI check reports the largest generated JavaScript chunks to make regressions easier to diagnose.
