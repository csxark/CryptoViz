# Error Taxonomy

Canonical list of error categories across CryptoViz. New error codes must
fit one of these categories and be added to the matching enum, not invented
ad hoc in a component.

## 1. Cipher Errors (`CipherErrorCode`)

Defined in `GUIDELINES.md` § Cipher Module Contract, source of truth is
`lib/cipher/types.ts` / `baseCipher.ts`.

| Code | Meaning | Layer raised |
| :--- | :--- | :--- |
| `INPUT_REQUIRED` | Input is empty/undefined/null. | Cipher module |
| `INPUT_TOO_LONG` | Input exceeds 4096 bytes. | Cipher module |
| `INVALID_KEY` | Key fails format/length check for the algorithm. | Cipher module |
| `INVALID_PADDING` | Padding scheme check fails on decrypt. | Cipher module |
| `ALGORITHM_UNSUPPORTED` | Requested cipher ID has no registered handler. | Dispatch registry |
| `WORKER_TIMEOUT` | Worker did not respond within the 10s budget. | `useCipherWorker` hook |

All six must extend `CipherError` and carry a human-readable `message`
matching the format in the GUIDELINES.md Input Validation Rules table.

## 2. Worker Transport Errors

Errors in message passing itself, distinct from cipher logic errors.

| Code | Meaning |
| :--- | :--- |
| `WORKER_INIT_FAILED` | Worker script failed to instantiate. |
| `WORKER_TERMINATED` | Worker was killed mid-request (timeout or manual). |
| `MESSAGE_MALFORMED` | Response did not match `WorkerResponse` shape. |

These are caught at the `useCipherWorker` / `useAttackWorker` hook layer and
surfaced to the UI as a generic "computation failed" state; they are never
shown to the end user as cipher-specific errors.

## 3. Validation / Input Errors (non-cipher)

Used outside `lib/cipher/**` — forms, MDX frontmatter, resource registry
entries, challenge inputs.

| Code | Meaning |
| :--- | :--- |
| `VALIDATION_FAILED` | Zod schema rejected input (MDX frontmatter, forms). |
| `UNSUPPORTED_ENCODING` | Requested `hex`/`base64`/`utf8` conversion failed. |
| `SIZE_LIMIT_EXCEEDED` | Non-cipher payload (e.g. file upload, stego image) too large. |

## 4. Security Boundary Errors

Raised when an operation is blocked for security reasons rather than
correctness reasons. These must never be silently swallowed.

| Code | Meaning |
| :--- | :--- |
| `CSP_VIOLATION` | Content Security Policy blocked a resource (logged, not user-facing). |
| `UNSAFE_OPERATION_BLOCKED` | Code path attempted a banned primitive (`eval`, raw HTML render) and was blocked at review/lint time, not runtime — tracked here for audit trail purposes only. |
| `RANDOMNESS_SOURCE_INVALID` | A cryptographic code path attempted to use a non-CSPRNG source. |

## 5. Application / Rendering Errors

Caught by `app/error.tsx` and route-level error boundaries.

| Code | Meaning |
| :--- | :--- |
| `ROUTE_RENDER_FAILED` | Unhandled exception in a route component. |
| `MDX_PARSE_FAILED` | MDX content failed to compile/parse at build time. |

## Conventions

- Every error code is `UPPER_SNAKE_CASE`, unique across all five
  categories combined — no reuse of a code name across categories.
- Cipher-layer errors (category 1) are the only category shown to the end
  user with algorithm-specific detail. Categories 2–5 surface as generic,
  non-leaky messages in the UI, with the specific code available in
  dev-console logs only.
- Adding a new code requires updating this table in the same PR.
