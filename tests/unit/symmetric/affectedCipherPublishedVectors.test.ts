import { describe, expect, it } from "vitest";
import {
  PUBLISHED_CIPHER_VECTORS,
  buildCipherVectorAuditSummary,
  runPublishedVectorSuite,
  type CipherAdapter,
} from "../../../lib/cipher/symmetric/publishedCipherVectors";
import { encrypt as encryptNoekeon } from "../../../lib/cipher/symmetric/noekeon";
import { encrypt as encryptPresent } from "../../../lib/cipher/symmetric/present";
import { encrypt as encryptRc6 } from "../../../lib/cipher/symmetric/rc6";
import { encrypt as encryptSeed } from "../../../lib/cipher/symmetric/seed";
import { encrypt as encryptSimon } from "../../../lib/cipher/symmetric/simon";
import { encrypt as encryptSpeck } from "../../../lib/cipher/symmetric/speck";
import { encrypt as encryptTwofish } from "../../../lib/cipher/symmetric/twofish";

const adapters: CipherAdapter[] = [
  {
    cipher: "NOEKEON",
    encryptBlock: (pt, key) => encryptNoekeon(pt, key).output,
  },
  {
    cipher: "PRESENT",
    encryptBlock: (pt, key) => encryptPresent(pt, key).output,
  },
  {
    cipher: "RC6",
    encryptBlock: (pt, key) => encryptRc6(pt, key).output,
  },
  {
    cipher: "SEED",
    encryptBlock: (pt, key) => encryptSeed(pt, key).output,
  },
  {
    cipher: "SIMON",
    encryptBlock: (pt, key) => encryptSimon(pt, key).output,
  },
  {
    cipher: "SPECK",
    encryptBlock: (pt, key) => encryptSpeck(pt, key).output,
  },
  {
    cipher: "TWOFISH",
    encryptBlock: (pt, key) => encryptTwofish(pt, key).output,
  },
];

describe("affected cipher implementations against published vectors", () => {
  it("passes every known-answer vector after adapters are wired to real cipher exports", () => {
    const results = runPublishedVectorSuite(adapters);
    const summary = buildCipherVectorAuditSummary(results);

    expect(results).toHaveLength(PUBLISHED_CIPHER_VECTORS.length);
    expect(summary.failed).toBe(0);
  });
});
