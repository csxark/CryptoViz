# Issue #1477 migration package

This package introduces `lib/utils/encoding.ts` as the single source of truth for
hex/base64/binary conversion and adds an audit script.

Repository-wide migration rule:

```ts
import { parseHex, toHex } from '../../utils/encoding';
```

(or the appropriate relative path).

Replace local `parseHex`/`toHex` implementations while retaining cipher-specific
key/block length checks at the call site.

Run:

```bash
npm run typecheck
npm test -- --run tests/unit/encodingHelpers.test.ts
node scripts/audit-encoding-helpers.mjs --fail
```

The audit intentionally fails until all local helper definitions are migrated.
