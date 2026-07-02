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
import { encrypt as xorEncrypt, decrypt as xorDecrypt } from '../cipher/symmetric/xor'
import { encrypt as otpEncrypt, decrypt as otpDecrypt } from '../cipher/symmetric/otp'
import { encrypt as desEncrypt, decrypt as desDecrypt } from '../cipher/symmetric/des'
import { encrypt as des3Encrypt, decrypt as des3Decrypt } from '../cipher/symmetric/3des'
import { encrypt as aesEncrypt, decrypt as aesDecrypt } from '../cipher/symmetric/aes'
import { encrypt as rsaEncrypt, decrypt as rsaDecrypt } from '../cipher/asymmetric/rsa'
import { encrypt as dhEncrypt, decrypt as dhDecrypt } from '../cipher/asymmetric/dh'
import { encrypt as eccEncrypt, decrypt as eccDecrypt } from '../cipher/asymmetric/ecc'
import { encrypt as sha256Encrypt, decrypt as sha256Decrypt } from '../cipher/hash/sha256'
import { encrypt as sha512Encrypt, decrypt as sha512Decrypt } from '../cipher/hash/sha512'
import { encrypt as md5Encrypt, decrypt as md5Decrypt } from '../cipher/hash/md5'
import { encrypt as hmacEncrypt, decrypt as hmacDecrypt } from '../cipher/hash/hmac'
import { encrypt as bcryptEncrypt, decrypt as bcryptDecrypt } from '../cipher/hash/bcrypt'


interface WorkerRequest {
  id: string
  action: 'encrypt' | 'decrypt' | 'benchmark'
  iterations?: number
  cipherId: string
  input: string
  key: string
  options?: any
}

interface WorkerResponse {
  id: string
  success: boolean
  result?: any
  error?: string
}

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const {
  id,
  action,
  cipherId,
  input,
  key,
  options,
  iterations = 100,
} = event.data

  try {
    let result: any

    if (action === "benchmark") {
  const benchmarkStart = performance.now();

  for (let i = 0; i < iterations; i++) {
    switch (cipherId) {
      case "caesar":
        caesarEncrypt(input, key, options);
        break;
      case "rot13":
        rot13Encrypt(input, key, options);
        break;
      case "vigenere":
        vigenereEncrypt(input, key, options);
        break;
      case "atbash":
        atbashEncrypt(input, key, options);
        break;
      case "playfair":
        playfairEncrypt(input, key, options);
        break;
      case "railfence":
        railfenceEncrypt(input, key, options);
        break;
      case "xor":
        xorEncrypt(input, key, options);
        break;
      case "otp":
        otpEncrypt(input, key, options);
        break;
      case "des":
        desEncrypt(input, key, options);
        break;
      case "3des":
        des3Encrypt(input, key, options);
        break;
      case "aes":
        aesEncrypt(input, key, options);
        break;
      case "rsa":
        rsaEncrypt(input, key, options);
        break;
      case "dh":
        dhEncrypt(input, key, options);
        break;
      case "ecc":
        eccEncrypt(input, key, options);
        break;
      case "sha256":
        sha256Encrypt(input, key, options);
        break;
      case "sha512":
        sha512Encrypt(input, key, options);
        break;
      case "md5":
        md5Encrypt(input, key, options);
        break;
      case "hmac":
        hmacEncrypt(input, key, options);
        break;
      case "bcrypt":
        bcryptEncrypt(input, key, options);
        break;
      default:
        throw new Error(`Unsupported cipher ID: ${cipherId}`);
    }
  }

  const benchmarkEnd = performance.now();

  self.postMessage({
    id,
    success: true,
    result: {
      totalTime: benchmarkEnd - benchmarkStart,
      averageTime: (benchmarkEnd - benchmarkStart) / iterations,
      iterations,
    },
  });

  return;
}

    const encryptMode = action === 'encrypt'

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
      default:
        throw new Error(`Unsupported cipher ID: ${cipherId}`)
    }

    self.postMessage({
      id,
      success: true,
      result,
    })
  } catch (error: any) {
    self.postMessage({
      id,
      success: false,
      error: error?.message || String(error),
    })
  }
})
