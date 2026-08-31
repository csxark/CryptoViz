import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

type WorkerListener = (event: {
  waitUntil: (promise: Promise<unknown>) => void;
}) => void;

function loadWorker(options: { addAll?: () => Promise<void> } = {}) {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), "public/sw.js"),
    "utf8",
  );
  const listeners = new Map<string, WorkerListener>();
  const cache = {
    addAll: vi.fn(options.addAll ?? (() => Promise.resolve())),
    put: vi.fn(),
  };
  const caches = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => ["cryptoviz-previous-release", "other-cache"]),
    delete: vi.fn(async () => true),
    match: vi.fn(),
  };
  const self = {
    addEventListener: (type: string, listener: WorkerListener) => {
      listeners.set(type, listener);
    },
    skipWaiting: vi.fn(async () => undefined),
    clients: { claim: vi.fn(async () => undefined) },
  };

  new Function("self", "caches", "fetch", "Response", source)(
    self,
    caches,
    vi.fn(),
    Response,
  );

  return { cache, caches, listeners, self };
}

async function dispatchLifecycle(
  listener: WorkerListener | undefined,
): Promise<void> {
  let pending: Promise<unknown> | undefined;
  listener?.({
    waitUntil: (promise) => {
      pending = promise;
    },
  });
  await pending;
}

describe("service-worker upgrades", () => {
  it("precaches the new release before activating and then removes prior release caches", async () => {
    const worker = loadWorker();

    await dispatchLifecycle(worker.listeners.get("install"));
    expect(worker.cache.addAll).toHaveBeenCalledOnce();
    expect(worker.self.skipWaiting).toHaveBeenCalledOnce();

    await dispatchLifecycle(worker.listeners.get("activate"));
    expect(worker.caches.delete).toHaveBeenCalledWith("cryptoviz-previous-release");
    expect(worker.caches.delete).not.toHaveBeenCalledWith("other-cache");
    expect(worker.self.clients.claim).toHaveBeenCalledOnce();
  });

  it("keeps the prior worker active when the new release precache fails", async () => {
    const failure = new Error("precache failed");
    const worker = loadWorker({ addAll: () => Promise.reject(failure) });

    await expect(dispatchLifecycle(worker.listeners.get("install"))).rejects.toBe(failure);
    expect(worker.caches.delete).toHaveBeenCalledWith("cryptoviz-development");
    expect(worker.self.skipWaiting).not.toHaveBeenCalled();
  });
});