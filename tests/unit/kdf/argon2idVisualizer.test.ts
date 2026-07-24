import { describe, expect, it } from "vitest";
import {
  DEFAULT_ARGON2ID_PARAMS,
  describeArgon2idRisk,
  estimateArgon2idWorkFactor,
  runArgon2idVisualization,
  validateArgon2idParams,
} from "../../../lib/kdf/argon2idVisualizer";

describe("Argon2id visualizer utilities", () => {
  it("validates and normalizes parameters", () => {
    expect(
      validateArgon2idParams({
        ...DEFAULT_ARGON2ID_PARAMS,
        password: "  password  ",
        salt: "  salt  ",
      }),
    ).toMatchObject({
      password: "password",
      salt: "salt",
    });
  });

  it("rejects missing password and salt", () => {
    expect(() =>
      validateArgon2idParams({ ...DEFAULT_ARGON2ID_PARAMS, password: " " }),
    ).toThrow(/password is required/i);
    expect(() =>
      validateArgon2idParams({ ...DEFAULT_ARGON2ID_PARAMS, salt: " " }),
    ).toThrow(/salt is required/i);
  });

  it("rejects parameters outside safe demo limits", () => {
    expect(() =>
      validateArgon2idParams({ ...DEFAULT_ARGON2ID_PARAMS, memoryBlocks: 7 }),
    ).toThrow(/memory blocks must be between 8 and 64/i);
    expect(() =>
      validateArgon2idParams({ ...DEFAULT_ARGON2ID_PARAMS, iterations: 7 }),
    ).toThrow(/iterations must be between 1 and 6/i);
    expect(() =>
      validateArgon2idParams({ ...DEFAULT_ARGON2ID_PARAMS, lanes: 5 }),
    ).toThrow(/lanes must be between 1 and 4/i);
  });

  it("produces deterministic visualization output", () => {
    const first = runArgon2idVisualization(DEFAULT_ARGON2ID_PARAMS);
    const second = runArgon2idVisualization(DEFAULT_ARGON2ID_PARAMS);
    expect(first.digest).toBe(second.digest);
    expect(first.blocks).toEqual(second.blocks);
  });

  it("creates memory blocks and finalization block", () => {
    const result = runArgon2idVisualization({
      ...DEFAULT_ARGON2ID_PARAMS,
      memoryBlocks: 8,
      iterations: 2,
      lanes: 2,
    });
    expect(result.blocks).toHaveLength(17);
    expect(result.blocks.at(-1)?.phase).toBe("finalization");
    expect(result.phases.map((phase) => phase.id)).toEqual([
      "initialization",
      "argon2i",
      "argon2d",
      "finalization",
    ]);
  });

  it("changes digest when salt changes", () => {
    const first = runArgon2idVisualization(DEFAULT_ARGON2ID_PARAMS);
    const second = runArgon2idVisualization({
      ...DEFAULT_ARGON2ID_PARAMS,
      salt: "another-salt",
    });
    expect(first.digest).not.toBe(second.digest);
  });

  it("estimates demo work factor", () => {
    expect(
      estimateArgon2idWorkFactor({ memoryBlocks: 24, iterations: 3, lanes: 2 }),
    ).toBe(144);
  });

  it("describes demo risk settings", () => {
    expect(describeArgon2idRisk(DEFAULT_ARGON2ID_PARAMS)).toBe(
      "strong demo setting",
    );
    expect(
      describeArgon2idRisk({
        ...DEFAULT_ARGON2ID_PARAMS,
        memoryBlocks: 8,
        iterations: 1,
        lanes: 1,
      }),
    ).toBe("weak demo setting");
  });
});
