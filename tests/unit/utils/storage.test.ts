import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isStorageAvailable,
  safeJsonParse,
  safeGetItem,
  safeGetItemJson,
  safeSetItem,
  safeSetItemJson,
  safeRemoveItem,
  safeClear,
  getItem,
  setItem,
  removeItem,
  clearStorage,
} from "@/lib/utils/storage";

describe("storage utility wrapper", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("isStorageAvailable", () => {
    it("returns true when localStorage is available and functional", () => {
      expect(isStorageAvailable()).toBe(true);
    });

    it("returns false when localStorage throws an error", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("SecurityError: Access is denied");
      });
      expect(isStorageAvailable()).toBe(false);
    });
  });

  describe("safeJsonParse", () => {
    it("parses valid JSON string", () => {
      expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
      expect(safeJsonParse("[1, 2, 3]", [])).toEqual([1, 2, 3]);
    });

    it("returns fallback for null or undefined input", () => {
      expect(safeJsonParse(null, "default")).toBe("default");
      expect(safeJsonParse(undefined, "default")).toBe("default");
    });

    it("returns fallback for malformed JSON string without throwing", () => {
      expect(safeJsonParse("{invalid: json}", { fallback: true })).toEqual({
        fallback: true,
      });
      expect(safeJsonParse("undefined", [])).toEqual([]);
    });

    it("returns fallback when JSON parses to null or undefined", () => {
      expect(safeJsonParse("null", ["fallback"])).toEqual(["fallback"]);
    });

    it("enforces validator check when provided", () => {
      const isArray = (val: unknown): val is number[] => Array.isArray(val);
      expect(safeJsonParse("[1, 2]", [], isArray)).toEqual([1, 2]);
      expect(safeJsonParse('"just a string"', [], isArray)).toEqual([]);
      expect(safeJsonParse('{"obj": 1}', [], isArray)).toEqual([]);
    });
  });

  describe("safeGetItem & safeGetItemJson", () => {
    it("reads raw string item safely", () => {
      localStorage.setItem("test-key", "hello");
      expect(safeGetItem("test-key")).toBe("hello");
      expect(safeGetItem("non-existent")).toBeNull();
    });

    it("returns null when Storage.getItem throws", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("Quota/Security Exception");
      });
      expect(safeGetItem("any-key")).toBeNull();
    });

    it("reads and parses JSON item safely", () => {
      localStorage.setItem("json-key", JSON.stringify(["a", "b"]));
      expect(safeGetItemJson<string[]>("json-key", [])).toEqual(["a", "b"]);
    });

    it("returns fallback for invalid JSON in safeGetItemJson", () => {
      localStorage.setItem("corrupt-key", "corrupt{data");
      expect(safeGetItemJson("corrupt-key", { default: 1 })).toEqual({
        default: 1,
      });
    });

    it("validates type with validator in safeGetItemJson", () => {
      localStorage.setItem("number-key", "123");
      const isStringArray = (val: unknown): val is string[] =>
        Array.isArray(val) && val.every((item) => typeof item === "string");

      expect(safeGetItemJson("number-key", ["default"], isStringArray)).toEqual([
        "default",
      ]);
    });
  });

  describe("getItem & setItem generic typed wrappers", () => {
    it("stores and retrieves strongly typed data", () => {
      interface UserSettings {
        theme: string;
        notifications: boolean;
      }
      const settings: UserSettings = { theme: "dark", notifications: true };

      setItem<UserSettings>("user-settings", settings);
      const retrieved = getItem<UserSettings>("user-settings", {
        theme: "light",
        notifications: false,
      });

      expect(retrieved).toEqual(settings);
    });

    it("returns defaultValue when key is missing in getItem", () => {
      const defaultList = ["item1", "item2"];
      const retrieved = getItem<string[]>("non-existent-key", defaultList);
      expect(retrieved).toEqual(defaultList);
    });

    it("returns defaultValue when stored data is corrupted", () => {
      localStorage.setItem("corrupt-typed-key", "{invalid:json}");
      const fallbackObj = { count: 0 };
      const retrieved = getItem("corrupt-typed-key", fallbackObj);
      expect(retrieved).toEqual(fallbackObj);
    });

    it("removes item safely with removeItem", () => {
      setItem("temp-key", "temp-val");
      removeItem("temp-key");
      expect(getItem("temp-key", "fallback")).toBe("fallback");
    });

    it("clears storage with clearStorage", () => {
      setItem("k1", "v1");
      setItem("k2", "v2");
      clearStorage();
      expect(getItem("k1", "fallback")).toBe("fallback");
      expect(getItem("k2", "fallback")).toBe("fallback");
    });
  });

  describe("safeSetItem & safeSetItemJson", () => {
    it("writes raw string safely and returns true", () => {
      const result = safeSetItem("my-key", "my-val");
      expect(result).toBe(true);
      expect(localStorage.getItem("my-key")).toBe("my-val");
    });

    it("handles setItem exceptions gracefully and returns false", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
      expect(safeSetItem("key", "val")).toBe(false);
    });

    it("writes JSON safely and returns true", () => {
      const success = safeSetItemJson("json-set", { ok: true });
      expect(success).toBe(true);
      expect(localStorage.getItem("json-set")).toBe('{"ok":true}');
    });

    it("handles non-serializable objects in safeSetItemJson", () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      expect(safeSetItemJson("circular", circular)).toBe(false);
    });
  });

  describe("safeRemoveItem & safeClear", () => {
    it("removes item safely", () => {
      localStorage.setItem("k1", "v1");
      expect(safeRemoveItem("k1")).toBe(true);
      expect(localStorage.getItem("k1")).toBeNull();
    });

    it("handles removeItem exception gracefully", () => {
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("Storage unavailable");
      });
      expect(safeRemoveItem("k1")).toBe(false);
    });

    it("clears storage safely", () => {
      localStorage.setItem("k1", "v1");
      localStorage.setItem("k2", "v2");
      expect(safeClear()).toBe(true);
      expect(localStorage.length).toBe(0);
    });

    it("handles clear exception gracefully", () => {
      vi.spyOn(Storage.prototype, "clear").mockImplementation(() => {
        throw new Error("Storage disabled");
      });
      expect(safeClear()).toBe(false);
    });
  });
});
