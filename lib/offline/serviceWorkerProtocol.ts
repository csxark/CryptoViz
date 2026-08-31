import {
  APP_RELEASE_VERSION,
  SERVICE_WORKER_PROTOCOL_VERSION,
} from "./release";

export const SERVICE_WORKER_MESSAGE = {
  HELLO: "CRYPTOVIZ_SW_HELLO",
  READY: "CRYPTOVIZ_SW_READY",
  GET_VERSION: "CRYPTOVIZ_SW_GET_VERSION",
  SKIP_WAITING: "CRYPTOVIZ_SW_SKIP_WAITING",
} as const;

export interface ServiceWorkerVersion {
  type: typeof SERVICE_WORKER_MESSAGE.READY;
  releaseVersion: string;
  protocolVersion: number;
}

export interface ServiceWorkerHelloMessage {
  type: typeof SERVICE_WORKER_MESSAGE.HELLO;
  releaseVersion: string;
  protocolVersion: number;
}

export interface ServiceWorkerCompatibilityResult {
  compatible: boolean;
  version?: ServiceWorkerVersion;
}

export function isCompatibleServiceWorker(
  version: Pick<ServiceWorkerVersion, "releaseVersion" | "protocolVersion">,
): boolean {
  return (
    version.releaseVersion === APP_RELEASE_VERSION &&
    version.protocolVersion === SERVICE_WORKER_PROTOCOL_VERSION
  );
}

export function createServiceWorkerHello(): ServiceWorkerHelloMessage {
  return {
    type: SERVICE_WORKER_MESSAGE.HELLO,
    releaseVersion: APP_RELEASE_VERSION,
    protocolVersion: SERVICE_WORKER_PROTOCOL_VERSION,
  };
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

function isServiceWorkerVersion(value: unknown): value is ServiceWorkerVersion {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Partial<ServiceWorkerVersion>;
  return (
    message.type === SERVICE_WORKER_MESSAGE.READY &&
    typeof message.releaseVersion === "string" &&
    typeof message.protocolVersion === "number"
  );
}

export async function checkServiceWorkerCompatibility(
  timeoutMs = 3_000,
): Promise<ServiceWorkerCompatibilityResult> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { compatible: true };
  }

  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active;
  if (!worker) {
    return { compatible: false };
  }

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => {
      channel.port1.close();
      resolve({ compatible: false });
    }, timeoutMs);

    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      window.clearTimeout(timeout);
      channel.port1.close();

      if (!isServiceWorkerVersion(event.data)) {
        resolve({ compatible: false });
        return;
      }

      resolve({
        compatible: isCompatibleServiceWorker(event.data),
        version: event.data,
      });
    };

    worker.postMessage(createServiceWorkerHello(), [channel.port2]);
  });
}

export function requestServiceWorkerUpdate(
  registration: ServiceWorkerRegistration,
): void {
  registration.waiting?.postMessage({
    type: SERVICE_WORKER_MESSAGE.SKIP_WAITING,
  });
}

export function waitForControllerChange(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {
      once: true,
    });
  });
}