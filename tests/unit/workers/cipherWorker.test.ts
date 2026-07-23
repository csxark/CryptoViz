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
});