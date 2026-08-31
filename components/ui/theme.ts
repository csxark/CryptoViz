/**
 * Design system color constants and theme mappings for benchmark metric indicators,
 * status badges, and performance trend visualizations.
 */

/** Tailwind CSS utility classes for speedup metric background and text colors */
export const METRIC_BG_SPEEDUP =
  "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400";

/** Tailwind CSS utility classes for slowdown metric background and text colors */
export const METRIC_BG_SLOWDOWN =
  "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400";

/** Tailwind CSS utility classes for neutral metric background and text colors */
export const METRIC_BG_NEUTRAL =
  "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400";

/** Tailwind CSS utility classes for speedup trend text colors */
export const METRIC_TEXT_SPEEDUP = "text-emerald-600 dark:text-emerald-400";

/** Tailwind CSS utility classes for slowdown trend text colors */
export const METRIC_TEXT_SLOWDOWN = "text-rose-600 dark:text-rose-400";

/** Tailwind CSS utility classes for neutral trend text colors */
export const METRIC_TEXT_NEUTRAL = "text-zinc-500 dark:text-zinc-400";

/**
 * Structured design system theme map for benchmark metric indicator styling.
 * Maps performance state categories (speedup, slowdown, neutral) to their
 * corresponding background container and text color utility classes.
 */
export const METRIC_THEME_MAP = {
  bg: {
    speedup: METRIC_BG_SPEEDUP,
    slowdown: METRIC_BG_SLOWDOWN,
    neutral: METRIC_BG_NEUTRAL,
  },
  text: {
    speedup: METRIC_TEXT_SPEEDUP,
    slowdown: METRIC_TEXT_SLOWDOWN,
    neutral: METRIC_TEXT_NEUTRAL,
  },
} as const;

/** Type definition representing metric performance state categories */
export type MetricPerformanceState = keyof typeof METRIC_THEME_MAP.bg;

/**
 * Returns Tailwind background and text color utility classes for benchmark metric indicators
 * based on performance boolean flags using the central METRIC_THEME_MAP.
 *
 * @param isSpeedup Whether performance ratio represents a speedup
 * @param isSlowdown Whether performance ratio represents a slowdown
 * @returns Tailwind CSS utility class string for container styling
 */
export function getMetricBg(isSpeedup: boolean, isSlowdown: boolean): string {
  if (isSpeedup) return METRIC_THEME_MAP.bg.speedup;
  if (isSlowdown) return METRIC_THEME_MAP.bg.slowdown;
  return METRIC_THEME_MAP.bg.neutral;
}

/**
 * Returns Tailwind text color utility classes for metric trend percentage text
 * based on performance boolean flags using the central METRIC_THEME_MAP.
 *
 * @param isSpeedup Whether performance ratio represents a speedup
 * @param isSlowdown Whether performance ratio represents a slowdown
 * @returns Tailwind CSS utility class string for text color styling
 */
export function getMetricTextColor(isSpeedup: boolean, isSlowdown: boolean): string {
  if (isSpeedup) return METRIC_THEME_MAP.text.speedup;
  if (isSlowdown) return METRIC_THEME_MAP.text.slowdown;
  return METRIC_THEME_MAP.text.neutral;
}
