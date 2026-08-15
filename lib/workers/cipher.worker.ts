/**
 * Cipher Web Worker.
 *
 * Dispatch is registry-driven. Adding a conventional cipher module requires
 * only its entry in CIPHER_REGISTRY; this worker does not contain cipher cases.
 */

import { encrypt as atbashEncrypt, decrypt as atbashDecrypt } from "../cipher/classical/atbash";
import { encrypt as autokeyEncrypt, decrypt as autokeyDecrypt } from "../cipher/classical/autokey";
import { encrypt as adfgvxEncrypt, decrypt as adfgvxDecrypt } from "../cipher/classical/adfgvx";
import { encrypt as beaufortEncrypt, decrypt as beaufortDecrypt } from "../cipher/classical/beaufort";
import { encrypt as bifidEncrypt, decrypt as bifidDecrypt } from "../cipher/classical/bifid";
import { encrypt as caesarEncrypt, decrypt as caesarDecrypt } from "../cipher/classical/caesar";
import { encrypt as columnarEncrypt, decrypt as columnarDecrypt } from "../cipher/classical/columnar-transposition";
import { encrypt as fourSquareEncrypt, decrypt as fourSquareDecrypt } from "../cipher/classical/four-square";
import { encrypt as hillEncrypt, decrypt as hillDecrypt } from "../cipher/classical/hill";
import { encrypt as nihilistEncrypt, decrypt as nihilistDecrypt } from "../cipher/classical/nihilist";
import { encrypt as playfairEncrypt, decrypt as playfairDecrypt } from "../cipher/classical/playfair";
import { encrypt as polybiusEncrypt, decrypt as polybiusDecrypt } from "../cipher/classical/polybius";
import { encrypt as portaEncrypt, decrypt as portaDecrypt } from "../cipher/classical/porta";
import { encrypt as railfenceEncrypt, decrypt as railfenceDecrypt } from "../cipher/classical/railfence";
import { encrypt as rot13Encrypt, decrypt as rot13Decrypt } from "../cipher/classical/rot13";
import { encrypt as vigenereEncrypt, decrypt as vigenereDecrypt } from "../cipher/classical/vigenere";
import { encrypt as bcryptEncrypt, decrypt as bcryptDecrypt } from "../cipher/hash/bcrypt";
import { encrypt as blake2bEncrypt, decrypt as blake2bDecrypt } from "../cipher/hash/blake2b";
import { encrypt as blake3Encrypt, decrypt as blake3Decrypt } from "../cipher/hash/blake3";
import { encrypt as hmacEncrypt, decrypt as hmacDecrypt } from "../cipher/hash/hmac";
import { encrypt as cmacEncrypt, decrypt as cmacDecrypt } from '../cipher/hash/cmac'
import { encrypt as hkdfEncrypt, decrypt as hkdfDecrypt } from "../cipher/hash/hkdf";
import { encrypt as blake2sEncrypt, decrypt as blake2sDecrypt } from '../cipher/hash/blake2s';
import { encryptSha224, encryptSha384, decrypt as sha2TruncDecrypt } from '../cipher/hash/sha2-truncated'
import { encryptShake128, encryptShake256, decrypt as shakeDecrypt } from '../cipher/hash/shake';
import { encrypt as md4Encrypt, decrypt as md4Decrypt } from '../cipher/hash/md4'
import { encrypt as md5Encrypt, decrypt as md5Decrypt } from "../cipher/hash/md5";
import { encrypt as poly1305Encrypt, decrypt as poly1305Decrypt } from "../cipher/hash/poly1305";
import { encrypt as ripemd160Encrypt, decrypt as ripemd160Decrypt } from "../cipher/hash/ripemd160";
import { encrypt as sha1Encrypt, decrypt as sha1Decrypt } from "../cipher/hash/sha1";
import { encrypt as sha256Encrypt, decrypt as sha256Decrypt } from "../cipher/hash/sha256";
import { encrypt as sm3Encrypt, decrypt as sm3Decrypt } from "../cipher/hash/sm3";
import { encrypt as sha3Encrypt, decrypt as sha3Decrypt } from "../cipher/hash/sha3";
import { encrypt as sha512Encrypt, decrypt as sha512Decrypt } from "../cipher/hash/sha512";
import { encrypt as xxhashEncrypt, decrypt as xxhashDecrypt } from "../cipher/hash/xxhash";
import { encrypt as dsaEncrypt, decrypt as dsaDecrypt } from '../cipher/asymmetric/dsa'
import { encrypt as dhEncrypt, decrypt as dhDecrypt } from "../cipher/asymmetric/dh";
import { encrypt as x448Encrypt, decrypt as x448Decrypt } from '../cipher/asymmetric/x448'
import { encrypt as eccEncrypt, decrypt as eccDecrypt } from "../cipher/asymmetric/ecc";
import { encrypt as schnorrEncrypt, decrypt as schnorrDecrypt } from '../cipher/asymmetric/schnorr';
import { encrypt as elgamalSigEncrypt, decrypt as elgamalSigDecrypt } from '../cipher/asymmetric/elgamal-signature';
import { encrypt as mlDsaEncrypt, decrypt as mlDsaDecrypt } from '../cipher/asymmetric/ml-dsa';
import { encrypt as eciesEncrypt, decrypt as eciesDecrypt } from '../cipher/asymmetric/ecies';
import { encrypt as mlKemEncapsulate, decrypt as mlKemDecapsulate } from '../cipher/asymmetric/ml-kem';
import { encrypt as ecdsaEncrypt, decrypt as ecdsaDecrypt } from "../cipher/asymmetric/ecdsa";
import { encrypt as ed448Encrypt, decrypt as ed448Decrypt } from '../cipher/asymmetric/ed448';
import { encrypt as shamirSplit, decrypt as shamirCombine } from '../cipher/asymmetric/shamir-secret-sharing';
import { encrypt as ed25519Encrypt, decrypt as ed25519Decrypt } from "../cipher/asymmetric/ed25519";
import { encrypt as elgamalEncrypt, decrypt as elgamalDecrypt } from "../cipher/asymmetric/elgamal";
import { encrypt as merkleHellmanEncrypt, decrypt as merkleHellmanDecrypt } from "../cipher/asymmetric/merkle-hellman";
import { encrypt as paillierEncrypt, decrypt as paillierDecrypt } from "../cipher/asymmetric/paillier";
import { encrypt as rabinEncrypt, decrypt as rabinDecrypt } from "../cipher/asymmetric/rabin";
import { encrypt as rsaEncrypt, decrypt as rsaDecrypt } from "../cipher/asymmetric/rsa";
import { encrypt as x25519Encrypt, decrypt as x25519Decrypt } from "../cipher/asymmetric/x25519";
import { encrypt as aesXtsEncrypt, decrypt as aesXtsDecrypt } from '../cipher/symmetric/aes-xts';
import { encrypt as aesEncrypt, decrypt as aesDecrypt } from "../cipher/symmetric/aes";
import { encrypt as aesGcmEncrypt, decrypt as aesGcmDecrypt } from "../cipher/symmetric/aes-gcm";
import { encrypt as camelliaEncrypt, decrypt as camelliaDecrypt } from "../cipher/symmetric/camellia";
import { encrypt as chachaPolyEncrypt, decrypt as chachaPolyDecrypt } from '../cipher/symmetric/chacha20-poly1305';
import { encrypt as speckEncrypt, decrypt as speckDecrypt } from '../cipher/symmetric/speck';
import { encrypt as aesCcmEncrypt, decrypt as aesCcmDecrypt } from '../cipher/symmetric/aes-ccm';
import { encrypt as threefishEncrypt, decrypt as threefishDecrypt } from '../cipher/symmetric/threefish';
import { encrypt as xchacha20Encrypt, decrypt as xchacha20Decrypt } from '../cipher/symmetric/xchacha20'
import { encrypt as gostEncrypt, decrypt as gostDecrypt } from '../cipher/symmetric/gost';
import { encrypt as enigmaEncrypt, decrypt as enigmaDecrypt } from '../cipher/symmetric/enigma';
import { encrypt as xsalsa20Encrypt, decrypt as xsalsa20Decrypt } from '../cipher/symmetric/xsalsa20'
import { encrypt as teaEncrypt, decrypt as teaDecrypt } from '../cipher/symmetric/tea';
import { encrypt as serpentEncrypt, decrypt as serpentDecrypt } from '../cipher/symmetric/serpent';
import { encrypt as chacha20Encrypt, decrypt as chacha20Decrypt } from "../cipher/symmetric/chacha20";
import { encrypt as desEncrypt, decrypt as desDecrypt } from "../cipher/symmetric/des";
import { encrypt as des3Encrypt, decrypt as des3Decrypt } from "../cipher/symmetric/3des";
import { encrypt as ideaEncrypt, decrypt as ideaDecrypt } from "../cipher/symmetric/idea";
import { encrypt as otpEncrypt, decrypt as otpDecrypt } from "../cipher/symmetric/otp";
import { encrypt as rc4Encrypt, decrypt as rc4Decrypt } from "../cipher/symmetric/rc4";
import { encrypt as rc5Encrypt, decrypt as rc5Decrypt } from "../cipher/symmetric/rc5";
import { encrypt as rc6Encrypt, decrypt as rc6Decrypt } from "../cipher/symmetric/rc6";
import { encrypt as salsa20Encrypt, decrypt as salsa20Decrypt } from "../cipher/symmetric/salsa20";
import { encrypt as skipjackEncrypt, decrypt as skipjackDecrypt } from "../cipher/symmetric/skipjack";
import { encrypt as xorEncrypt, decrypt as xorDecrypt } from "../cipher/symmetric/xor";
import { encrypt as xteaEncrypt, decrypt as xteaDecrypt } from "../cipher/symmetric/xtea";
import { deriveKey } from "../kdf/pbkdf2";
import { deriveScryptKey } from "../kdf/scrypt";
import { CipherError } from "../utils/errors";
import type { WorkerRequest, WorkerResponse } from "../../types/worker";
import type { CipherResult } from "../cipher/types";
import { getDispatcher } from "./cipherDispatchRegistry";

type WorkerRequestMessage = WorkerRequest | Uint8Array;

const workerScope = self as unknown as Worker & typeof globalThis;

// State for Stream Cipher Memoization / Substring Caching
let streamCache: {
  cipherId: string;
  type: string;
  key: string;
  optionsHash: string;
  input: string;
  result: import("../cipher/types").CipherResult | null;
} = {
  cipherId: "",
  type: "",
  key: "",
  optionsHash: "",
  input: "",
  result: null
};

workerScope.addEventListener(
  "message",
  async (event: MessageEvent<WorkerRequestMessage>) => {
    const startTime = performance.now();
    let requestData: WorkerRequestMessage = event.data;

    try {
      if (requestData instanceof Uint8Array) {
        requestData = JSON.parse(
          new TextDecoder().decode(requestData),
        ) as WorkerRequest;
      }

      const { type, requestId, payload } = requestData as WorkerRequest;
      const { cipherId, input, key, options } = payload;

      const encryptMode = type === "encrypt";
      const safeOptions = options || {};

      // Memoization for supported stream ciphers
      const cacheableCiphers = ["caesar", "vigenere", "rot13", "atbash"];
      const optionsHash = JSON.stringify(safeOptions);

      if (cacheableCiphers.includes(cipherId)) {
        if (
          streamCache.cipherId === cipherId &&
          streamCache.type === type &&
          streamCache.key === key &&
          streamCache.optionsHash === optionsHash &&
          streamCache.result !== null
        ) {
          safeOptions.incrementalCache = {
            input: streamCache.input,
            result: streamCache.result
          };
        } else {
          streamCache = { cipherId, type, key, optionsHash, input: "", result: null };
        }
      } else {
        streamCache = { cipherId: "", type: "", key: "", optionsHash: "", input: "", result: null };
      }

      const dispatcher = await getDispatcher(cipherId);
      const handler = encryptMode ? dispatcher.encrypt : dispatcher.decrypt;
      const result = (await handler(input, key, safeOptions)) as import("../cipher/types").CipherResult;

      if (cacheableCiphers.includes(cipherId)) {
        streamCache.input = input;
        streamCache.result = result;
      }

      const response: WorkerResponse = {
        requestId,
        success: true,
        payload: { result },
        timings: { durationMs: performance.now() - startTime },
      };
      workerScope.postMessage(response);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode =
        error instanceof CipherError ? error.code : undefined;

      const requestId =
        typeof requestData === "object" &&
        requestData !== null &&
        "requestId" in requestData
          ? (requestData as WorkerRequest).requestId
          : "unknown";

    const requestId =
      typeof requestData === 'object' &&
      requestData !== null &&
      'requestId' in requestData
        ? (requestData as WorkerRequest).requestId
        : 'unknown'

    const response: WorkerResponse = {
      requestId,
      success: false,
      payload: {
        error: errorMessage,
        errorCode,
        errorMessage,
      },
      timings: { durationMs: performance.now() - startTime },
    }

    workerScope.postMessage(response)
  }
  },
);
