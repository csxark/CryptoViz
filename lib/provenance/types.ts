//  Data provenance contracts.

export const DATA_PROVENANCE_VALUES = [
  "simulated",
  "static",
  "derived",
  "live",
  "verified",
] as const;

export type DataProvenance = (typeof DATA_PROVENANCE_VALUES)[number];

/* Evidence required when data is presented as verified.*/
export interface DataProvenanceVerification {
  method: string;
  evidenceId?: string;
  evidenceUrl?: string;
  verifiedAt?: string;
  verifier?: string;
}
export interface DataProvenanceMetadata {
  provenance: DataProvenance;
  source?: string;
  sourceUrl?: string;
  verification?: DataProvenanceVerification;
}
export interface ResolvedDataProvenance {
  provenance: DataProvenance;
  source?: string;
  sourceUrl?: string;
  verification?: DataProvenanceVerification;
}

export function isDataProvenance(
  value: unknown,
): value is DataProvenance {
  return (
    typeof value === "string" &&
    (DATA_PROVENANCE_VALUES as readonly string[]).includes(value)
  );
}