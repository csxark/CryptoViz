/**
 * Cipher Web Worker.
 * Handles heavy cryptographic operations off the main thread with lazy-loaded cipher modules.
 * @see CLAUDE.md
 */


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

const w = async (p: Promise<any>): Promise<CipherDispatcher> => {
  const m = await p;
  return { encrypt: m.encrypt, decrypt: m.decrypt };
};

async function getDispatcher(cipherId: string): Promise<CipherDispatcher> {
  switch (cipherId) {
    case "caesar": return w(import("../cipher/classical/caesar"));
    case "rot13": return w(import("../cipher/classical/rot13"));
    case "vigenere": return w(import("../cipher/classical/vigenere"));
    case "atbash": return w(import("../cipher/classical/atbash"));
    case "playfair": return w(import("../cipher/classical/playfair"));
    case "railfence": return w(import("../cipher/classical/railfence"));
    case "beaufort": return w(import("../cipher/classical/beaufort"));
    case "hill": return w(import("../cipher/classical/hill"));
    case "columnar-transposition": return w(import("../cipher/classical/columnar-transposition"));
    case "autokey": return w(import("../cipher/classical/autokey"));
    case "porta": return w(import("../cipher/classical/porta"));
    case "adfgvx": return w(import("../cipher/classical/adfgvx"));
    case "bifid": return w(import("../cipher/classical/bifid"));
    case "four-square": return w(import("../cipher/classical/four-square"));
    case "nihilist": return w(import("../cipher/classical/nihilist"));
    case "polybius": return w(import("../cipher/classical/polybius"));
    case "xor": return w(import("../cipher/symmetric/xor"));
    case "otp": return w(import("../cipher/symmetric/otp"));
    case "des": return w(import("../cipher/symmetric/des"));
    case "3des": return w(import("../cipher/symmetric/3des"));
    case "aes-xts": return w(import("../cipher/symmetric/aes-xts"));
    case "aes": return w(import("../cipher/symmetric/aes"));
    case "aes-gcm": return w(import("../cipher/symmetric/aes-gcm"));
    case "serpent": return w(import("../cipher/symmetric/serpent"));
    case "chacha20-poly1305": return w(import("../cipher/symmetric/chacha20-poly1305"));
    case "speck": return w(import("../cipher/symmetric/speck"));
    case "aes-ccm": return w(import("../cipher/symmetric/aes-ccm"));
    case "threefish": return w(import("../cipher/symmetric/threefish"));
    case "twofish": return w(import("../cipher/symmetric/twofish"));
    case "gost": return w(import("../cipher/symmetric/gost"));
    case "rc2": return w(import("../cipher/symmetric/rc2"));
    case "enigma": return w(import("../cipher/symmetric/enigma"));
    case "xchacha20": return w(import("../cipher/symmetric/xchacha20"));
    case "xsalsa20": return w(import("../cipher/symmetric/xsalsa20"));
    case "trivium": return w(import("../cipher/symmetric/trivium"));
    case "ascon": return w(import("../cipher/symmetric/ascon"));
    case "sm4": return w(import("../cipher/symmetric/sm4"));
    case "present": return w(import("../cipher/symmetric/present"));
    case "simon32": return w(import("../cipher/symmetric/simon32"));
    case "tea": return w(import("../cipher/symmetric/tea"));
    case "noekeon": return w(import("../cipher/symmetric/noekeon"));
    case "lea": return w(import("../cipher/symmetric/lea"));
    case "gift": return w(import("../cipher/symmetric/gift"));
    case "blowfish": return w(import("../cipher/symmetric/blowfish"));
    case "streebog": return w(import("../cipher/hash/streebog"));
    case "seed": return w(import("../cipher/symmetric/seed"));
    case "kuznyechik": return w(import("../cipher/symmetric/kuznyechik"));
    case "simon": return w(import("../cipher/symmetric/simon"));
    case "rabbit": return w(import("../cipher/symmetric/rabbit"));
    case "hc128": return w(import("../cipher/symmetric/hc128"));
    case "anubis": return w(import("../cipher/symmetric/anubis"));
    case "mars": return w(import("../cipher/symmetric/mars"));
    case "clefia": return w(import("../cipher/symmetric/clefia"));
    case "misty1": return w(import("../cipher/symmetric/misty1"));
    case "square": return w(import("../cipher/symmetric/square"));
    case "feal": return w(import("../cipher/symmetric/feal"));
    case "safer-plus": return w(import("../cipher/symmetric/safer-plus"));
    case "aria": return w(import("../cipher/symmetric/aria"));
    case "kasumi": return w(import("../cipher/symmetric/kasumi"));
    case "3way": return w(import("../cipher/symmetric/3way"));
    case "rsa": return w(import("../cipher/asymmetric/rsa"));
    case "dsa": return w(import("../cipher/asymmetric/dsa"));
    case "dh": return w(import("../cipher/asymmetric/dh"));
    case "x448": return w(import("../cipher/asymmetric/x448"));
    case "ecc": return w(import("../cipher/asymmetric/ecc"));
    case "schnorr": return w(import("../cipher/asymmetric/schnorr"));
    case "elgamal-signature": return w(import("../cipher/asymmetric/elgamal-signature"));
    case "ml-dsa": return w(import("../cipher/asymmetric/ml-dsa"));
    case "ecies": return w(import("../cipher/asymmetric/ecies"));
    case "ml-kem": return w(import("../cipher/asymmetric/ml-kem"));
    case "frodokem": return w(import("../cipher/asymmetric/frodokem"));
    case "ecdsa": return w(import("../cipher/asymmetric/ecdsa"));
    case "ed448": return w(import("../cipher/asymmetric/ed448"));
    case "shamir-secret-sharing": return w(import("../cipher/asymmetric/shamir-secret-sharing"));
    case "sidh": return w(import("../cipher/asymmetric/sidh"));
    case "ntru": return w(import("../cipher/asymmetric/ntru"));
    case "gost-r34-10": return w(import("../cipher/asymmetric/gost-r34-10"));
    case "mceliece": return w(import("../cipher/asymmetric/mceliece"));
    case "cramer-shoup": return w(import("../cipher/asymmetric/cramer-shoup"));
    case "sm2": return w(import("../cipher/asymmetric/sm2"));
    case "kcdsa": return w(import("../cipher/asymmetric/kcdsa"));
    case "ed25519": return w(import("../cipher/asymmetric/ed25519"));
    case "elgamal": return w(import("../cipher/asymmetric/elgamal"));
    case "merkle-hellman": return w(import("../cipher/asymmetric/merkle-hellman"));
    case "paillier": return w(import("../cipher/asymmetric/paillier"));
    case "rabin": return w(import("../cipher/asymmetric/rabin"));
    case "x25519": return w(import("../cipher/asymmetric/x25519"));
    case "sha256": return w(import("../cipher/hash/sha256"));
    case "sm3": return w(import("../cipher/hash/sm3"));
    case "sha512": return w(import("../cipher/hash/sha512"));
    case "md5": return w(import("../cipher/hash/md5"));
    case "hmac": return w(import("../cipher/hash/hmac"));
    case "cmac": return w(import("../cipher/hash/cmac"));
    case "bcrypt": return w(import("../cipher/hash/bcrypt"));
    case "xxhash": return w(import("../cipher/hash/xxhash"));
    case "sha3": return w(import("../cipher/hash/sha3"));
    case "ripemd160": return w(import("../cipher/hash/ripemd160"));
    case "blake2b": return w(import("../cipher/hash/blake2b"));
    case "blake3": return w(import("../cipher/hash/blake3"));
    case "poly1305": return w(import("../cipher/hash/poly1305"));
    case "sha1": return w(import("../cipher/hash/sha1"));
    case "hkdf": return w(import("../cipher/hash/hkdf"));
    case "blake2s": return w(import("../cipher/hash/blake2s"));
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
    case "rc4": return w(import("../cipher/symmetric/rc4"));
    case "salsa20": return w(import("../cipher/symmetric/salsa20"));
    case "skipjack": return w(import("../cipher/symmetric/skipjack"));
    case "chacha20": return w(import("../cipher/symmetric/chacha20"));
    case "rc5": return w(import("../cipher/symmetric/rc5"));
    case "xtea": return w(import("../cipher/symmetric/xtea"));
    case "rc6": {
      const mod = await import("../cipher/symmetric/rc6");
      return { encrypt: mod.encryptRc6Block, decrypt: mod.decryptRc6Block };
    }
    case "camellia": return w(import("../cipher/symmetric/camellia"));
    case "idea": return w(import("../cipher/symmetric/idea"));
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
          "INVALID_WORKER_MESSAGE" as any,
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

const traceSteps = result.steps ?? [];
const useTransfer = traceSteps.length >= WORKER_STEP_TRANSFER_THRESHOLD;

let stepsBuffer: ArrayBuffer | undefined;
if (useTransfer) {
  const encoded = encodeCipherSteps(traceSteps);
  stepsBuffer = encoded.buffer as ArrayBuffer;
}

const response: WorkerResponse = {
  requestId,
  success: true,
  payload: {
    result: useTransfer ? { ...result, steps: [] } : result,
    ...(stepsBuffer ? { stepsBuffer } : {}),
  },
  timings: { durationMs },
};

if (stepsBuffer) {
  workerScope.postMessage(response, [stepsBuffer]);
} else {
  workerScope.postMessage(response);
}    } catch (error: unknown) {
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
      if (requestId !== "unknown") {
        clearJobCancellation(requestId);
      }
    }
  },
);
