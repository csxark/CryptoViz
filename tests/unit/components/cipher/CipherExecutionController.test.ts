import { describe, expect, it } from "vitest";
import { buildCipherWorkerOptions } from "../../../../components/cipher/CipherExecutionController";

const base = {
  hexInput: true,
  rounds: 8,
  demoMode: true,
  bobSecret: "15",
  aesMode: "CBC",
  padding: true,
  autoCompute: false,
};

describe("CipherExecutionController", () => {
  it("maps cipher-specific options without changing unrelated values", () => {
    expect(buildCipherWorkerOptions("aes", base, false)).toMatchObject({
      instrument: true,
      hexInput: true,
      mode: "CBC",
    });
  });

  it("forces educational RSA mode when demo mode is enabled", () => {
    expect(buildCipherWorkerOptions("rsa", base, true).mode).toBe("demo");
    expect(buildCipherWorkerOptions("rsa", base, false).mode).toBe("real");
  });

  it("configures DH and Camellia through the shared controller", () => {
    expect(buildCipherWorkerOptions("dh", base, true)).toMatchObject({ mode: "demo", bobSecret: "15" });
    expect(buildCipherWorkerOptions("camellia", base, false)).toMatchObject({ padding: "PKCS7", mode: "CBC" });
  });
});
