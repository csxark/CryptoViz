import type { BenchmarkSession, ScalingBenchmarkResult } from "@/types/benchmark";

/**
 * Revives specified date fields on an object from string, number, or Date values into Date instances.
 *
 * @param obj Target object containing date fields
 * @param dateKeys Array of keys expected to contain date values
 * @returns Shallow copy of the object with revived Date fields
 */
export function reviveDateFields<T extends Record<string, any>>(
  obj: T,
  dateKeys: (keyof T)[],
): T {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  const revived = { ...obj };

  for (const key of dateKeys) {
    const val = revived[key];
    if (val !== undefined && val !== null) {
      revived[key] = new Date(val) as T[keyof T];
    }
  }

  return revived;
}

/**
 * Revives a BenchmarkSession object and its nested results array, converting
 * string or numeric timestamps into Date instances.
 *
 * @param session Raw benchmark session object
 * @returns BenchmarkSession with revived Date timestamps
 */
export function reviveBenchmarkSession(session: BenchmarkSession): BenchmarkSession {
  if (!session) return session;

  const revived = reviveDateFields(session, ["timestamp"]);

  return {
    ...revived,
    results: Array.isArray(revived.results)
      ? revived.results.map((result) => reviveDateFields(result, ["timestamp"]))
      : [],
  };
}

/**
 * Revives a ScalingBenchmarkResult object, converting its string or numeric timestamp into a Date instance.
 *
 * @param result Raw scaling benchmark result object
 * @returns ScalingBenchmarkResult with revived Date timestamp
 */
export function reviveScalingResult(result: ScalingBenchmarkResult): ScalingBenchmarkResult {
  if (!result) return result;
  return reviveDateFields(result, ["timestamp"]);
}
