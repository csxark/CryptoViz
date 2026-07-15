import type { CipherName } from '../cipher/types';

export type ChallengeType = 'encrypt' | 'decrypt';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export interface ChallengeData {
  cipherId: CipherName;
  type: ChallengeType;
  plaintext: string;
  key: string;
  difficulty: ChallengeDifficulty;
  hints: string[];
}

const SHORT_WORDS = [
  'CODE', 'LOCK', 'SAFE', 'HASH', 'BYTE', 'DATA', 'KEYS', 'KYE',
];

const WORDS = [
  'CRYPTOGRAPHY', 'SECURITY', 'ALGORITHM', 'ENCRYPTION', 'DECRYPTION',
  'NETWORK', 'INTERNET', 'PRIVACY', 'AUTHENTICATION', 'SIGNATURE',
  'MESSAGE', 'CIPHERTEXT', 'PLAINTEXT', 'SECRECY', 'COMMUNICATION',
];

const PHRASES = [
  'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG',
  'ATTACK AT DAWN BEFORE THE ENEMY WAKES UP',
  'MEET ME AT THE OLD BRIDGE WHEN THE MOON RISES',
  'KEEP THIS MESSAGE SAFE FROM PRYING EYES TODAY',
];

const HINTS: Record<CipherName, string[]> = {
  atbash: ['Atbash mirrors the alphabet: A becomes Z, B becomes Y, and so on. No key needed.'],
  rot13: ['ROT13 always shifts by exactly 13 — applying it twice returns the original text.'],
  caesar: ['Count the repeated shift pattern — try each of the 25 possible shifts.'],
  vigenere: ['The key repeats cyclically across the message — look for repeating ciphertext patterns.'],
  railfence: ['Picture the letters zigzagging across rows equal to the key number, then read them back off.'],
  playfair: ['Letters are encrypted in pairs using a 5x5 grid built from the keyword.'],
} as unknown as Record<CipherName, string[]>;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function keyForCipher(cipherId: CipherName, wordPool: string[]): string {
  switch (cipherId) {
    case 'caesar':
      return Math.floor(Math.random() * 25 + 1).toString();
    case 'railfence':
      return Math.floor(Math.random() * 3 + 2).toString(); // 2-4 rails
    case 'atbash':
    case 'rot13':
      return '';
    case 'vigenere':
    case 'playfair':
    default:
      return pick(wordPool);
  }
}

export function generateChallengeData(
  difficulty: ChallengeDifficulty = 'medium'
): ChallengeData {
  let allowedCiphers: CipherName[];
  let wordPool: string[];

  switch (difficulty) {
    case 'easy':
      allowedCiphers = ['atbash', 'rot13', 'caesar'];
      wordPool = SHORT_WORDS;
      break;
    case 'hard':
      allowedCiphers = ['vigenere', 'railfence', 'playfair'];
      wordPool = PHRASES;
      break;
    case 'medium':
    default:
      allowedCiphers = ['caesar', 'vigenere', 'railfence'];
      wordPool = WORDS;
      break;
  }

  const cipherId = pick(allowedCiphers);
  const plaintext = pick(wordPool);
  const key = keyForCipher(cipherId, wordPool);
  const hints = HINTS[cipherId] ?? [];

  return {
    cipherId,
    type: 'encrypt',
    plaintext,
    key,
    difficulty,
    hints,
  };
}
