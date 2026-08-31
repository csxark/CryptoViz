/**
 * Trace Serialization and Deserialization Utilities
 * Enables trace persistence without recomputation
 */

import type { AlgorithmTrace } from './traceSchema';
import { validateTrace } from './validators';

/**
 * Serialize trace to JSON string
 */
export function serializeTrace(trace: AlgorithmTrace): string {
  try {
    return JSON.stringify(trace, null, 2);
  } catch (error) {
    throw new Error(`Failed to serialize trace: ${error}`);
  }
}

/**
 * Deserialize trace from JSON string
 */
export function deserializeTrace(json: string): AlgorithmTrace {
  try {
    const parsed = JSON.parse(json);

    if (!validateTrace(parsed)) {
      throw new Error('Deserialized data does not match trace schema');
    }

    return parsed;
  } catch (error) {
    throw new Error(`Failed to deserialize trace: ${error}`);
  }
}

/**
 * Export trace as downloadable JSON file
 */
export function exportTraceAsFile(trace: AlgorithmTrace, filename?: string): void {
  const json = serializeTrace(trace);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `trace-${trace.traceId}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import trace from JSON file
 */
export async function importTraceFromFile(file: File): Promise<AlgorithmTrace> {
  try {
    const text = await file.text();
    return deserializeTrace(text);
  } catch (error) {
    throw new Error(`Failed to import trace file: ${error}`);
  }
}

/**
 * Compress trace for storage (removes non-essential metadata)
 */
export function compressTrace(trace: AlgorithmTrace): string {
  const compressed = {
    ...trace,
    customMetadata: undefined, // Remove optional metadata for size
  };

  return JSON.stringify(compressed);
}

/**
 * Calculate trace size in bytes
 */
export function getTraceSize(trace: AlgorithmTrace): number {
  return new Blob([serializeTrace(trace)]).size;
}