import type { DataProvenance, DataProvenanceMetadata, ResolvedDataProvenance } from "./types";
import { isDataProvenance } from "./types";

const DEFAULT_PROVENANCE: DataProvenance = "derived";

// Resolves provenance metadata into a safe presentation contract.
export function resolveProvenance(
  metadata?: DataProvenanceMetadata | null,
): ResolvedDataProvenance {
  if (!metadata || !isDataProvenance(metadata.provenance)) {
    return {
      provenance: DEFAULT_PROVENANCE,
    };
  }

//    Verified data must contain actual verification evidence.
  if (metadata.provenance === "verified") {
    if (!hasVerificationEvidence(metadata)) {
      return {
        provenance: "derived",
        source: metadata.source,
        sourceUrl: metadata.sourceUrl,
      };
    }
  }

//   Live data must identify its external source.
   
  if (metadata.provenance === "live") {
    if (!hasLiveSource(metadata)) {
      return {
        provenance: "derived",
        source: metadata.source,
        sourceUrl: metadata.sourceUrl,
      };
    }
  }

  return {
    provenance: metadata.provenance,
    source: metadata.source,
    sourceUrl: metadata.sourceUrl,
    verification: metadata.verification,
  };
}

// Checks whether metadata identifies a usable live-data source.
export function hasLiveSource(
  metadata?: DataProvenanceMetadata | null,
): boolean {
  if (!metadata || metadata.provenance !== "live") {
    return false;
  }

  if (
    typeof metadata.source !== "string" ||
    metadata.source.trim().length === 0
  ) {
    return false;
  }

  if (metadata.sourceUrl === undefined) {
    return true;
  }

  if (
    typeof metadata.sourceUrl !== "string" ||
    metadata.sourceUrl.trim().length === 0
  ) {
    return false;
  }

  try {
    const url = new URL(metadata.sourceUrl);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Checks whether metadata contains actual verification evidence.*/
export function hasVerificationEvidence(
  metadata?: DataProvenanceMetadata | null,
): boolean {
  if (!metadata || metadata.provenance !== "verified") {
    return false;
  }

  const verification = metadata.verification;

  if (!verification) {
    return false;
  }

  const hasMethod =
    typeof verification.method === "string" &&
    verification.method.trim().length > 0;

  if (!hasMethod) {
    return false;
  }
  
  const hasEvidenceId =
    typeof verification.evidenceId === "string" &&
    verification.evidenceId.trim().length > 0;

  const hasEvidenceUrl =
    typeof verification.evidenceUrl === "string" &&
    verification.evidenceUrl.trim().length > 0;

  return hasEvidenceId || hasEvidenceUrl;
}

/**
 * Returns whether a provenance declaration is safe to expose as verified.
 */
export function isVerifiedProvenance(
  metadata?: DataProvenanceMetadata | null,
): boolean {
  return hasVerificationEvidence(metadata);
}

/**
 * Returns whether a provenance declaration is safe to expose as live.
 */
export function isLiveProvenance(
  metadata?: DataProvenanceMetadata | null,
): boolean {
  return hasLiveSource(metadata);
}