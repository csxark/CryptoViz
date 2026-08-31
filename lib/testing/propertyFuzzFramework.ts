import * as fc from 'fast-check';
import fs from 'fs';
import path from 'path';

const REGRESSIONS_FILE = path.resolve(__dirname, '../../tests/fixtures/property-regressions.json');

export interface StoredRegression {
  name: string;
  seed: number;
  path: string | null;
  counterexample: unknown;
  numRuns: number;
  recordedAt: string;
}

function readRegressions(): StoredRegression[] {
  try {
    return JSON.parse(fs.readFileSync(REGRESSIONS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function persistRegression(entry: StoredRegression): void {
  const next = readRegressions().filter(r => r.name !== entry.name);
  next.push(entry);
  fs.mkdirSync(path.dirname(REGRESSIONS_FILE), { recursive: true });
  fs.writeFileSync(REGRESSIONS_FILE, JSON.stringify(next, null, 2) + '\n');
}

/**
 * Runs a fast-check property under a stable `name`. On failure, the
 * minimized counterexample and the fast-check seed that produced it are
 * persisted to tests/fixtures/property-regressions.json, then the failure
 * is re-thrown (with the seed/counterexample in the message) so the vitest
 * run reports it immediately. Recorded entries are replayed deterministically
 * by tests/unit/cipher/propertyRegressions.test.ts and can be promoted to a
 * permanent, hand-written regression test once triaged.
 */
export async function runFuzzProperty<Ts extends unknown[]>(
  name: string,
  property: fc.IRawProperty<Ts>,
  params: fc.Parameters<Ts> = {},
): Promise<void> {
  const report = await fc.check(property, { numRuns: 200, ...params });
  if (report.failed) {
    persistRegression({
      name,
      seed: report.seed,
      path: report.counterexamplePath ?? null,
      counterexample: report.counterexample,
      numRuns: report.numRuns,
      recordedAt: new Date().toISOString(),
    });
    throw new Error(
      `Property "${name}" failed after ${report.numRuns} run(s) (seed=${report.seed}).\n` +
      `Minimized counterexample: ${JSON.stringify(report.counterexample)}\n` +
      `Recorded to tests/fixtures/property-regressions.json for deterministic replay.`,
    );
  }
}

/** Replays a previously-recorded failing seed against the same property. */
export async function replayRegression<Ts extends unknown[]>(
  entry: StoredRegression,
  property: fc.IRawProperty<Ts>,
): Promise<void> {
  const report = await fc.check(property, { seed: entry.seed, path: entry.path ?? undefined, numRuns: 1 });
  if (report.failed) {
    throw new Error(
      `Regression "${entry.name}" is still failing at seed=${entry.seed}.\n` +
      `Counterexample: ${JSON.stringify(report.counterexample)}`,
    );
  }
}

export function loadRegressions(): StoredRegression[] {
  return readRegressions();
}

const TERMINAL_STEPS = new Set(['FINAL', 'TERMINAL', 'DONE']);

/**
 * Validates the state-machine invariants of a step trace: every step has a
 * non-empty identifier, and the trace ends on a recognized terminal state.
 */
export function assertValidTrace(traces: ReadonlyArray<{ step: string }> | undefined): void {
  if (!traces || traces.length === 0) {
    throw new Error('Expected a non-empty execution trace');
  }
  for (const step of traces) {
    if (!step.step || typeof step.step !== 'string') {
      throw new Error(`Invalid state-machine transition: missing step name (${JSON.stringify(step)})`);
    }
  }
  const last = traces[traces.length - 1];
  if (!TERMINAL_STEPS.has(last.step)) {
    throw new Error(`Trace did not reach a valid terminal state — ended on "${last.step}"`);
  }
}

/**
 * Verifies that a trace survives a JSON serialize → parse round trip (as
 * would happen when a trace crosses a Worker boundary or is persisted),
 * preserving step order, names, and any byte-array payloads.
 */
export function assertTraceSerializationRoundTrip(
  traces: ReadonlyArray<{ step: string; data?: Uint8Array }>,
): void {
  const serializable = traces.map(t => ({ step: t.step, data: t.data ? Array.from(t.data) : undefined }));
  const replayed = JSON.parse(JSON.stringify(serializable)) as typeof serializable;

  if (replayed.length !== serializable.length) {
    throw new Error('Trace serialization/replay changed the number of recorded steps');
  }
  for (let i = 0; i < serializable.length; i++) {
    if (replayed[i].step !== serializable[i].step) {
      throw new Error(`Trace serialization/replay diverged at step index ${i}`);
    }
    if (JSON.stringify(replayed[i].data) !== JSON.stringify(serializable[i].data)) {
      throw new Error(`Trace serialization/replay diverged in data at step index ${i}`);
    }
  }
}