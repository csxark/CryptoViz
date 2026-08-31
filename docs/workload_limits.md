# Cryptographic Workload Limits

CryptoViz performs cryptographic calculations locally in the browser.

Because browser resources are finite, every expensive cryptographic operation
is subject to a workload policy.

## Why limits exist

Unbounded cryptographic workloads can cause:

- browser freezes
- excessive CPU consumption
- memory exhaustion
- Web Worker starvation
- excessive trace memory
- poor responsiveness

The limits are therefore part of the application's execution contract.

## Workload categories

### Cipher

Normal cipher and hash visualization operations.

Default limits:

| Resource | Limit |
| --- | ---: |
| Input | 256 KB |
| Key | 64 KB |
| Trace steps | 2,000 |
| Iterations | 100,000 |
| Concurrent jobs | 1 |
| Execution duration | 10 seconds |

### Attack

Attack simulations use tighter limits because their cost can grow rapidly.

| Resource | Limit |
| --- | ---: |
| Input | 64 KB |
| Key | 16 KB |
| Trace steps | 1,000 |
| Iterations | 10,000 |
| Concurrent jobs | 1 |
| Execution duration | 5 seconds |
| Benchmark duration | 5 seconds |

### Benchmark

Benchmarks are intentionally time bounded.

| Resource | Limit |
| --- | ---: |
| Input | 64 KB |
| Key | 16 KB |
| Trace steps | 500 |
| Iterations | 10,000 |
| Concurrent jobs | 1 |
| Execution duration | 5 seconds |
| Benchmark duration | 5 seconds |

## Per-operation overrides

An operation may define a tighter limit when its workload characteristics
require it.

Overrides must not be used to silently remove a safety boundary.

Examples include:

- bcrypt
- PBKDF2
- scrypt
- Argon2
- RSA
- Diffie-Hellman

These operations receive explicit limits because their computational cost is
not equivalent to a simple block cipher.

## Enforcement model

Limits are enforced in two places.

### 1. Before worker dispatch

The UI validates the requested workload before sending it to the Web Worker.

This gives users immediate feedback.

### 2. Inside the Web Worker

The worker validates the request again.

The worker is the authoritative execution boundary and must not trust UI
validation.

This prevents direct or malformed worker requests from bypassing the policy.

## Trace limits

Trace generation consumes memory.

A cryptographic result can therefore be rejected even when its final output
is small if its visualization trace exceeds the configured step limit.

This prevents large trace objects from being cloned back to the main thread.

## Duration limits

Every worker operation has a wall-clock budget.

When the budget expires, the worker is terminated by the worker manager and
the request fails with a workload timeout.

This prevents a single operation from indefinitely monopolizing the worker.

## User-facing errors

Rejected workloads use explicit workload error codes.

Examples:

- `WORKLOAD_INPUT_LIMIT`
- `WORKLOAD_KEY_LIMIT`
- `WORKLOAD_TRACE_LIMIT`
- `WORKLOAD_ITERATION_LIMIT`
- `WORKLOAD_CONCURRENCY_LIMIT`
- `WORKLOAD_DURATION_LIMIT`
- `WORKLOAD_BENCHMARK_LIMIT`

The UI explains that the operation was rejected because it exceeded the safe
browser workload budget.