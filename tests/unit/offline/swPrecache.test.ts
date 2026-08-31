import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("service-worker release lifecycle", () => {
  const swPath = path.resolve(process.cwd(), "public/sw.js");
  const source = fs.readFileSync(swPath, "utf8");

  it("uses a release-versioned cache and removes previous releases", () => {
    expect(source).toContain('const CACHE_NAME = `${CACHE_PREFIX}${RELEASE_VERSION}`');
    expect(source).toContain("name.startsWith(CACHE_PREFIX)");
    expect(source).toContain("name !== CACHE_NAME");
  });

  it("does not activate a partially cached release", () => {
    expect(source).toContain("cache.addAll(PRECACHE_URLS)");
    expect(source).toContain("caches.delete(CACHE_NAME)");
    expect(source).toContain("self.skipWaiting()");
  });

  it("supports a port-based version handshake and forced update", () => {
    expect(source).toContain("event.ports?.[0]");
    expect(source).toContain("CRYPTOVIZ_SW_SKIP_WAITING");
    expect(source).toContain("protocolVersion: PROTOCOL_VERSION");
  });

  it("does not include missing /globals.css in PRECACHE_URLS", () => {
    expect(source).not.toContain('"/globals.css"');
    expect(source).toContain('"/"');
    expect(source).toContain('"/icon.svg"');
    expect(source).toContain('"/theme-init.js"');
  });
});