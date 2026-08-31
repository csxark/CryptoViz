import { afterEach, describe, expect, it, vi } from "vitest";

import {
  APP_RELEASE_VERSION,
  SERVICE_WORKER_PROTOCOL_VERSION,
} from "@/lib/offline/release";
import {
  checkServiceWorkerCompatibility,
  requestServiceWorkerUpdate,
  SERVICE_WORKER_MESSAGE,
} from "@/lib/offline/serviceWorkerProtocol";

const serviceWorkerDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "serviceWorker",
);
const messageChannel = globalThis.MessageChannel;

afterEach(() => {
  if (serviceWorkerDescriptor) {
    Object.defineProperty(navigator, "serviceWorker", serviceWorkerDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "serviceWorker");
  }
  globalThis.MessageChannel = messageChannel;
});

describe("service-worker protocol", () => {
  it("reports an incompatible worker protocol through the version handshake", async () => {
    class TestMessageChannel {
      port1 = {
        close: vi.fn(),
        onmessage: undefined as ((event: MessageEvent<unknown>) => void) | undefined,
      };

      port2 = {
        postMessage: (data: unknown) => {
          this.port1.onmessage?.({ data } as MessageEvent<unknown>);
        },
      };
    }

    globalThis.MessageChannel = TestMessageChannel as unknown as typeof MessageChannel;
    const worker = {
      postMessage: vi.fn((_message: unknown, ports: TestMessageChannel["port2"][]) => {
        ports[0].postMessage({
          type: SERVICE_WORKER_MESSAGE.READY,
          releaseVersion: APP_RELEASE_VERSION,
          protocolVersion: SERVICE_WORKER_PROTOCOL_VERSION + 1,
        });
      }),
    };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { ready: Promise.resolve({ active: worker }) },
    });

    await expect(checkServiceWorkerCompatibility()).resolves.toEqual({
      compatible: false,
      version: {
        type: SERVICE_WORKER_MESSAGE.READY,
        releaseVersion: APP_RELEASE_VERSION,
        protocolVersion: SERVICE_WORKER_PROTOCOL_VERSION + 1,
      },
    });
  });

  it("asks a waiting worker to activate using the explicit update message", () => {
    const postMessage = vi.fn();
    requestServiceWorkerUpdate({
      waiting: { postMessage },
    } as unknown as ServiceWorkerRegistration);

    expect(postMessage).toHaveBeenCalledWith({
      type: SERVICE_WORKER_MESSAGE.SKIP_WAITING,
    });
  });
});