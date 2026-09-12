import { afterEach, beforeEach, vi } from "vitest";

const ORIGINAL_CRYPTO = globalThis.crypto;

function installCryptoFallback() {
  if (globalThis.crypto) return;

  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {
      getRandomValues<T extends ArrayBufferView>(array: T): T {
        const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
        for (let index = 0; index < view.length; index += 1) {
          view[index] = (index * 31 + 17) & 0xff;
        }
        return array;
      },
      randomUUID(): string {
        return "00000000-0000-4000-8000-000000000000";
      },
      subtle: undefined,
    },
  });
}

function installTextEncodingFallbacks() {
  if (!globalThis.TextEncoder) {
    const { TextEncoder, TextDecoder } = require("node:util") as typeof import("node:util");
    Object.assign(globalThis, { TextEncoder, TextDecoder });
  }
}

function installWorkerFallback() {
  if ("Worker" in globalThis) return;

  class TestWorker {
    url: string | URL;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;

    constructor(url: string | URL) {
      this.url = url;
    }

    postMessage(message: unknown) {
      queueMicrotask(() => {
        this.onmessage?.(
          new MessageEvent("message", {
            data: {
              id: "test-worker-response",
              ok: true,
              echo: message,
            },
          }),
        );
      });
    }

    terminate() {
      this.onmessage = null;
      this.onerror = null;
    }

    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      if (type !== "message") return;
      this.onmessage = typeof listener === "function" ? listener as (event: MessageEvent) => void : listener.handleEvent.bind(listener) as (event: MessageEvent) => void;
    }

    removeEventListener(type: string) {
      if (type === "message") this.onmessage = null;
    }
  }

  Object.defineProperty(globalThis, "Worker", {
    configurable: true,
    value: TestWorker,
  });
}

function silenceKnownNoisyWarnings() {
  const originalWarn = console.warn;
  vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    const message = args.join(" ");
    if (
      message.includes("ReactDOMTestUtils.act") ||
      message.includes("punycode") ||
      message.includes("not wrapped in act")
    ) {
      return;
    }
    originalWarn(...args);
  });
}

beforeEach(() => {
  installTextEncodingFallbacks();
  installCryptoFallback();
  installWorkerFallback();
  vi.useRealTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllTimers();
  vi.useRealTimers();

  if (ORIGINAL_CRYPTO && globalThis.crypto !== ORIGINAL_CRYPTO) {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: ORIGINAL_CRYPTO,
    });
  }
});

if (typeof window !== "undefined") {
  window.Uint8Array = globalThis.Uint8Array;
  window.ArrayBuffer = globalThis.ArrayBuffer;
}

silenceKnownNoisyWarnings();
