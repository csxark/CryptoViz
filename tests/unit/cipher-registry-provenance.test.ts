import { describe, expect, it } from "vitest";
import { CIPHER_PROVENANCE } from "../../../lib/cipher/registryMetadata";

describe("cipher registry provenance", () => {
  it("provides explicit provenance for known high-risk and standardized entries", () => {
    expect(CIPHER_PROVENANCE["n-hash"]).toMatchObject({
      securityStatus: "broken",
      yearDesigned: 1989,
    });
    expect(CIPHER_PROVENANCE.aes).toMatchObject({
      standardBody: "FIPS 197",
      yearDesigned: 1998,
    });
    expect(CIPHER_PROVENANCE["chacha20-poly1305"]).toMatchObject({
      standardBody: "RFC 8439",
    });
    expect(CIPHER_PROVENANCE["ml-kem"]).toMatchObject({
      standardBody: "FIPS 203",
    });
  });

  it("keeps every explicit provenance entry structurally valid", () => {
    for (const [id, metadata] of Object.entries(CIPHER_PROVENANCE)) {
      expect(id).not.toBe("");
      expect(Number.isInteger(metadata.yearDesigned)).toBe(true);
      expect(metadata.standardBody.length).toBeGreaterThan(0);
      expect(metadata.standardUrl).toMatch(/^https?:\/\//);
      expect([
        "recommended", "secure", "legacy", "deprecated", "broken", "experimental",
      ]).toContain(metadata.securityStatus);
    }
  });
});
