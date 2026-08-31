import { describe, expect, it } from "vitest";

import {
  APP_RELEASE_VERSION,
  SERVICE_WORKER_PROTOCOL_VERSION,
  getServiceWorkerCacheName,
} from "@/lib/offline/release";
import {
  createServiceWorkerHello,
  isCompatibleServiceWorker,
  SERVICE_WORKER_MESSAGE,
} from "@/lib/offline/serviceWorkerProtocol";

describe("service-worker release integrity", () => {
  it("names each release cache from its release version", () => {
    expect(getServiceWorkerCacheName("release-a")).toBe("cryptoviz-release-a");
    expect(getServiceWorkerCacheName("release-b")).toBe("cryptoviz-release-b");
    expect(getServiceWorkerCacheName("release-a")).not.toBe(
      getServiceWorkerCacheName("release-b"),
    );
  });

  it("detects release and protocol incompatibility", () => {
    expect(
      isCompatibleServiceWorker({
        releaseVersion: APP_RELEASE_VERSION,
        protocolVersion: SERVICE_WORKER_PROTOCOL_VERSION,
      }),
    ).toBe(true);
    expect(
      isCompatibleServiceWorker({
        releaseVersion: "previous-release",
        protocolVersion: SERVICE_WORKER_PROTOCOL_VERSION,
      }),
    ).toBe(false);
    expect(
      isCompatibleServiceWorker({
        releaseVersion: APP_RELEASE_VERSION,
        protocolVersion: SERVICE_WORKER_PROTOCOL_VERSION + 1,
      }),
    ).toBe(false);
  });

  it("uses a versioned handshake before accepting a worker", () => {
    expect(createServiceWorkerHello()).toEqual({
      type: SERVICE_WORKER_MESSAGE.HELLO,
      releaseVersion: APP_RELEASE_VERSION,
      protocolVersion: SERVICE_WORKER_PROTOCOL_VERSION,
    });
  });
});