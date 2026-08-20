/**
 * Centralized Formatter Utility Module
 * Provides consistent formatting for byte sizes, durations, percentages, throughput, and numeric values across the application.
 */

const numberFormatter = new Intl.NumberFormat("en-US");

/**
 * Format bytes to a human-readable string (e.g. 0 B, 1.00 KB, 1.50 MB, 1.00 GB).
 */
export function formatBytes(
  bytes?: number,
  fallback: string = "Unavailable"
): string {
  if (bytes === undefined || !Number.isFinite(bytes)) {
    return fallback;
  }
  if (bytes === 0) return "0 B";

  const isNegative = bytes < 0;
  const absBytes = Math.abs(bytes);
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(absBytes) / Math.log(1024)),
    units.length - 1
  );

  const val = absBytes / Math.pow(1024, index);
  const formatted = val.toFixed(index === 0 ? 0 : 2);
  const sign = isNegative ? "-" : "";

  return `${sign}${formatted} ${units[index]}`;
}

/**
 * Format duration in seconds into human-readable ranges.
 */
export function formatDuration(seconds: number): string {
  if (seconds === Infinity) return "Practically infinite";
  if (isNaN(seconds)) return "Unknown";
  if (seconds <= 0) return "Instantaneous";

  if (seconds < 0.001) {
    return "Less than 1 millisecond";
  }
  if (seconds < 1) {
    const ms = Math.round(seconds * 1000);
    return `${ms} millisecond${ms > 1 ? "s" : ""}`;
  }

  const MINUTE = 60;
  const HOUR = 3600;
  const DAY = 86400;
  const YEAR = 31557600; // 365.25 days
  const AGE_OF_UNIVERSE_YEARS = 13.8e9;
  const AGE_OF_UNIVERSE = AGE_OF_UNIVERSE_YEARS * YEAR;

  if (seconds < MINUTE) {
    const val = seconds.toFixed(1).replace(/\.0$/, "");
    return `${val} second${val === "1" ? "" : "s"}`;
  }
  if (seconds < HOUR) {
    const val = (seconds / MINUTE).toFixed(1).replace(/\.0$/, "");
    return `${val} minute${val === "1" ? "" : "s"}`;
  }
  if (seconds < DAY) {
    const val = (seconds / HOUR).toFixed(1).replace(/\.0$/, "");
    return `${val} hour${val === "1" ? "" : "s"}`;
  }
  if (seconds < YEAR) {
    const val = (seconds / DAY).toFixed(1).replace(/\.0$/, "");
    return `${val} day${val === "1" ? "" : "s"}`;
  }

  const years = seconds / YEAR;
  if (years < AGE_OF_UNIVERSE_YEARS) {
    if (years < 100) {
      const val = years.toFixed(1).replace(/\.0$/, "");
      return `${val} year${val === "1" ? "" : "s"}`;
    }
    if (years < 1000) {
      return `${Math.round(years)} years`;
    }
    if (years < 1e6) {
      return `${(years / 1000).toFixed(1).replace(/\.0$/, "")} thousand years`;
    }
    if (years < 1e9) {
      return `${(years / 1e6).toFixed(1).replace(/\.0$/, "")} million years`;
    }
    return `${(years / 1e9).toFixed(1).replace(/\.0$/, "")} billion years`;
  }

  const timesUniverse = seconds / AGE_OF_UNIVERSE;
  if (timesUniverse < 1e3) {
    return `${timesUniverse.toFixed(1).replace(/\.0$/, "")} × Age of the Universe`;
  }
  if (timesUniverse < 1e6) {
    return `${(timesUniverse / 1e3).toFixed(1).replace(/\.0$/, "")} thousand × Age of the Universe`;
  }
  if (timesUniverse < 1e9) {
    return `${(timesUniverse / 1e6).toFixed(1).replace(/\.0$/, "")} million × Age of the Universe`;
  }
  if (timesUniverse < 1e12) {
    return `${(timesUniverse / 1e9).toFixed(1).replace(/\.0$/, "")} billion × Age of the Universe`;
  }
  if (timesUniverse < 1e15) {
    return `${(timesUniverse / 1e12).toFixed(1).replace(/\.0$/, "")} trillion × Age of the Universe`;
  }

  return `${years.toExponential(2)} years`;
}

/**
 * Format milliseconds into a formatted string (e.g. "1.2540 ms").
 */
export function formatMilliseconds(
  value?: number,
  decimals: number = 4,
  fallback: string = "N/A"
): string {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return `${value.toFixed(decimals)} ms`;
}

/**
 * Format percentage value (e.g. "12.5%", "+12.5%", "-5.0%").
 */
export function formatPercentage(
  value?: number,
  decimals: number = 1,
  includeSign: boolean = false,
  fallback: string = "N/A"
): string {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  const sign = includeSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format number with thousand separators (e.g. "1,234,567").
 */
export function formatNumber(
  value?: number,
  fallback: string = "N/A"
): string {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return numberFormatter.format(value);
}

/**
 * Format operations per second (e.g., "1,234.5 ops/s" or "1,234").
 */
export function formatOperationsPerSecond(
  value?: number,
  fallback: string = "N/A"
): string {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return numberFormatter.format(value);
}

/**
 * Format throughput rate (e.g. "1.50 MB/s").
 */
export function formatThroughput(
  bytesPerSecond?: number,
  fallback: string = "N/A"
): string {
  if (bytesPerSecond === undefined || !Number.isFinite(bytesPerSecond)) {
    return fallback;
  }
  return `${formatBytes(bytesPerSecond, fallback)}/s`;
}
