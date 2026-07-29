# Worker Architecture Documentation

CryptoViz uses Web Workers to keep expensive cryptographic operations away from
the main UI thread. This helps the visualizer remain responsive while ciphers,
hashes, key exchanges, and instrumented step traces are computed.

## Why workers matter

Cryptographic visualizations can be computationally expensive. Some algorithms
produce many intermediate steps, while others perform repeated rounds, key
schedules, password hashing, or large-number math.

A worker boundary helps keep:

- input controls responsive
- playback controls usable
- route navigation smooth
- error handling structured
- timing metadata observable

## Message lifecycle

1. The UI collects cipher id, input, key, direction, and options.
2. The worker hook creates a request id.
3. The hook posts a typed message to the worker.
4. The worker dispatches to the matching cipher module.
5. The cipher module validates input and computes output.
6. The worker returns a success or error response.
7. The UI renders output, steps, metadata, or a friendly error.

## Request shape

```ts
worker.postMessage({
  type: 'encrypt',
  requestId,
  payload: {
    cipherId,
    input,
    key,
    options,
  },
})
```

## Response shape

```ts
worker.postMessage({
  requestId,
  success: true,
  payload: { result },
  timings: { durationMs },
})
```

## Error handling

Cipher modules should validate input early and return useful errors. The worker
should convert thrown errors into structured failure responses so the UI can show
friendly messages instead of crashing.

## Testing guidance

Worker-backed features should include focused tests for at least one of:

- algorithm output
- invalid input behavior
- instrumented step shape
- worker dispatch wiring
- timeout behavior
- abort behavior
- cache behavior
