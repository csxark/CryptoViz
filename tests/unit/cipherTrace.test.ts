/* eslint-disable */
// @ts-nocheck
import { describe, expect, it } from "vitest";
import type { CipherResult } from "../../lib/cipher/types";
import {
  TRACE_SCHEMA_VERSION,
  createCipherTrace,
  parseCipherTraceJson,
  traceToCipherResult,
  validateCipherTrace,
} from "../../lib/utils/cipherTrace";

const result: CipherResult = {
  output: "Khoor",
  outputEncoding: "utf8",
  durationMs: 1.25,
  metadata: {
    name: "Caesar Cipher",
    securityStatus: "broken",
  },
  steps: [
    {
      index: 0,
      label: "Shift H",
      inputState: "H",
      outputState: "K",
      note: "Shift the character by three places.",
    },
  ],
};

describe("cipher trace serialization", () => {
  it("creates and validates a versioned trace", () => {
    const trace = createCipherTrace({
      cipherId: "caesar",
      direction: "encrypt",
      input: "Hello",
      key: "3",
      options: { instrument: true, hexInput: false },
      result,
    });

    expect(trace.schemaVersion).toBe(TRACE_SCHEMA_VERSION);
    expect(trace.options).toEqual({ hexInput: false });

    const validated = validateCipherTrace(trace);
    expect(validated.success).toBe(true);
  });

  it("rejects unsupported schema versions", () => {
    const trace = createCipherTrace({
      cipherId: "caesar",
      direction: "encrypt",
      input: "Hello",
      key: "3",
      options: {},
      result,
    });

    const validated = validateCipherTrace({
      ...trace,
      schemaVersion: 99,
    });

    expect(validated).toEqual({
      success: false,
      error: "Unsupported trace schema version. Expected version 1.",
    });
  });

  it("rejects unsupported ciphers", () => {
    const trace = createCipherTrace({
      cipherId: "caesar",
      direction: "encrypt",
      input: "Hello",
      key: "3",
      options: {},
      result,
    });

    const validated = validateCipherTrace({
      ...trace,
      cipherId: "made-up-cipher",
    });

    expect(validated.success).toBe(false);
  });

  it("rejects malformed steps", () => {
    const trace = createCipherTrace({
      cipherId: "caesar",
      direction: "encrypt",
      input: "Hello",
      key: "3",
      options: {},
      result,
    });

    const validated = validateCipherTrace({
      ...trace,
      steps: [{ label: "Missing required fields" }],
    });

    expect(validated.success).toBe(false);
  });

  it("returns a helpful error for invalid JSON", () => {
    expect(parseCipherTraceJson("{not-json")).toEqual({
      success: false,
      error: "The selected file is not valid JSON.",
    });
  });

  it("reconstructs a result without executing a cipher", () => {
    const trace = createCipherTrace({
      cipherId: "caesar",
      direction: "encrypt",
      input: "Hello",
      key: "3",
      options: {},
      result,
    });

    expect(traceToCipherResult(trace)).toEqual(result);
  });
});
