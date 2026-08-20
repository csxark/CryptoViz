import type { CipherName } from '../cipher/types';
import { QUESTION_BANK, type CipherCategory, type QuizQuestion } from './questionBank';

export type ChallengeType = 'encrypt' | 'decrypt';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export interface ChallengeData {
  cipherId: CipherName;
  type: ChallengeType;
  plaintext: string;
  key: string;
  difficulty: ChallengeDifficulty;
  hints: string[];
  /** Custom challenge payload fields; omitted for generated sessions. */
  ciphertext?: string
  answerHash?: string
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

const HINTS: Partial<Record<CipherName, string[]>> = {
  atbash: ['Atbash mirrors the alphabet: A becomes Z, B becomes Y, and so on. No key needed.'],
  rot13: ['ROT13 always shifts by exactly 13 — applying it twice returns the original text.'],
  caesar: ['Count the repeated shift pattern — try each of the 25 possible shifts.'],
  vigenere: ['The key repeats cyclically across the message — look for repeating ciphertext patterns.'],
  railfence: ['Picture the letters zigzagging across rows equal to the key number, then read them back off.'],
  playfair: ['Letters are encrypted in pairs using a 5x5 grid built from the keyword.'],
};

function getHints(cipherId: CipherName): string[] {
  const hints = HINTS[cipherId];
  if (hints && hints.length > 0) {
    return hints;
  }
  return [
    `Try recalling the core encryption rule for this cipher — break the message down character by character.`,
    `Visit the cipher's dedicated page to step through encryption and see the intermediate state at each stage.`,
  ];
}

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
  const hints = getHints(cipherId);

  return {
    cipherId,
    type: 'encrypt',
    plaintext,
    key,
    difficulty,
    hints,
  };
}

// Question Bank Utility Functions
export function getFilteredQuestionBank(
  category: CipherCategory | 'all' = 'all',
  difficulty: ChallengeDifficulty | 'all' = 'all'
): QuizQuestion[] {
  return QUESTION_BANK.filter((q) => {
    if (category !== 'all' && q.category !== category) return false;
    if (difficulty !== 'all' && q.difficulty !== difficulty) return false;
    return true;
  });
}

export function getQuestionBankStats() {
  const total = QUESTION_BANK.length;
  const categories: Record<CipherCategory, number> = {
    classical: 0,
    symmetric: 0,
    asymmetric: 0,
    hash: 0,
    attacks: 0,
  };
  const difficulties: Record<ChallengeDifficulty, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
  };

  QUESTION_BANK.forEach((q) => {
    categories[q.category] = (categories[q.category] || 0) + 1;
    difficulties[q.difficulty] = (difficulties[q.difficulty] || 0) + 1;
  });

  return {
    total,
    categories,
    difficulties,
  };
}
