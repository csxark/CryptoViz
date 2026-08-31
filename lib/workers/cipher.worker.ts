/**
 * Cipher Web Worker.
 * Handles heavy cryptographic operations off the main thread with lazy-loaded cipher modules.
 * @see CLAUDE.md
 */


import { deriveKey } from "../kdf/pbkdf2";
import { deriveScryptKey } from "../kdf/scrypt";
import {
  validateWorkload,
  resolveWorkloadLimits,
  validateTraceStepCount,
} from "../security/workloadLimits";
import { CipherError, validateInput } from "../utils/errors";
import type { WorkerRequest, WorkerResponse } from "../../types/worker";
import type { CipherResult } from "../cipher/types";
import { CIPHER_REGISTRY } from "../cipher/registry";
import { assertValidCipherParameters } from "../cipher/parameterValidation";import {
  encodeCipherSteps,
  WORKER_STEP_TRANSFER_THRESHOLD,
} from "./stepTransfer";


type CipherHandler = (input: string, key: string, options?: any) => any;

interface CipherDispatcher {
  encrypt: CipherHandler;
  decrypt: CipherHandler;
}

type WorkerRequestMessage = WorkerRequest | Uint8Array;

async function getDispatcher(cipherId: string): Promise<CipherDispatcher> {
  switch (cipherId) {
    case "caesar": {
      const mod = await import("../cipher/classical/caesar");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "rot13": {
      const mod = await import("../cipher/classical/rot13");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "vigenere": {
      const mod = await import("../cipher/classical/vigenere");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "atbash": {
      const mod = await import("../cipher/classical/atbash");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "playfair": {
      const mod = await import("../cipher/classical/playfair");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "railfence": {
      const mod = await import("../cipher/classical/railfence");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "beaufort": {
      const mod = await import("../cipher/classical/beaufort");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "hill": {
      const mod = await import("../cipher/classical/hill");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "columnar-transposition": {
      const mod = await import("../cipher/classical/columnar-transposition");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "autokey": {
      const mod = await import("../cipher/classical/autokey");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "porta": {
      const mod = await import("../cipher/classical/porta");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "adfgvx": {
      const mod = await import("../cipher/classical/adfgvx");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "bifid": {
      const mod = await import("../cipher/classical/bifid");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "four-square": {
      const mod = await import("../cipher/classical/four-square");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "nihilist": {
      const mod = await import("../cipher/classical/nihilist");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "polybius": {
      const mod = await import("../cipher/classical/polybius");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "xor": {
      const mod = await import("../cipher/symmetric/xor");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "otp": {
      const mod = await import("../cipher/symmetric/otp");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "des": {
      const mod = await import("../cipher/symmetric/des");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "3des": {
      const mod = await import("../cipher/symmetric/3des");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "aes-xts": {
      const mod = await import("../cipher/symmetric/aes-xts");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "aes": {
      const mod = await import("../cipher/symmetric/aes");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "aes-gcm": {
      const mod = await import("../cipher/symmetric/aes-gcm");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "serpent": {
      const mod = await import("../cipher/symmetric/serpent");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "chacha20-poly1305": {
      const mod = await import("../cipher/symmetric/chacha20-poly1305");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "speck": {
      const mod = await import("../cipher/symmetric/speck");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "aes-ccm": {
      const mod = await import("../cipher/symmetric/aes-ccm");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "threefish": {
      const mod = await import("../cipher/symmetric/threefish");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "twofish": {
      const mod = await import("../cipher/symmetric/twofish");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "gost": {
      const mod = await import("../cipher/symmetric/gost");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "rc2": {
      const mod = await import("../cipher/symmetric/rc2");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "enigma": {
      const mod = await import("../cipher/symmetric/enigma");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "xchacha20": {
      const mod = await import("../cipher/symmetric/xchacha20");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "xsalsa20": {
      const mod = await import("../cipher/symmetric/xsalsa20");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "trivium": {
      const mod = await import("../cipher/symmetric/trivium");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "ascon": {
      const mod = await import("../cipher/symmetric/ascon");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "sm4": {
      const mod = await import("../cipher/symmetric/sm4");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "present": {
      const mod = await import("../cipher/symmetric/present");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "simon32": {
      const mod = await import("../cipher/symmetric/simon32");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "tea": {
      const mod = await import("../cipher/symmetric/tea");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "noekeon": {
      const mod = await import("../cipher/symmetric/noekeon");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "lea": {
      const mod = await import("../cipher/symmetric/lea");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "gift": {
      const mod = await import("../cipher/symmetric/gift");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "blowfish": {
      const mod = await import("../cipher/symmetric/blowfish");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "streebog": {
      const mod = await import("../cipher/hash/streebog");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "seed": {
      const mod = await import("../cipher/symmetric/seed");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "kuznyechik": {
      const mod = await import("../cipher/symmetric/kuznyechik");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "simon": {
      const mod = await import("../cipher/symmetric/simon");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "rabbit": {
      const mod = await import("../cipher/symmetric/rabbit");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "hc128": {
      const mod = await import("../cipher/symmetric/hc128");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "anubis": {
      const mod = await import("../cipher/symmetric/anubis");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "mars": {
      const mod = await import("../cipher/symmetric/mars");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "clefia": {
      const mod = await import("../cipher/symmetric/clefia");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "misty1": {
      const mod = await import("../cipher/symmetric/misty1");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "square": {
      const mod = await import("../cipher/symmetric/square");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "feal": {
      const mod = await import("../cipher/symmetric/feal");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "safer-plus": {
      const mod = await import("../cipher/symmetric/safer-plus");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "aria": {
      const mod = await import("../cipher/symmetric/aria");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "kasumi": {
      const mod = await import("../cipher/symmetric/kasumi");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "3way": {
      const mod = await import("../cipher/symmetric/3way");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "rsa": {
      const mod = await import("../cipher/asymmetric/rsa");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "dsa": {
      const mod = await import("../cipher/asymmetric/dsa");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "dh": {
      const mod = await import("../cipher/asymmetric/dh");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "x448": {
      const mod = await import("../cipher/asymmetric/x448");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "ecc": {
      const mod = await import("../cipher/asymmetric/ecc");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "schnorr": {
      const mod = await import("../cipher/asymmetric/schnorr");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "elgamal-signature": {
      const mod = await import("../cipher/asymmetric/elgamal-signature");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "ml-dsa": {
      const mod = await import("../cipher/asymmetric/ml-dsa");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "ecies": {
      const mod = await import("../cipher/asymmetric/ecies");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "ml-kem": {
      const mod = await import("../cipher/asymmetric/ml-kem");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "frodokem": {
      const mod = await import("../cipher/asymmetric/frodokem");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "ecdsa": {
      const mod = await import("../cipher/asymmetric/ecdsa");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "ed448": {
      const mod = await import("../cipher/asymmetric/ed448");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "shamir-secret-sharing": {
      const mod = await import("../cipher/asymmetric/shamir-secret-sharing");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "sidh": {
      const mod = await import("../cipher/asymmetric/sidh");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "ntru": {
      const mod = await import("../cipher/asymmetric/ntru");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "gost-r34-10": {
      const mod = await import("../cipher/asymmetric/gost-r34-10");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "mceliece": {
      const mod = await import("../cipher/asymmetric/mceliece");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "cramer-shoup": {
      const mod = await import("../cipher/asymmetric/cramer-shoup");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "sm2": {
      const mod = await import("../cipher/asymmetric/sm2");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "kcdsa": {
      const mod = await import("../cipher/asymmetric/kcdsa");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "ed25519": {
      const mod = await import("../cipher/asymmetric/ed25519");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "elgamal": {
      const mod = await import("../cipher/asymmetric/elgamal");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "merkle-hellman": {
      const mod = await import("../cipher/asymmetric/merkle-hellman");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "paillier": {
      const mod = await import("../cipher/asymmetric/paillier");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "rabin": {
      const mod = await import("../cipher/asymmetric/rabin");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "x25519": {
      const mod = await import("../cipher/asymmetric/x25519");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "sha256": {
      const mod = await import("../cipher/hash/sha256");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "sm3": {
      const mod = await import("../cipher/hash/sm3");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "sha512": {
      const mod = await import("../cipher/hash/sha512");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "md5": {
      const mod = await import("../cipher/hash/md5");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "hmac": {
      const mod = await import("../cipher/hash/hmac");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "cmac": {
      const mod = await import("../cipher/hash/cmac");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "bcrypt": {
      const mod = await import("../cipher/hash/bcrypt");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "xxhash": {
      const mod = await import("../cipher/hash/xxhash");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "sha3": {
      const mod = await import("../cipher/hash/sha3");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "ripemd160": {
      const mod = await import("../cipher/hash/ripemd160");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "blake2b": {
      const mod = await import("../cipher/hash/blake2b");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "blake3": {
      const mod = await import("../cipher/hash/blake3");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "poly1305": {
      const mod = await import("../cipher/hash/poly1305");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "sha1": {
      const mod = await import("../cipher/hash/sha1");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "hkdf": {
      const mod = await import("../cipher/hash/hkdf");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "blake2s": {
      const mod = await import("../cipher/hash/blake2s");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "sha224": {
      const mod = await import("../cipher/hash/sha2-truncated");
      return { encrypt: mod.encryptSha224, decrypt: mod.decrypt };
    }
    case "sha384": {
      const mod = await import("../cipher/hash/sha2-truncated");
      return { encrypt: mod.encryptSha384, decrypt: mod.decrypt };
    }
    case "shake128": {
      const mod = await import("../cipher/hash/shake");
      return { encrypt: mod.encryptShake128, decrypt: mod.decrypt };
    }
    case "shake256": {
      const mod = await import("../cipher/hash/shake");
      return { encrypt: mod.encryptShake256, decrypt: mod.decrypt };
    }
    case "scrypt": {
      return {
        encrypt: (input, _key, options) => deriveScryptKey(input, {
          N: typeof options?.N === "number" ? options.N : 16384,
          r: typeof options?.r === "number" ? options.r : 8,
          p: typeof options?.p === "number" ? options.p : 1,
          dkLen: typeof options?.dkLen === "number" ? options.dkLen : 32,
          salt: typeof options?.salt === "string" ? options.salt : undefined,
        }),
        decrypt: (input, _key, options) => deriveScryptKey(input, {
          N: typeof options?.N === "number" ? options.N : 16384,
          r: typeof options?.r === "number" ? options.r : 8,
          p: typeof options?.p === "number" ? options.p : 1,
          dkLen: typeof options?.dkLen === "number" ? options.dkLen : 32,
          salt: typeof options?.salt === "string" ? options.salt : undefined,
        }),
      };
    }
    case "rc4": {
      const mod = await import("../cipher/symmetric/rc4");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "salsa20": {
      const mod = await import("../cipher/symmetric/salsa20");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "skipjack": {
      const mod = await import("../cipher/symmetric/skipjack");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "chacha20": {
      const mod = await import("../cipher/symmetric/chacha20");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "rc5": {
      const mod = await import("../cipher/symmetric/rc5");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "xtea": {
      const mod = await import("../cipher/symmetric/xtea");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "rc6": {
      const mod = await import("../cipher/symmetric/rc6");
      return { encrypt: mod.encryptRc6Block, decrypt: mod.decryptRc6Block };
    }
    case "camellia": {
      const mod = await import("../cipher/symmetric/camellia");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    case "idea": {
      const mod = await import("../cipher/symmetric/idea");
      return { encrypt: mod.encrypt, decrypt: mod.decrypt };
    }
    default:
      throw new CipherError(
        "ALGORITHM_UNSUPPORTED",
        `Unsupported cipher ID: ${cipherId}`,
      );
  }
}

const workerScope = self as unknown as Worker & typeof globalThis;

let activeJobs = 0;

const cancelledJobs = new Set<string>();

function isJobCancelled(jobId: string): boolean {
  return cancelledJobs.has(jobId);
}

function markJobCancelled(jobId: string): void {
  cancelledJobs.add(jobId);
}

function clearJobCancellation(jobId: string): void {
  cancelledJobs.delete(jobId);
}
function isWorkerRequest(value: unknown): value is WorkerRequest {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<WorkerRequest>;
  const payload = candidate.payload as Partial<WorkerRequest["payload"]> | undefined;

  const type = (candidate.type as unknown) as string;
  const payloadType = (payload?.type as unknown) as string;

  return (
    type === "EXECUTE" &&
    (payloadType === "encrypt" || payloadType === "decrypt") &&
    typeof candidate.requestId === "string" &&
    !!payload &&
    typeof payload.cipherId === "string" &&
    typeof payload.input === "string" &&
    typeof payload.key === "string"
  );
}

function decodeWorkerRequest(data: WorkerRequestMessage): WorkerRequest {
  if (data instanceof Uint8Array) {
    const decoder = new TextDecoder();
    const decoded = decoder.decode(data);
    return JSON.parse(decoded) as WorkerRequest;
  }

  return data as WorkerRequest;
}

function toErrorDetails(error: unknown): {
  code?: import("../utils/errors").CipherErrorCode | "INVALID_WORKER_MESSAGE";
  message: string;
  details?: unknown;
  remediation?: string;
} {
  if (error instanceof CipherError) {
    return {
      code: error.code as any,
      message: error.message,
      details: error.details,
      remediation: error.remediation,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: String(error) };
}
workerScope.addEventListener(
  "message",
  async (event: MessageEvent<WorkerRequestMessage>) => {
    const startTime = performance.now();
    let requestId = "unknown";
    let jobStarted = false;

    if (
      !(event.data instanceof Uint8Array) &&
      (event.data?.type as any) === "CANCEL" &&
      typeof event.data.jobId === "string"
    ) {
      markJobCancelled(event.data.jobId);
      return;
    }

    try {      const request = decodeWorkerRequest(event.data);
requestId = request.requestId;

if (request.jobId && isJobCancelled(request.jobId)) {
  throw new DOMException(
    "The user aborted the request.",
    "AbortError",
  );
}
      if (!isWorkerRequest(request)) {
        throw new CipherError(
          "INVALID_INPUT",
          "Invalid cipher worker request.",
        );
      }

      const { type, payload } = request;
const { cipherId, input, key, options } = payload;

const cipherDefinition = CIPHER_REGISTRY.find(
  (definition) => definition.id === cipherId,
);

if (!cipherDefinition) {
  throw new CipherError(
    "ALGORITHM_UNSUPPORTED",
    `Unsupported cipher ID: ${cipherId}`,
  );
}
      // The worker is a trust boundary too. Never rely solely on the UI hook
      // to enforce resource limits because callers can post directly to it.
      const limits = resolveWorkloadLimits("cipher", cipherId);

      const validation = validateWorkload({
        operation: "cipher",
        cipherId,
        input,
        key,
        options,
        concurrentJobs: activeJobs + 1,
      });

      if (!validation.valid) {
        const failure = validation.failure!;
        throw new CipherError(failure.code, failure.message);
      }

      // Keep the legacy cipher-level input contract in addition to workload
      // limits. The workload limit protects resource usage; this protects the
      // semantic input contract.
      validateInput(input);

      if (typeof key !== "string") {
        throw new CipherError("INVALID_KEY", "Key must be a string.");
      }

      if (
        options !== undefined &&
        (typeof options !== "object" ||
          options === null ||
          Array.isArray(options))
      ) {
        throw new CipherError(
          "INVALID_INPUT",
          "Cipher options must be an object.",
        );
      }

      assertValidCipherParameters(
        cipherDefinition,
        input,
        key,
        options ?? {},
      );

      activeJobs += 1;      jobStarted = true;

      const dispatcher = await getDispatcher(cipherId);
      const handler = payload.type === "encrypt" ? dispatcher.encrypt : dispatcher.decrypt;
const result = (await handler(input, key, options)) as CipherResult;

if (request.jobId && isJobCancelled(request.jobId)) {
  throw new DOMException(
    "The user aborted the request.",
    "AbortError",
  );
}

if (!result || typeof result !== "object") {        throw new CipherError(
          "INVALID_INPUT",
          "Cipher implementation returned an invalid result.",
        );
      }

      const traceValidation = validateTraceStepCount(result.steps, limits);
      if (!traceValidation.valid) {
        const failure = traceValidation.failure!;
        throw new CipherError(failure.code, failure.message);
      }

      const durationMs = performance.now() - startTime;

      if (durationMs > limits.maxDurationMs) {
        throw new CipherError(
          "WORKLOAD_DURATION_LIMIT",
          `This operation exceeded its ${limits.maxDurationMs}ms execution budget.`,
        );
      }

const batchSize =
  typeof options?.traceBatchSize === "number"
    ? Math.max(1, Math.floor(options.traceBatchSize))
    : 32;

const traceSteps = result.steps ?? [];

workerScope.postMessage({
  type: "TRACE_START",
  requestId,
  jobId: request.jobId,
  totalSteps: traceSteps.length,
});

for (let offset = 0; offset < traceSteps.length; offset += batchSize) {
  if (request.jobId && isJobCancelled(request.jobId)) {
    throw new DOMException(
      "The user aborted the request.",
      "AbortError",
    );
  }

  const batch = traceSteps.slice(offset, offset + batchSize);
  const stepsBuffer = encodeCipherSteps(batch);
  const transferable = stepsBuffer.buffer as ArrayBuffer;

  workerScope.postMessage(
    {
      type: "TRACE_BATCH",
      requestId,
      jobId: request.jobId,
      offset,
      stepsBuffer: transferable,
    },
    [transferable],
  );

  await new Promise<void>((resolve) => {
    const acknowledge = () => {
      workerScope.removeEventListener("message", acknowledge);
      resolve();
    };

    workerScope.addEventListener("message", acknowledge);
  });
}

workerScope.postMessage({
  type: "TRACE_COMPLETE",
  requestId,
  jobId: request.jobId,
});

const response: WorkerResponse = {
  requestId,
  success: true,
  payload: {
    result: { ...result, steps: [] },
  },
  timings: { durationMs },
};

workerScope.postMessage(response);    } catch (error: unknown) {
      const durationMs = performance.now() - startTime;
const { code, message, details, remediation } =
  toErrorDetails(error);
      const response: WorkerResponse = {
        requestId,
        success: false,
payload: {
  error: message,
  errorCode: code,
  errorMessage: message,
  errorDetails: details,
  remediation,
},        timings: { durationMs },
      };

      workerScope.postMessage(response);
    } finally {
      if (jobStarted) {
        activeJobs = Math.max(0, activeJobs - 1);
      }
    }
  },
);
