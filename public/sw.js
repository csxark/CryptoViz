/**
 * CryptoViz Service Worker
 * Generated automatically.
 *
 * Release: development
 * Protocol: 1
 */

const RELEASE_VERSION = "development";

const PROTOCOL_VERSION = 1;

const CACHE_PREFIX = "cryptoviz-";
const CACHE_NAME = `${CACHE_PREFIX}${RELEASE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/advisor/",
  "/attacks/",
  "/attacks/aead-nonce-reuse/",
  "/attacks/automated-cryptanalysis/",
  "/attacks/bellcore-crt/",
  "/attacks/birthday-attack/",
  "/attacks/brute-force/",
  "/attacks/dh-mitm/",
  "/attacks/dictionary/",
  "/attacks/differential-cryptanalysis/",
  "/attacks/ecb-leakage/",
  "/attacks/entropy-calculator/",
  "/attacks/frequency-analysis/",
  "/attacks/length-extension/",
  "/attacks/linear-cryptanalysis/",
  "/attacks/meet-in-the-middle/",
  "/attacks/padding-oracle/",
  "/attacks/replay-attack/",
  "/attacks/rsa/",
  "/attacks/side-channel-waveform/",
  "/attacks/side-channel/",
  "/attacks/signature-nonce-reuse/",
  "/attacks/timing/",
  "/audit-sandbox/",
  "/avalanche/",
  "/benchmark/",
  "/benchmarks/history/",
  "/bloom-filter/",
  "/case-studies/",
  "/certificate-validation/",
  "/challenge/",
  "/cipher-identifier/",
  "/cipher-lifecycle/",
  "/cipher-loader/",
  "/cipher-sandbox/",
  "/collections/",
  "/compare/",
  "/cryptanalysis/sbox/",
  "/dashboard/",
  "/demo/reed-solomon/",
  "/docs/",
  "/docs/architecture/",
  "/docs/secret-recovery/",
  "/docs/standards/",
  "/docs/tls13-handshake/",
  "/docs/visualization-development-guide/",
  "/docs/worker-architecture/",
  "/drbg-visualizer/",
  "/ecc-playground/",
  "/emv/",
  "/encoding-errors/",
  "/encoding-toolkit/",
  "/encoding/",
  "/entropy-harvesting/",
  "/entropy-workbench/",
  "/finite-field/",
  "/fpe-playground/",
  "/glossary/",
  "/hash-collision/",
  "/homomorphic/",
  "/ibe-pairings/",
  "/icon.svg",
  "/interoperability-test-lab/",
  "/interview/",
  "/kdf/hkdf/",
  "/kdf/pbkdf2/",
  "/kdf/scrypt/",
  "/key-size/",
  "/learning-paths/",
  "/matrix/",
  "/merkle/",
  "/modes/",
  "/modular-arithmetic/",
  "/morse-code/",
  "/myth-busters/",
  "/notes/",
  "/ntt-visualizer/",
  "/offline/",
  "/openpgp/",
  "/padding/",
  "/pipeline/",
  "/pqc-lattices/",
  "/protocols/",
  "/protocols/webauthn/",
  "/protocols/zero-knowledge/",
  "/quality/reliability/",
  "/quantum-cryptanalysis/",
  "/quantum-key-distribution/",
  "/rainbow-table/",
  "/reference/",
  "/resources/",
  "/resources/post-quantum/",
  "/resources/roadmap/",
  "/resources/sbox/",
  "/resources/standards-rfc/",
  "/resources/video-library/",
  "/sbox/",
  "/security-games/",
  "/security-recommendation/",
  "/signal-lab/",
  "/srp-lab/",
  "/steganography/",
  "/substitution-breaker/",
  "/test-vectors/",
  "/tests/integration/",
  "/tests/snapshots/",
  "/tests/worker/",
  "/theme-init.js",
  "/threshold-crypto/",
  "/timeline/",
  "/visual-cryptography/",
  "/visualizer/",
  "/visualizer/aes-key-expansion/",
  "/visualizer/argon2id/",
  "/visualizer/avalanche-effect/",
  "/visualizer/crc32/",
  "/visualizer/csidh/",
  "/visualizer/des-key-schedule/",
  "/visualizer/ecb-pattern/",
  "/visualizer/frodokem/",
  "/visualizer/hash-collision/",
  "/visualizer/idea/",
  "/visualizer/merkle-proof/",
  "/visualizer/rsa-keygen/",
  "/visualizer/secret-recovery/",
  "/visualizer/sha256-compression/",
  "/visualizer/siphash/",
  "/visualizer/slh-dsa/",
  "/visualizer/tls13-handshake/"
];

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
