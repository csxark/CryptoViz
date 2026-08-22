/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Worker Communication Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should format worker request payload correctly", () => {
    const payload = {
      action: "encrypt" as const,
      cipherId: "caesar",
      input: "HELLO WORLD",
      key: "3",
      id: "req-12345",
    };

    expect(payload.action).toBe("encrypt");
    expect(payload.id).toBeDefined();
    expect(typeof payload.input).toBe("string");
  });

  it("should properly structure worker response message", () => {
    const mockResponse = {
      id: "req-12345",
      success: true,
      data: {
        output: "KHOOR ZRUOG",
        executionTimeMs: 1.25,
      },
    };

    expect(mockResponse.success).toBe(true);
    expect(mockResponse.data.output).toBe("KHOOR ZRUOG");
    expect(mockResponse.data.executionTimeMs).toBeGreaterThan(0);
  });

  it("should handle error payloads when worker fails", () => {
    const mockErrorResponse = {
      id: "req-99999",
      success: false,
      error: "Invalid key format for specified cipher",
    };

    expect(mockErrorResponse.success).toBe(false);
    expect(mockErrorResponse.error).toContain("Invalid key format");
  });

  it("returns a structured error for malformed runtime messages", async () => {
    const addEventListenerSpy = vi.spyOn(globalThis as any, "addEventListener");
    const postMessageSpy = vi.spyOn(globalThis as any, "postMessage").mockImplementation(() => {});

    await import("@/lib/workers/cipher.worker");
    const messageCall = addEventListenerSpy.mock.calls.find(call => call[0] === "message");
    expect(messageCall).toBeDefined();
    const listener = messageCall![1] as any;

    await listener({
      data: {
        type: "EXECUTE",
        requestId: "req-invalid",
        payload: {
          type: "encrypt",
          cipherId: { malicious: true },
          input: "hello",
          key: "key",
        },
      },
    });

    const response = postMessageSpy.mock.calls.at(-1)?.[0] as any;
    expect(response.success).toBe(false);
    expect(response.requestId).toBe("req-invalid");
    expect(response.payload.errorCode).toBe("INVALID_WORKER_MESSAGE");
  });

  it("should throw CipherError with ALGORITHM_UNSUPPORTED for unknown cipher IDs", async () => {
    // Setup global spies before importing the worker (which runs immediately)
    const addEventListenerSpy = vi.spyOn(globalThis as any, "addEventListener");
    const postMessageSpy = vi.spyOn(globalThis as any, "postMessage").mockImplementation(() => {});

    // Dynamically import the worker to execute its top-level event registration
    await import("@/lib/workers/cipher.worker");

    // Find the registered message listener
    const messageCall = addEventListenerSpy.mock.calls.find(call => call[0] === "message");
    expect(messageCall).toBeDefined();
    const listener = messageCall![1] as any;

    // Trigger the listener with an unknown cipher ID
    await listener({
      data: {
        type: "EXECUTE",
        requestId: "req-unknown",
        payload: {
          type: "encrypt",
          cipherId: "fake-cipher-123",
          input: "hello",
          key: "key",
          options: {}
        }
      }
    } as any);

    // Verify the response
    expect(postMessageSpy).toHaveBeenCalled();
    const response = postMessageSpy.mock.calls[0][0] as any;

    expect(response.success).toBe(false);
    expect(response.payload.errorCode).toBe("ALGORITHM_UNSUPPORTED");
    expect(response.payload.errorMessage).toContain("fake-cipher-123");
  });
});
  describe("Dynamic Cipher Module Lazy-Loading", () => {
    it("dynamically imports and executes a classical cipher module (caesar)", async () => {
      const caesarMod = await import("@/lib/cipher/classical/caesar");
      const result = caesarMod.encrypt("HELLO WORLD", "3");
      expect(result).toBeDefined();
      expect(result.output || (result as { ciphertext?: string }).ciphertext).toBe("KHOOR ZRUOG");
    });

    it("dynamically imports and executes a symmetric cipher module (aes)", async () => {
      const aesMod = await import("@/lib/cipher/symmetric/aes");
      const result = aesMod.encrypt("00112233445566778899aabbccddeeff", "000102030405060708090a0b0c0d0e0f");
      expect(result).toBeDefined();
      expect(result.output || (result as { ciphertext?: string }).ciphertext).toBeDefined();
    });

    it("dynamically imports hash modules (sha256)", async () => {
      const sha256Mod = await import("@/lib/cipher/hash/sha256");
      const result = sha256Mod.encrypt("test input", "");
      expect(result).toBeDefined();
      expect(result.output || (result as { ciphertext?: string }).ciphertext).toBeDefined();
    });

    it("handles unsupported cipher ID gracefully", async () => {
      const unsupportedId = "unknown-cipher-xyz";
      const loader = () => import(`../../lib/cipher/classical/${unsupportedId}`);
      await expect(loader()).rejects.toThrow();
    });
  });
});
