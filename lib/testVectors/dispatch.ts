import * as aes from "@/lib/cipher/symmetric/aes";
import * as des from "@/lib/cipher/symmetric/des";
import * as sha256 from "@/lib/cipher/hash/sha256";
import * as sha3 from "@/lib/cipher/hash/sha3";
import * as hmac from "@/lib/cipher/hash/hmac";
import { toByteArray, fromByteArray } from "@/lib/utils/encoding";
import type { KnownAnswerTestVector } from "@/tests/vectors/types";
import type { CipherDispatchTable } from "./runner";

function hexToBytes(hex: string): Uint8Array {
  return toByteArray(hex, "hex");
}

function bytesToHex(bytes: Uint8Array): string {
  return fromByteArray(bytes, "hex");
}

// --- AES -------------------------------------------------------------

function runAesEcb(vector: KnownAnswerTestVector): string {
  const roundKeys = aes.expandKey(hexToBytes(vector.keyHex));
  const plaintext = hexToBytes(vector.plaintextHex);
  if (plaintext.length === 0) return "";

  const out = new Uint8Array(plaintext.length);
  for (let offset = 0; offset < plaintext.length; offset += 16) {
    const block = aes.processBlock(plaintext.slice(offset, offset + 16), roundKeys, false);
    out.set(block, offset);
  }
  return bytesToHex(out);
}

function runAesCbc(vector: KnownAnswerTestVector): string {
  if (!vector.ivHex) {
    throw new Error(`AES-CBC vector "${vector.id}" is missing ivHex`);
  }
  const roundKeys = aes.expandKey(hexToBytes(vector.keyHex));
  const plaintext = hexToBytes(vector.plaintextHex);
  let prev = hexToBytes(vector.ivHex);

  const out = new Uint8Array(plaintext.length);
  for (let offset = 0; offset < plaintext.length; offset += 16) {
    const block = plaintext.slice(offset, offset + 16);
    const xored = block.map((b, i) => b ^ prev[i]);
    const cipherBlock = aes.processBlock(xored, roundKeys, false);
    out.set(cipherBlock, offset);
    prev = cipherBlock;
  }
  return bytesToHex(out);
}

// --- DES / 3DES --------------------------------------------------------

function runDesEcb(vector: KnownAnswerTestVector): string {
  const subkeys = des.generateSubkeys(hexToBytes(vector.keyHex));
  const plaintext = hexToBytes(vector.plaintextHex);
  const out = new Uint8Array(plaintext.length);

  for (let offset = 0; offset < plaintext.length; offset += 8) {
    const block = des.bytesToBlock(plaintext, offset);
    const cipherBlock = des.processBlock(block, subkeys, false);
    des.blockToBytes(cipherBlock, out, offset);
  }
  return bytesToHex(out);
}

function run3desEcb(vector: KnownAnswerTestVector): string {
  const keyBytes = hexToBytes(vector.keyHex);
  const k1 = keyBytes.slice(0, 8);
  const k2 = keyBytes.slice(8, 16);
  const k3 = keyBytes.length >= 24 ? keyBytes.slice(16, 24) : k1;

  const sub1 = des.generateSubkeys(k1);
  const sub2 = des.generateSubkeys(k2);
  const sub3 = des.generateSubkeys(k3);

  const plaintext = hexToBytes(vector.plaintextHex);
  const out = new Uint8Array(plaintext.length);

  for (let offset = 0; offset < plaintext.length; offset += 8) {
    let block = des.bytesToBlock(plaintext, offset);
    block = des.processBlock(block, sub1, false); // E_k1
    block = des.processBlock(block, sub2, true); // D_k2
    block = des.processBlock(block, sub3, false); // E_k3
    des.blockToBytes(block, out, offset);
  }
  return bytesToHex(out);
}

// --- Hashes / HMAC -------------------------------------------------------

function runDigest(impl: {
  encrypt: (input: string, key: string, options: { encoding: "hex" }) => { output: string };
}): (vector: KnownAnswerTestVector) => string {
  return (vector) => impl.encrypt(vector.plaintextHex, "", { encoding: "hex" }).output;
}

function runHmac(vector: KnownAnswerTestVector): string {
  return hmac.encrypt(vector.plaintextHex, vector.keyHex, { encoding: "hex" }).output;
}

/**
 * Maps a KnownAnswerTestVector's `algorithm` field to a function that
 * independently re-derives the ciphertext/digest using CryptoViz's own
 * cipher engine.
 *
 * To add a new algorithm: write an executor here returning a hex string,
 * then register it under the exact `algorithm` string used by your vectors
 * in tests/vectors/<algo>/index.ts. See docs/testVectors.md.
 */
export const cipherDispatchTable: CipherDispatchTable = {
  "AES-128-ECB": runAesEcb,
  "AES-256-ECB": runAesEcb,
  "AES-128-CBC": runAesCbc,
  "DES-ECB": runDesEcb,
  "3DES-ECB": run3desEcb,
  "SHA-256": runDigest(sha256),
  "SHA3-256": runDigest(sha3),
  "HMAC-SHA256": runHmac,
};