import { describe, expect, it } from "vitest";
import type { CipherResult } from "../../lib/cipher/types";
import { encrypt as caesarEncrypt } from "../../lib/cipher/classical/caesar";
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

  it("redacts the key and secret options by default", () => {
    const trace = createCipherTrace({
      cipherId: "caesar",
      direction: "encrypt",
      input: "Hello",
      key: "3",
      options: { bobSecret: "topsecret", hexInput: false },
      result,
    });

    expect(trace.exportMode).toBe("redacted");
    expect(trace.key).toBe("[redacted]");
    expect(trace.options).toEqual({ hexInput: false });
  });

  it("includes the key and secret options only when exportMode is 'full'", () => {
    const trace = createCipherTrace({
      cipherId: "caesar",
      direction: "encrypt",
      input: "Hello",
      key: "3",
      options: { bobSecret: "topsecret", hexInput: false },
      result,
      exportMode: "full",
    });

    expect(trace.exportMode).toBe("full");
    expect(trace.key).toBe("3");
    expect(trace.options).toEqual({ bobSecret: "topsecret", hexInput: false });
  });

  it("rejects a trace whose content was tampered with after export", () => {
    const trace = createCipherTrace({
      cipherId: "caesar",
      direction: "encrypt",
      input: "Hello",
      key: "3",
      options: {},
      result,
      exportMode: "full",
    });

    const tampered = { ...trace, key: "9" };
    const validated = validateCipherTrace(tampered);

    expect(validated).toEqual({
      success: false,
      error:
        "Trace integrity check failed — the trace may have been tampered with or corrupted.",
    });
  });

  it("produces the same ordered visualization states on repeated replay", () => {
    const trace = createCipherTrace({
      cipherId: "caesar",
      direction: "encrypt",
      input: "Hello",
      key: "3",
      options: {},
      result,
    });

    const json = JSON.stringify(trace);
    const firstReplay = validateCipherTrace(JSON.parse(json));
    const secondReplay = validateCipherTrace(JSON.parse(json));

    expect(firstReplay.success).toBe(true);
    expect(secondReplay.success).toBe(true);
    if (firstReplay.success && secondReplay.success) {
      const firstStates = traceToCipherResult(firstReplay.trace).steps;
      const secondStates = traceToCipherResult(secondReplay.trace).steps;
      expect(firstStates).toEqual(secondStates);
      expect(firstStates).toEqual(result.steps);
    }
  });

  it("assigns identical traceIds for identical inputs across repeated executions", () => {
    const runOnce = () => {
      const cipherResult = caesarEncrypt("Hello", "3", { instrument: true });
      return createCipherTrace({
        cipherId: "caesar",
        direction: "encrypt",
        input: "Hello",
        key: "3",
        options: { instrument: true },
        result: cipherResult,
      });
    };

    const first = runOnce();
    const second = runOnce();

    expect(first.traceId).toBe(second.traceId);
    expect(first.steps).toEqual(second.steps);
    expect(first.output).toBe(second.output);
    // Timestamps are allowed to differ; only the deterministic content matters.
  });

  it("assigns a different traceId when the key changes", () => {
    const build = (key: string) => {
      const cipherResult = caesarEncrypt("Hello", key, { instrument: true });
      return createCipherTrace({
        cipherId: "caesar",
        direction: "encrypt",
        input: "Hello",
        key,
        options: { instrument: true },
        result: cipherResult,
      });
    };

    expect(build("3").traceId).not.toBe(build("5").traceId);
  });
});