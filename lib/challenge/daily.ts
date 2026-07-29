import type { CipherName } from '../cipher/types';
import type { ChallengeData } from './generator';

const DAILY_WORDS = [
  'CRYPTOGRAPHY', 'SECURITY', 'ALGORITHM', 'ENCRYPTION', 'DECRYPTION',
  'NETWORK', 'INTERNET', 'PRIVACY', 'AUTHENTICATION', 'SIGNATURE',
  'MESSAGE', 'CIPHERTEXT', 'PLAINTEXT', 'SECRECY', 'COMMUNICATION',
  'HANDSHAKE', 'INTEGRITY', 'CONFIDENTIALITY', 'NONREPUDIATION', 'PROTOCOL'
];

const DAILY_CIPHERS: CipherName[] = ['caesar', 'vigenere', 'railfence'];

// Mulberry32 PRNG
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Simple string hash to generate an initial seed
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function pickRandom<T>(arr: T[], prng: () => number): T {
  return arr[Math.floor(prng() * arr.length)];
}

function keyForCipher(cipherId: CipherName, wordPool: string[], prng: () => number): string {
  switch (cipherId) {
    case 'caesar':
      return Math.floor(prng() * 25 + 1).toString();
    case 'railfence':
      return Math.floor(prng() * 3 + 2).toString(); // 2-4 rails
    case 'vigenere':
      return pickRandom(wordPool, prng);
    default:
      return '';
  }
}

export interface DailyQuizData extends ChallengeData {
  options: string[];
}

export function generateDailyQuiz(dateString: string): DailyQuizData {
  const seed = hashString(dateString);
  const prng = mulberry32(seed);

  const cipherId = pickRandom(DAILY_CIPHERS, prng);
  const plaintext = pickRandom(DAILY_WORDS, prng);
  const key = keyForCipher(cipherId, DAILY_WORDS, prng);

  // Generate 3 unique wrong answers
  const optionsSet = new Set<string>();
  optionsSet.add(plaintext);
  
  while (optionsSet.size < 4) {
    optionsSet.add(pickRandom(DAILY_WORDS, prng));
  }

  // Shuffle options
  const options = Array.from(optionsSet);
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  // Provide a generic hint or extract from generator if we imported getHints
  // Since getHints is not exported, we provide a generic fallback or duplicate it.
  const hints = ['Focus on the encryption rules for this cipher and try to work backwards from the ciphertext.'];

  return {
    cipherId,
    type: 'encrypt',
    plaintext,
    key,
    difficulty: 'medium',
    hints,
    options
  };
}

// Storage Helpers
export interface DailyQuizState {
  lastCompletedDate: string;
  currentStreak: number;
  bestStreak: number;
}

const STORAGE_KEY = 'cryptoviz_daily_quiz_state';

export function getDailyQuizState(): DailyQuizState {
  if (typeof window === 'undefined') {
    return { lastCompletedDate: '', currentStreak: 0, bestStreak: 0 };
  }
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // Ignore storage errors
  }
  return { lastCompletedDate: '', currentStreak: 0, bestStreak: 0 };
}

export function saveDailyQuizState(state: DailyQuizState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function calculateNewStreak(todayString: string, state: DailyQuizState): DailyQuizState {
  if (state.lastCompletedDate === todayString) {
    return state; // Already completed today
  }

  const today = new Date(todayString + 'T00:00:00');
  const last = new Date(state.lastCompletedDate + 'T00:00:00');
  
  let newStreak = 1;
  
  if (!isNaN(last.getTime())) {
    const diffTime = Math.abs(today.getTime() - last.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays === 1) {
      newStreak = state.currentStreak + 1;
    }
  }

  return {
    lastCompletedDate: todayString,
    currentStreak: newStreak,
    bestStreak: Math.max(newStreak, state.bestStreak)
  };
}
