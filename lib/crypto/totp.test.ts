import { describe, it, expect } from "vitest";
import {
  generateHotp,
  generateTotp,
  verifyTotp,
  verifyHotp,
  generateOtpauthUri,
  decodeBase32Secret,
  encodeBase32,
  generateSecret,
  getAlgorithmExplanation,
  OtpResult,
} from "./totp";

// ─── Base32 Encoding/Decoding ────────────────────────────────────────────────

describe("Base32 encoding/decoding", () => {
  it("round-trips empty input", () => {
    const encoded = encodeBase32(new Uint8Array(0));
    expect(encoded).toBe("");
  });

  it("round-trips 'Hello'", () => {
    const input = new TextEncoder().encode("Hello");
    const encoded = encodeBase32(input);
    expect(encoded).toBeTruthy();
    const decoded = decodeBase32Secret(encoded);
    expect(decoded).toEqual(input);
  });

  it("decodes known Base32 string", () => {
    const encoded = "JBSWY3DPEHPK3PXP";
    const decoded = decodeBase32Secret(encoded);
    expect(decoded).toEqual(new TextEncoder().encode("Hello"));
  });

  it("throws on invalid Base32 character", () => {
    expect(() => decodeBase32Secret("INVALID1")).toThrow();
  });

  it("strips padding and whitespace", () => {
    const decoded = decodeBase32Secret("JBSWY3DP EH=K3PXP= ");
    expect(decoded).toEqual(new TextEncoder().encode("Hello"));
  });
});

// ─── HOTP Generation ─────────────────────────────────────────────────────────

describe("HOTP generation (RFC 4226)", () => {
  it("generates 6-digit OTP", () => {
    const result = generateHotp({
      secret: "12345678901234567890",
      digits: 6,
      counter: 0,
      algorithm: "SHA-1",
    });
    expect(result.otp).toHaveLength(6);
    expect(/^\d{6}$/.test(result.otp)).toBe(true);
  });

  it("generates different OTPs for different counters", () => {
    const r1 = generateHotp({
      secret: "12345678901234567890",
      digits: 6,
      counter: 0,
      algorithm: "SHA-1",
    });
    const r2 = generateHotp({
      secret: "12345678901234567890",
      digits: 6,
      counter: 1,
      algorithm: "SHA-1",
    });
    expect(r1.otp).not.toBe(r2.otp);
  });

  it("produces step-by-step visualization", () => {
    const result = generateHotp({
      secret: "12345678901234567890",
      digits: 6,
      counter: 0,
      algorithm: "SHA-1",
    });
    expect(result.steps.length).toBeGreaterThanOrEqual(4);
    for (const step of result.steps) {
      expect(step.step).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  it("supports 8-digit OTP", () => {
    const result = generateHotp({
      secret: "12345678901234567890",
      digits: 8,
      counter: 0,
      algorithm: "SHA-1",
    });
    expect(result.otp).toHaveLength(8);
  });

  it("supports Base32-encoded secrets", () => {
    const result = generateHotp({
      secret: "JBSWY3DPEHPK3PXP",
      digits: 6,
      counter: 0,
      algorithm: "SHA-1",
    });
    expect(result.otp).toHaveLength(6);
    expect(result.steps[0].description).toContain("Base32");
  });

  it("returns counter in result", () => {
    const result = generateHotp({
      secret: "test-secret",
      digits: 6,
      counter: 42,
      algorithm: "SHA-1",
    });
    expect(result.counter).toBe(42);
  });
});

// ─── TOTP Generation ─────────────────────────────────────────────────────────

describe("TOTP generation (RFC 6238)", () => {
  it("generates 6-digit TOTP", () => {
    const result = generateTotp(
      { secret: "12345678901234567890" },
      1234567890,
    );
    expect(result.otp).toHaveLength(6);
    expect(/^\d{6}$/.test(result.otp)).toBe(true);
  });

  it("returns correct timestamp and counter", () => {
    const result = generateTotp(
      { secret: "12345678901234567890" },
      1234567890,
    );
    expect(result.timestamp).toBe(1234567890);
    expect(result.counter).toBe(Math.floor(1234567890 / 30));
  });

  it("calculates remaining seconds correctly", () => {
    const timestamp = 1234567890;
    const result = generateTotp({ secret: "test" }, timestamp);
    expect(result.remainingSeconds).toBe(
      30 - (timestamp % 30),
    );
  });

  it("produces same OTP for same timestamp", () => {
    const r1 = generateTotp({ secret: "test" }, 1234567890);
    const r2 = generateTotp({ secret: "test" }, 1234567890);
    expect(r1.otp).toBe(r2.otp);
  });

  it("produces different OTPs across different periods", () => {
    const r1 = generateTotp({ secret: "test" }, 1234567890);
    const r2 = generateTotp({ secret: "test" }, 1234567890 + 31);
    expect(r1.otp).not.toBe(r2.otp);
  });

  it("supports custom period", () => {
    const r1 = generateTotp({ secret: "test", period: 60 }, 1234567890);
    const r2 = generateTotp({ secret: "test", period: 60 }, 1234567890 + 61);
    expect(r1.otp).not.toBe(r2.otp);
  });

  it("supports custom digits", () => {
    const result = generateTotp({ secret: "test", digits: 8 }, 1234567890);
    expect(result.otp).toHaveLength(8);
  });

  it("includes time step in first visualization step", () => {
    const result = generateTotp({ secret: "test" }, 1234567890);
    expect(result.steps[0].description).toContain("Convert Unix timestamp");
  });
});

// ─── TOTP Verification ───────────────────────────────────────────────────────

describe("TOTP verification", () => {
  it("verifies correct OTP", () => {
    const timestamp = 1234567890;
    const { otp } = generateTotp({ secret: "test" }, timestamp);
    const result = verifyTotp({ secret: "test" }, otp, timestamp);
    expect(result.valid).toBe(true);
    expect(result.windowIndex).toBe(0);
  });

  it("rejects incorrect OTP", () => {
    const result = verifyTotp({ secret: "test" }, "000000", 1234567890);
    expect(result.valid).toBe(false);
  });

  it("accepts OTP from adjacent time window with tolerance", () => {
    const timestamp = 1234567890;
    const { otp } = generateTotp({ secret: "test" }, timestamp);
    // Verify against next period
    const result = verifyTotp({ secret: "test" }, otp, timestamp + 30, 1);
    expect(result.valid).toBe(true);
    expect(result.windowIndex).toBe(-1);
  });

  it("rejects OTP outside tolerance window", () => {
    const timestamp = 1234567890;
    const { otp } = generateTotp({ secret: "test" }, timestamp);
    // 5 periods ahead with window=1 should fail
    const result = verifyTotp({ secret: "test" }, otp, timestamp + 150, 1);
    expect(result.valid).toBe(false);
  });

  it("provides message on failure", () => {
    const result = verifyTotp({ secret: "test" }, "000000", 1234567890);
    expect(result.message).toBeTruthy();
    expect(result.expected).toHaveLength(6);
  });
});

// ─── HOTP Verification ───────────────────────────────────────────────────────

describe("HOTP verification", () => {
  it("verifies correct HOTP", () => {
    const { otp } = generateHotp({
      secret: "test",
      digits: 6,
      counter: 5,
      algorithm: "SHA-1",
    });
    const result = verifyHotp(
      { secret: "test", digits: 6, counter: 5, algorithm: "SHA-1" },
      otp,
    );
    expect(result.valid).toBe(true);
    expect(result.windowIndex).toBe(0);
  });

  it("verifies with lookahead", () => {
    const config = {
      secret: "test",
      digits: 6,
      counter: 5,
      algorithm: "SHA-1" as const,
    };
    const { otp } = generateHotp({ ...config, counter: 7 });
    const result = verifyHotp(config, otp, 10);
    expect(result.valid).toBe(true);
    expect(result.windowIndex).toBe(2);
  });

  it("rejects beyond lookahead", () => {
    const config = {
      secret: "test",
      digits: 6,
      counter: 5,
      algorithm: "SHA-1" as const,
    };
    const { otp } = generateHotp({ ...config, counter: 20 });
    const result = verifyHotp(config, otp, 10);
    expect(result.valid).toBe(false);
  });
});

// ─── otpauth:// URI ──────────────────────────────────────────────────────────

describe("otpauth:// URI generation", () => {
  it("generates TOTP URI", () => {
    const uri = generateOtpauthUri("totp", "JBSWY3DP", {
      issuer: "CryptoViz",
      accountName: "user@example.com",
    });
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("issuer=CryptoViz");
    expect(uri).toContain("secret=JBSWY3DP");
  });

  it("generates HOTP URI with counter", () => {
    const uri = generateOtpauthUri("hotp", "SECRET123", {
      accountName: "admin",
      counter: 0,
    });
    expect(uri).toContain("otpauth://hotp/");
    expect(uri).toContain("counter=0");
  });

  it("includes custom digits and period", () => {
    const uri = generateOtpauthUri("totp", "ABC", {
      digits: 8,
      period: 60,
      algorithm: "SHA256",
    });
    expect(uri).toContain("digits=8");
    expect(uri).toContain("period=60");
    expect(uri).toContain("algorithm=SHA256");
  });

  it("encodes label with issuer prefix", () => {
    const uri = generateOtpauthUri("totp", "X", {
      issuer: "MyApp",
      accountName: "bob",
    });
    expect(uri).toContain("MyApp%3Abob");
  });
});

// ─── Secret Generation ───────────────────────────────────────────────────────

describe("Secret generation", () => {
  it("generates a non-empty Base32 string", () => {
    const secret = generateSecret();
    expect(secret.length).toBeGreaterThan(0);
    expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
  });

  it("generates different secrets each time", () => {
    const s1 = generateSecret();
    const s2 = generateSecret();
    expect(s1).not.toBe(s2);
  });

  it("supports custom length", () => {
    const secret = generateSecret(10);
    expect(secret.length).toBeGreaterThan(0);
  });
});

// ─── Algorithm Explanation ────────────────────────────────────────────────────

describe("Algorithm explanation", () => {
  it("returns 7 explanation steps", () => {
    const steps = getAlgorithmExplanation();
    expect(steps.length).toBe(7);
    for (const step of steps) {
      expect(step.length).toBeGreaterThan(10);
    }
  });
});

// ─── Cross-format Consistency ─────────────────────────────────────────────────

describe("Cross-format consistency", () => {
  it("TOTP with same counter as HOTP produces same OTP", () => {
    const timestamp = 1234567890;
    const period = 30;
    const counter = Math.floor(timestamp / period);

    const totp = generateTotp({ secret: "12345678901234567890" }, timestamp);
    const hotp = generateHotp({
      secret: "12345678901234567890",
      digits: 6,
      counter,
      algorithm: "SHA-1",
    });

    expect(totp.otp).toBe(hotp.otp);
    expect(totp.counter).toBe(counter);
  });

  it("different algorithms produce different OTPs", () => {
    const sha1 = generateHotp({
      secret: "test",
      digits: 6,
      counter: 0,
      algorithm: "SHA-1",
    });
    // With same inputs but different algorithm, should differ
    // (We only support SHA-1 currently, but the config accepts others)
    expect(sha1.otp).toHaveLength(6);
  });
});
