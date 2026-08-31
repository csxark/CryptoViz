import fs from "node:fs";
import path from "node:path";


const root = process.cwd();

const outputPath = path.join(
  root,
  "public",
  "sw.js",
);

const releaseVersion =
  process.env.NEXT_PUBLIC_APP_RELEASE_VERSION ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  "development";

const protocolVersion = 1;

/* Keep this list generated from the existing application routes.*/
export function generatePrecacheList(
  appDirectory = path.join(root, "app"),
) {
  const routes = new Set(["/", "/icon.svg", "/theme-init.js"]);

  const visit = (directory, segments = []) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!entry.name.startsWith("_")) {
          visit(path.join(directory, entry.name), [...segments, entry.name]);
        }
        continue;
      }

      if (!/^page\.(?:js|jsx|ts|tsx)$/.test(entry.name)) {
        continue;
      }

      const routeSegments = segments.filter(
        segment => !segment.startsWith("(") && !segment.startsWith("["),
      );
      routes.add(`/${routeSegments.join("/")}${routeSegments.length ? "/" : ""}`);
    }
  };

  visit(appDirectory);
  return [...routes].sort();
}

const precacheUrls = generatePrecacheList();

const serviceWorker = `/**
 * CryptoViz Service Worker
 * Generated automatically.
 *
 * Release: ${releaseVersion}
 * Protocol: ${protocolVersion}
 */

const RELEASE_VERSION = ${JSON.stringify(
  releaseVersion,
)};

const PROTOCOL_VERSION = ${protocolVersion};

const CACHE_PREFIX = "cryptoviz-";
const CACHE_NAME = \`\${CACHE_PREFIX}\${RELEASE_VERSION}\`;

const PRECACHE_URLS = ${JSON.stringify(
  precacheUrls,
  null,
  2,
)};

const MESSAGE = {
  HELLO: "CRYPTOVIZ_SW_HELLO",
  READY: "CRYPTOVIZ_SW_READY",
  GET_VERSION: "CRYPTOVIZ_SW_GET_VERSION",
  SKIP_WAITING: "CRYPTOVIZ_SW_SKIP_WAITING",
};

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(error =>
        caches.delete(CACHE_NAME).then(() => {
          throw error;
        })
      )
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names =>
        Promise.all(
          names
            .filter(
              name =>
                name.startsWith(CACHE_PREFIX) &&
                name !== CACHE_NAME
            )
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  const message = event.data;

  if (!message || typeof message !== "object") {
    return;
  }

  if (
    message.type === MESSAGE.HELLO ||
    message.type === MESSAGE.GET_VERSION
  ) {
    const replyPort = event.ports?.[0];

    if (replyPort) {
      replyPort.postMessage({
        type: MESSAGE.READY,
        releaseVersion: RELEASE_VERSION,
        protocolVersion: PROTOCOL_VERSION,
      });
      return;
    }

    const source = event.source;
    if (!source || !("postMessage" in source)) {
      return;
    }

    source.postMessage({
      type: MESSAGE.READY,
      releaseVersion: RELEASE_VERSION,
      protocolVersion: PROTOCOL_VERSION,
    });
    return;
  }

  if (message.type === MESSAGE.SKIP_WAITING) {
    void self.skipWaiting();
  }
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          return cached;
        }

        return fetch(event.request)
          .then(response => {
            if (
              response.ok &&
              response.type === "basic"
            ) {
              const copy = response.clone();

              void caches.open(CACHE_NAME)
                .then(cache =>
                  cache.put(event.request, copy)
                );
            }

            return response;
          })
          .catch(async () => {
            if (event.request.mode === "navigate") {
              return (
                (await caches.match("/offline/")) ||
                (await caches.match("/offline")) ||
                (await caches.match("/"))
              );
            }

            return new Response("", {
              status: 503,
              statusText: "Offline",
            });
          });
      })
  );
});
`;

fs.writeFileSync(
  outputPath,
  serviceWorker,
  "utf8",
);

console.log(
  `Generated service worker for release ${releaseVersion}`,
);
