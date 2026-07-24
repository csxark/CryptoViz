/**
 * Cipher Web Worker.
 * Handles heavy cryptographic operations off the main thread.
 * @see CLAUDE.md
 */

import { encrypt as caesarEncrypt, decrypt as caesarDecrypt } from '../cipher/classical/caesar'
import { encrypt as rot13Encrypt, decrypt as rot13Decrypt } from '../cipher/classical/rot13'
import { encrypt as vigenereEncrypt, decrypt as vigenereDecrypt } from '../cipher/classical/vigenere'
import { encrypt as atbashEncrypt, decrypt as atbashDecrypt } from '../cipher/classical/atbash'
import { encrypt as playfairEncrypt, decrypt as playfairDecrypt } from '../cipher/classical/playfair'
import { encrypt as railfenceEncrypt, decrypt as railfenceDecrypt } from '../cipher/classical/railfence'
import { encrypt as beaufortEncrypt, decrypt as beaufortDecrypt } from '../cipher/classical/beaufort'
import { encrypt as hillEncrypt, decrypt as hillDecrypt } from '../cipher/classical/hill'
import { encrypt as columnarEncrypt, decrypt as columnarDecrypt } from '../cipher/classical/columnar-transposition'
import { encrypt as autokeyEncrypt, decrypt as autokeyDecrypt } from '../cipher/classical/autokey'
import { encrypt as portaEncrypt, decrypt as portaDecrypt } from '../cipher/classical/porta'
import { encrypt as adfgvxEncrypt, decrypt as adfgvxDecrypt } from '../cipher/classical/adfgvx'
import { encrypt as bifidEncrypt, decrypt as bifidDecrypt } from '../cipher/classical/bifid'
import { encrypt as foursquareEncrypt, decrypt as foursquareDecrypt } from '../cipher/classical/four-square'
import { encrypt as nihilistEncrypt, decrypt as nihilistDecrypt } from '../cipher/classical/nihilist'
import { encrypt as polybiusEncrypt, decrypt as polybiusDecrypt } from '../cipher/classical/polybius'
import { encrypt as xorEncrypt, decrypt as xorDecrypt } from '../cipher/symmetric/xor'
import { encrypt as otpEncrypt, decrypt as otpDecrypt } from '../cipher/symmetric/otp'
import { encrypt as desEncrypt, decrypt as desDecrypt } from '../cipher/symmetric/des'
import { encrypt as des3Encrypt, decrypt as des3Decrypt } from '../cipher/symmetric/3des'
import { encrypt as aesEncrypt, decrypt as aesDecrypt } from '../cipher/symmetric/aes'
import { encrypt as aesGcmEncrypt, decrypt as aesGcmDecrypt } from '../cipher/symmetric/aes-gcm'
import { encrypt as rc4Encrypt, decrypt as rc4Decrypt } from '../cipher/symmetric/rc4'
import { encrypt as salsa20Encrypt, decrypt as salsa20Decrypt } from '../cipher/symmetric/salsa20'
import { encrypt as skipjackEncrypt, decrypt as skipjackDecrypt } from '../cipher/symmetric/skipjack'
import { encrypt as chacha20Encrypt, decrypt as chacha20Decrypt } from '../cipher/symmetric/chacha20'
import { encrypt as rc5Encrypt, decrypt as rc5Decrypt } from '../cipher/symmetric/rc5'
import { encrypt as xteaEncrypt, decrypt as xteaDecrypt } from '../cipher/symmetric/xtea'
import { encrypt as ideaEncrypt, decrypt as ideaDecrypt } from '../cipher/symmetric/idea'
import { encrypt as rsaEncrypt, decrypt as rsaDecrypt } from '../cipher/asymmetric/rsa'
import { encrypt as dhEncrypt, decrypt as dhDecrypt } from '../cipher/asymmetric/dh'
import { encrypt as eccEncrypt, decrypt as eccDecrypt } from '../cipher/asymmetric/ecc'
import { encrypt as elgamalEncrypt, decrypt as elgamalDecrypt } from '../cipher/asymmetric/elgamal'
import { encrypt as ed25519Encrypt, decrypt as ed25519Decrypt } from '../cipher/asymmetric/ed25519'
import { encrypt as x25519Encrypt, decrypt as x25519Decrypt } from '../cipher/asymmetric/x25519'
import { encrypt as merkleHellmanEncrypt, decrypt as merkleHellmanDecrypt } from '../cipher/asymmetric/merkle-hellman'
import { encrypt as sha256Encrypt, decrypt as sha256Decrypt } from '../cipher/hash/sha256'
import { encrypt as sha512Encrypt, decrypt as sha512Decrypt } from '../cipher/hash/sha512'
import { encrypt as md5Encrypt, decrypt as md5Decrypt } from '../cipher/hash/md5'
import { encrypt as hmacEncrypt, decrypt as hmacDecrypt } from '../cipher/hash/hmac'
import { encrypt as bcryptEncrypt, decrypt as bcryptDecrypt } from '../cipher/hash/bcrypt'
import { encrypt as sha3Encrypt, decrypt as sha3Decrypt } from '../cipher/hash/sha3'
import { encrypt as ripemd160Encrypt, decrypt as ripemd160Decrypt } from '../cipher/hash/ripemd160'
import { encrypt as blake2bEncrypt, decrypt as blake2bDecrypt } from '../cipher/hash/blake2b'
import { encrypt as blake3Encrypt, decrypt as blake3Decrypt } from '../cipher/hash/blake3'
import { encrypt as poly1305Encrypt, decrypt as poly1305Decrypt } from '../cipher/hash/poly1305'
import { encrypt as sha1Encrypt, decrypt as sha1Decrypt } from '../cipher/hash/sha1'

import { deriveKey } from '../kdf/pbkdf2'
import { CipherError } from '../utils/errors'

import type { WorkerRequest, WorkerResponse } from '../../types/worker'

type WorkerRequestMessage = WorkerRequest | Uint8Array

const workerScope = self as unknown as Worker

workerScope.addEventListener('message', async (event: MessageEvent<WorkerRequestMessage>) => {
  const startTime = performance.now()
  let requestData: WorkerRequestMessage = event.data
  if (requestData instanceof Uint8Array) {
    const decoder = new TextDecoder()
    requestData = JSON.parse(decoder.decode(requestData)) as WorkerRequest
  }
  const { type, requestId, payload } = requestData as WorkerRequest
  const { cipherId, input, key, options } = payload

  try {
    let result: any

    const encryptMode = type === 'encrypt'

    switch (cipherId) {
      case 'caesar':
        result = encryptMode
          ? caesarEncrypt(input, key, options)
          : caesarDecrypt(input, key, options)
        break
      case 'rot13':
        result = encryptMode
          ? rot13Encrypt(input, key, options)
          : rot13Decrypt(input, key, options)
        break
      case 'vigenere':
        result = encryptMode
          ? vigenereEncrypt(input, key, options)
          : vigenereDecrypt(input, key, options)
        break
      case 'atbash':
        result = encryptMode
          ? atbashEncrypt(input, key, options)
          : atbashDecrypt(input, key, options)
        break
      case 'playfair':
        result = encryptMode
          ? playfairEncrypt(input, key, options)
          : playfairDecrypt(input, key, options)
        break
      case 'railfence':
        result = encryptMode
          ? railfenceEncrypt(input, key, options)
          : railfenceDecrypt(input, key, options)
        break
      case 'beaufort':
        result = encryptMode
          ? beaufortEncrypt(input, key, options)
          : beaufortDecrypt(input, key, options)
        break
      case 'hill':
        result = encryptMode
          ? hillEncrypt(input, key, options)
          : hillDecrypt(input, key, options)
        break
      case 'columnar-transposition':
        result = encryptMode
          ? columnarEncrypt(input, key, options)
          : columnarDecrypt(input, key, options)
        break
      case 'autokey':
        result = encryptMode
          ? autokeyEncrypt(input, key, options)
          : autokeyDecrypt(input, key, options)
        break
      case 'porta':
        result = encryptMode
          ? portaEncrypt(input, key, options)
          : portaDecrypt(input, key, options)
        break
      case 'adfgvx':
        result = encryptMode
          ? adfgvxEncrypt(input, key, options)
          : adfgvxDecrypt(input, key, options)
        break
      case 'bifid':
        result = encryptMode
          ? bifidEncrypt(input, key, options)
          : bifidDecrypt(input, key, options)
        break
      case 'foursquare':
        result = encryptMode
          ? foursquareEncrypt(input, key, options)
          : foursquareDecrypt(input, key, options)
        break
      case 'nihilist':
        result = encryptMode
          ? nihilistEncrypt(input, key, options)
          : nihilistDecrypt(input, key, options)
        break
      case 'polybius':
        result = encryptMode
          ? polybiusEncrypt(input, key, options)
          : polybiusDecrypt(input, key, options)
        break
      case 'xor':
        result = encryptMode
          ? xorEncrypt(input, key, options)
          : xorDecrypt(input, key, options)
        break
      case 'otp':
        result = encryptMode
          ? otpEncrypt(input, key, options)
          : otpDecrypt(input, key, options)
        break
      case 'des':
        result = encryptMode
          ? desEncrypt(input, key, options)
          : desDecrypt(input, key, options)
        break
      case '3des':
        result = encryptMode
          ? des3Encrypt(input, key, options)
          : des3Decrypt(input, key, options)
        break
      case 'aes':
        result = encryptMode
          ? aesEncrypt(input, key, options)
          : aesDecrypt(input, key, options)
        break
      case 'aes-gcm':
        result = encryptMode
          ? aesGcmEncrypt(input, key, options)
          : aesGcmDecrypt(input, key, options)
        break
      case 'rc4':
        result = encryptMode
          ? rc4Encrypt(input, key, options)
          : rc4Decrypt(input, key, options)
        break
      case 'salsa20':
        result = encryptMode
          ? salsa20Encrypt(input, key, options)
          : salsa20Decrypt(input, key, options)
        break
      case 'skipjack':
        result = encryptMode
          ? skipjackEncrypt(input, key, options)
          : skipjackDecrypt(input, key, options)
        break
      case 'chacha20':
        result = encryptMode
          ? chacha20Encrypt(input, key, options)
          : chacha20Decrypt(input, key, options)
        break
      case 'rc5':
        result = encryptMode
          ? rc5Encrypt(input, key, options)
          : rc5Decrypt(input, key, options)
        break
      case 'xtea':
        result = encryptMode
          ? xteaEncrypt(input, key, options)
          : xteaDecrypt(input, key, options)
        break
      case 'idea':
        result = encryptMode
          ? ideaEncrypt(input, key, options)
          : ideaDecrypt(input, key, options)
        break
      case 'rsa':
        result = encryptMode
          ? rsaEncrypt(input, key, options)
          : rsaDecrypt(input, key, options)
        break
      case 'dh':
        result = encryptMode
          ? dhEncrypt(input, key, options)
          : dhDecrypt(input, key, options)
        break
      case 'ecc':
        result = encryptMode
          ? eccEncrypt(input, key, options)
          : eccDecrypt(input, key, options)
        break
      case 'elgamal':
        result = encryptMode
          ? elgamalEncrypt(input, key, options)
          : elgamalDecrypt(input, key, options)
        break
      case 'ed25519':
        result = encryptMode
          ? ed25519Encrypt(input, key, options)
          : ed25519Decrypt(input, key, options)
        break
      case 'x25519':
        result = encryptMode
          ? x25519Encrypt(input, key, options)
          : x25519Decrypt(input, key, options)
        break
      case 'merkle-hellman':
        result = encryptMode
          ? merkleHellmanEncrypt(input, key, options)
          : merkleHellmanDecrypt(input, key, options)
        break
      case 'sha256':
        result = encryptMode
          ? sha256Encrypt(input, key, options)
          : sha256Decrypt(input, key, options)
        break
      case 'sha512':
        result = encryptMode
          ? sha512Encrypt(input, key, options)
          : sha512Decrypt(input, key, options)
        break
      case 'md5':
        result = encryptMode
          ? md5Encrypt(input, key, options)
          : md5Decrypt(input, key, options)
        break
      case 'hmac':
        result = encryptMode
          ? hmacEncrypt(input, key, options)
          : hmacDecrypt(input, key, options)
        break
      case 'bcrypt':
        result = encryptMode
          ? bcryptEncrypt(input, key, options)
          : bcryptDecrypt(input, key, options)
        break
      case 'sha3':
        result = encryptMode
          ? sha3Encrypt(input, key, options)
          : sha3Decrypt()
        break
      case 'ripemd160':
        result = encryptMode
          ? ripemd160Encrypt(input, key, options)
          : ripemd160Decrypt()
        break
      case 'blake2b':
        result = encryptMode
          ? blake2bEncrypt(input, key, options)
          : blake2bDecrypt()
        break
      case 'blake3':
        result = encryptMode
          ? blake3Encrypt(input, key, options)
          : blake3Decrypt(input, key, options)
        break
      case 'poly1305':
        result = encryptMode
          ? poly1305Encrypt(input, key, options)
          : poly1305Decrypt()
        break
      case 'sha1':
        result = encryptMode
          ? sha1Encrypt(input, key, options)
          : sha1Decrypt()
        break
      case 'pbkdf2':
        // KDF derivation doesn't fit the encrypt/decrypt(input, key, options)
        // shape everything else uses — password arrives as `input`, KDF
        // params are packed into `options` since they aren't a cipher key.
        result = await deriveKey(input, {
          iterations: options.iterations,
          hash: options.hash,
          keyLength: options.keyLength,
          salt: options.salt,
        })
        break
      default:
        throw new Error(`Unsupported cipher ID: ${cipherId}`)
    }

    // Some cipher implementations (e.g. RSA real mode via WebCrypto) are async
    // and return a Promise; awaiting a plain value is a no-op for the rest.
    result = await result

    const durationMs = performance.now() - startTime
    const response: WorkerResponse = {
      requestId,
      success: true,
      payload: { result },
      timings: { durationMs },
    }
    workerScope.postMessage(response)
  } catch (error: unknown) {
    const durationMs = performance.now() - startTime

    // If cipher code throws CipherError, preserve its stable error code.
    let errorCode: import('@/lib/utils/errors').CipherErrorCode | undefined
    let errorMessage: string

    if (error instanceof Error) {
      errorMessage = error.message
    } else {
      errorMessage = String(error)
    }

    if (error instanceof CipherError) {
      errorCode = error.code
      errorMessage = error.message
    }

    const response: WorkerResponse = {
      requestId,
      success: false,
      payload: {
        error: errorMessage, // legacy
        errorCode,
        errorMessage,
      },
      timings: { durationMs },
    }
    workerScope.postMessage(response)
  }
})

