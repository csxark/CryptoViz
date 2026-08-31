import { useMemo } from "react";
import type { SessionDelta } from "@/lib/utils/comparison";

export interface ChartDataItem {
  name: string;
  category: string;
  sessionA_ops: number;
  sessionB_ops: number;
  sessionA_time: number;
  sessionB_time: number;
  sessionA_worker: number;
  sessionB_worker: number;
  sessionA_memory: number;
  sessionB_memory: number;
  speedup: number;
}

/**
 * Custom hook to prepare and memoize Recharts data points from SessionDelta comparison results.
 */
export function useChartData(delta: SessionDelta | null | undefined): ChartDataItem[] {
  return useMemo(() => {
    if (!delta || !delta.algorithmDiffs) return [];
    return delta.algorithmDiffs.map((diff) => ({
      name: diff.cipherName,
      category: diff.category,
      sessionA_ops: diff.opsPerSecA || 0,
      sessionB_ops: diff.opsPerSecB || 0,
      sessionA_time: diff.avgTimeA || 0,
      sessionB_time: diff.avgTimeB || 0,
      sessionA_worker: diff.resultA?.workerExecutionTime || 0,
      sessionB_worker: diff.resultB?.workerExecutionTime || 0,
      sessionA_memory: (diff.resultA?.memoryUsage || 0) / 1024,
      sessionB_memory: (diff.resultB?.memoryUsage || 0) / 1024,
      speedup: diff.speedupFactor || 1,
    }));
  }, [delta]);
}
