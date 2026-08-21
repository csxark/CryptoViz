"use client";

import type { DataProvenance } from "@/lib/provenance";
import type { ResolvedDataProvenance } from "@/lib/provenance/types";

interface DataProvenanceBadgeProps {
  provenance: DataProvenance | ResolvedDataProvenance;
  compact?: boolean;
}

const PROVENANCE_CONFIG: Record<
  DataProvenance,
  {
    label: string;
    description: string;
    className: string;
  }
> = {
  simulated: {
    label: "Simulated",
    description:
      "Educational or conceptual simulation. This does not represent live operational state.",
    className:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300",
  },
  static: {
    label: "Static Example",
    description:
      "Fixed example data. It is not fetched from a live external source.",
    className:
      "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
  },
  derived: {
    label: "Locally Derived",
    description:
      "Calculated locally from the current inputs or application state.",
    className:
      "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-300",
  },
  live: {
    label: "Live Data",
    description:
      "Data obtained from an external source at runtime.",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300",
  },
  verified: {
    label: "Verified",
    description:
      "Data has been verified using the evidence identified by the feature.",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
};

function getProvenanceValue(
  provenance: DataProvenance | ResolvedDataProvenance,
): DataProvenance {
  return typeof provenance === "string"
    ? provenance
    : provenance.provenance;
}

function getSource(
  provenance: DataProvenance | ResolvedDataProvenance,
): string | undefined {
  return typeof provenance === "string" ? undefined : provenance.source;
}

export default function DataProvenanceBadge({
  provenance,
  compact = false,
}: DataProvenanceBadgeProps) {
  const value = getProvenanceValue(provenance);
  const source = getSource(provenance);
  const config = PROVENANCE_CONFIG[value];

  return (
    <span
      title={`${config.description}${source ? ` Source: ${source}` : ""}`}
      className={[
        "inline-flex max-w-full items-center gap-1.5 rounded-full border font-medium",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        config.className,
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
      />

      <span className="truncate">{config.label}</span>
    </span>
  );
}