/**
 * Canonical provenance metadata for CIPHER_REGISTRY.
 *
 * Formal standards are preferred when an algorithm has one. Historical and
 * educational algorithms use a stable primary-reference citation instead.
 */
export interface CipherProvenance {
  yearDesigned: number;
  standardBody: string;
  standardUrl: string;
  securityStatus?: "recommended" | "secure" | "legacy" | "deprecated" | "broken" | "experimental";
}

const WIKI = "https://en.wikipedia.org/wiki/";

export const CIPHER_PROVENANCE: Record<string, CipherProvenance> = {
  caesar: { yearDesigned: -58, standardBody: "Historical specification", standardUrl: WIKI + "Caesar_cipher", securityStatus: "broken" },
  rot13: { yearDesigned: 1980, standardBody: "Historical specification", standardUrl: WIKI + "ROT13", securityStatus: "broken" },
  vigenere: { yearDesigned: 1553, standardBody: "Historical specification", standardUrl: WIKI + "Vigen%C3%A8re_cipher", securityStatus: "broken" },
  atbash: { yearDesigned: -200, standardBody: "Historical specification", standardUrl: WIKI + "Atbash", securityStatus: "broken" },
  playfair: { yearDesigned: 1854, standardBody: "Historical specification", standardUrl: WIKI + "Playfair_cipher", securityStatus: "broken" },
  railfence: { yearDesigned: 1870, standardBody: "Historical specification", standardUrl: WIKI + "Rail_fence_cipher", securityStatus: "broken" },
  des: { yearDesigned: 1975, standardBody: "FIPS PUB 46-3", standardUrl: "https://csrc.nist.gov/pubs/fips/46-3/final", securityStatus: "broken" },
  "3des": { yearDesigned: 1998, standardBody: "NIST SP 800-67", standardUrl: "https://csrc.nist.gov/pubs/sp/800/67/r2/final", securityStatus: "deprecated" },
  aes: { yearDesigned: 1998, standardBody: "FIPS 197", standardUrl: "https://csrc.nist.gov/pubs/fips/197/final", securityStatus: "recommended" },
  camellia: { yearDesigned: 2000, standardBody: "RFC 3713", standardUrl: "https://www.rfc-editor.org/rfc/rfc3713", securityStatus: "secure" },
  "chacha20-poly1305": { yearDesigned: 2014, standardBody: "RFC 8439", standardUrl: "https://www.rfc-editor.org/rfc/rfc8439", securityStatus: "recommended" },
  "aes-ccm": { yearDesigned: 2002, standardBody: "NIST SP 800-38C", standardUrl: "https://csrc.nist.gov/pubs/sp/800/38/c/upd1/final", securityStatus: "secure" },
  sm4: { yearDesigned: 2006, standardBody: "RFC 8998 / GB/T 32907", standardUrl: "https://www.rfc-editor.org/rfc/rfc8998", securityStatus: "secure" },
  lea: { yearDesigned: 2013, standardBody: "RFC 9998", standardUrl: "https://www.rfc-editor.org/rfc/rfc9998", securityStatus: "secure" },
  rc2: { yearDesigned: 1987, standardBody: "RFC 2268", standardUrl: "https://www.rfc-editor.org/rfc/rfc2268", securityStatus: "broken" },
  gost: { yearDesigned: 1989, standardBody: "GOST 28147-89 / RFC 5830", standardUrl: "https://www.rfc-editor.org/rfc/rfc5830", securityStatus: "secure" },
  enigma: { yearDesigned: 1920, standardBody: "Historical machine specification", standardUrl: WIKI + "Enigma_machine", securityStatus: "broken" },
  ascon: { yearDesigned: 2014, standardBody: "NIST SP 800-232", standardUrl: "https://csrc.nist.gov/pubs/sp/800/232/final", securityStatus: "secure" },
  xmss: { yearDesigned: 2011, standardBody: "RFC 8391", standardUrl: "https://www.rfc-editor.org/rfc/rfc8391", securityStatus: "recommended" },
  lms: { yearDesigned: 2006, standardBody: "RFC 8554", standardUrl: "https://www.rfc-editor.org/rfc/rfc8554", securityStatus: "recommended" },
  ed448: { yearDesigned: 2014, standardBody: "RFC 8032", standardUrl: "https://www.rfc-editor.org/rfc/rfc8032", securityStatus: "secure" },
  "ml-dsa": { yearDesigned: 2017, standardBody: "FIPS 204", standardUrl: "https://csrc.nist.gov/pubs/fips/204/final", securityStatus: "secure" },
  "ml-kem": { yearDesigned: 2017, standardBody: "FIPS 203", standardUrl: "https://csrc.nist.gov/pubs/fips/203/final", securityStatus: "secure" },
  "sphincs-plus": { yearDesigned: 2015, standardBody: "FIPS 205", standardUrl: "https://csrc.nist.gov/pubs/fips/205/final", securityStatus: "recommended" },
  ntru: { yearDesigned: 1996, standardBody: "IEEE P1363.1 / primary specification", standardUrl: WIKI + "NTRU", securityStatus: "secure" },
  sidh: { yearDesigned: 2011, standardBody: "Primary literature / attack record", standardUrl: WIKI + "Supersingular_isogeny_key_exchange", securityStatus: "broken" },
  rainbow: { yearDesigned: 2005, standardBody: "Primary literature / attack record", standardUrl: WIKI + "Rainbow_(cryptography)", securityStatus: "broken" },
  mceliece: { yearDesigned: 1978, standardBody: "Primary literature", standardUrl: WIKI + "McEliece_cryptosystem", securityStatus: "secure" },
  ntruprime: { yearDesigned: 2016, standardBody: "NIST PQC submission", standardUrl: WIKI + "NTRU_Prime", securityStatus: "experimental" },
  bike: { yearDesigned: 2017, standardBody: "NIST PQC submission", standardUrl: WIKI + "BIKE_(cryptography)", securityStatus: "experimental" },
  hqc: { yearDesigned: 2017, standardBody: "NIST PQC submission", standardUrl: WIKI + "Hamming_quasi-cyclic_(HQC)", securityStatus: "recommended" },
  saber: { yearDesigned: 2018, standardBody: "NIST PQC submission", standardUrl: WIKI + "SABER_(cryptography)", securityStatus: "experimental" },
  csidh: { yearDesigned: 2018, standardBody: "ASIACRYPT 2018 specification", standardUrl: WIKI + "CSIDH", securityStatus: "experimental" },
  "n-hash": { yearDesigned: 1989, standardBody: "Primary literature / broken construction", standardUrl: WIKI + "N-Hash", securityStatus: "broken" },
};

export function enrichCipherRegistry<T extends {
  id: string;
  description: string;
  securityStatus: CipherProvenance["securityStatus"];
}>(registry: T[]): Array<T & Omit<CipherProvenance, "securityStatus">> {
  return registry.map((cipher) => {
    const explicit = CIPHER_PROVENANCE[cipher.id];
    const yearMatch = cipher.description.match(/(1[5-9]\d{2}|20\d{2})/);
    const rfcMatch = cipher.description.match(/RFC\s+(\d{3,5})/i);
    const fallback = {
      yearDesigned: yearMatch ? Number(yearMatch[1]) : 1900,
      standardBody: rfcMatch ? `RFC ${rfcMatch[1]}` : "Primary algorithm specification",
      standardUrl: rfcMatch
        ? `https://www.rfc-editor.org/rfc/rfc${rfcMatch[1]}`
        : WIKI + "Cryptography",
    };

    return {
      ...cipher,
      yearDesigned: explicit?.yearDesigned ?? fallback.yearDesigned,
      standardBody: explicit?.standardBody ?? fallback.standardBody,
      standardUrl: explicit?.standardUrl ?? fallback.standardUrl,
      securityStatus: explicit?.securityStatus ?? cipher.securityStatus,
    };
  });
}
