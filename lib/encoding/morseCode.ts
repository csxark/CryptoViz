/**
 * Morse Code Encoder/Decoder — ITU-standard International Morse Code.
 *
 * Provides:
 *  - Full A-Z, 0-9, and punctuation mappings
 *  - Encode (text → morse) and decode (morse → text) functions
 *  - Signal waveform data generation for visual rendering
 *  - Timing analysis for dot/dash/space durations
 *  - International support (French accents stripped, etc.)
 *
 * @see https://www.itu.int/en/ITU-T/studygroups/2010-2016/20/Pages/default.aspx
 */

// ─── ITU Morse Code Table ────────────────────────────────────────────────────

/** Standard Morse code mapping: character → dot/dash sequence. */
export const MORSE_TABLE: Readonly<Record<string, string>> = {
  // Letters
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",

  // Digits
  0: "-----",
  1: ".----",
  2: "..---",
  3: "...--",
  4: "....-",
  5: ".....",
  6: "-....",
  7: "--...",
  8: "---..",
  9: "----.",

  // Punctuation
  ".": ".-.-.-",
  ",": "--..--",
  "?": "..--..",
  "'": ".----.",
  "!": "-.-.--",
  "/": "-..-.",
  "(": "-.--.",
  ")": "-.--.-",
  "&": ".-...",
  ":": "---...",
  ";": "-.-.-.",
  "=": "-...-",
  "+": ".-.-.",
  "-": "-....-",
  "_": "..--.-",
  '"': ".-..-.",
  "$": "...-..-",
  "@": ".--.-.",
  " ": "/",
}

/** Reverse mapping: dot/dash sequence → character. */
const REVERSE_MORSE_TABLE: Record<string, string> = {}
for (const [char, code] of Object.entries(MORSE_TABLE)) {
  REVERSE_MORSE_TABLE[code] = char === " " ? " " : char
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type SignalElement =
  | { type: "dot"; duration: number }
  | { type: "dash"; duration: number }
  | { type: "intra-char"; duration: number }   // gap between dots/dashes in a character
  | { type: "inter-char"; duration: number }   // gap between characters (3 units)
  | { type: "word"; duration: number }         // gap between words (7 units)

export interface MorseCharacter {
  /** Original character */
  char: string
  /** Morse code sequence (e.g. ".-") */
  code: string
  /** Signal elements for this character */
  elements: SignalElement[]
}

export interface MorseResult {
  /** Original input text */
  input: string
  /** Encoded Morse string (dot-dash format with spaces) */
  morse: string
  /** Decoded text (when decoding from morse) */
  decoded: string
  /** Per-character breakdown */
  characters: MorseCharacter[]
  /** Total signal elements */
  totalElements: number
  /** Total dot-equivalent units of time */
  totalUnits: number
  /** Estimated duration at 20 WPM (words per minute) */
  estimatedDurationMs: number
}

export interface WaveformData {
  /** Time positions (in dot-units) where signal goes HIGH */
  highRanges: [number, number][]
  /** Total duration in dot-units */
  totalDuration: number
  /** Per-character timing breakdown */
  charTimings: {
    char: string
    startUnit: number
    endUnit: number
    code: string
  }[]
}

// ─── Encoding ────────────────────────────────────────────────────────────────

/** Standard Morse timing (in dot-units). */
const DOT_DURATION = 1
const DASH_DURATION = 3
const INTRA_CHAR_GAP = 1
const INTER_CHAR_GAP = 3
const WORD_GAP = 7

/** Characters that need accent stripping for Morse encoding. */
const ACCENT_MAP: Record<string, string> = {
  À: "A", Á: "A", Â: "A", Ã: "A", Ä: "A", Å: "A",
  È: "E", É: "E", Ê: "E", Ë: "E",
  Ì: "I", Í: "I", Î: "I", Ï: "I",
  Ò: "O", Ó: "O", Ô: "O", Õ: "O", Ö: "O",
  Ù: "U", Ú: "U", Û: "U", Ü: "U",
  Ñ: "N", Ç: "C",
  ß: "SS",
}

/**
 * Strip accents from text for Morse encoding.
 */
export function stripAccents(text: string): string {
  let result = ""
  for (const ch of text) {
    result += ACCENT_MAP[ch] || ch
  }
  return result
}

/**
 * Check if a character is valid for Morse encoding.
 */
export function isMorseChar(ch: string): boolean {
  return ch.toUpperCase() in MORSE_TABLE
}

/**
 * Encode text to Morse code.
 */
export function encodeMorse(input: string): MorseResult {
  const normalized = stripAccents(input).toUpperCase()
  const characters: MorseCharacter[] = []
  let morseStr = ""
  let totalUnits = 0

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i]
    const code = MORSE_TABLE[ch] || ""

    if (code === "") continue // Skip unknown characters

    const elements: SignalElement[] = []

    // Build signal elements for this character
    for (let j = 0; j < code.length; j++) {
      const symbol = code[j]
      if (symbol === ".") {
        elements.push({ type: "dot", duration: DOT_DURATION })
      } else if (symbol === "-") {
        elements.push({ type: "dash", duration: DASH_DURATION })
      }

      // Add intra-character gap (except after last symbol)
      if (j < code.length - 1) {
        elements.push({ type: "intra-char", duration: INTRA_CHAR_GAP })
        totalUnits += INTRA_CHAR_GAP
      }
    }

    characters.push({ char: ch, code, elements })
    morseStr += code

    // Calculate character duration
    for (const el of elements) {
      totalUnits += el.duration
    }

    // Add inter-character or word gap
    if (ch === " ") {
      // Word gap (7 units total, minus 3 for inter-char)
      totalUnits += WORD_GAP - INTER_CHAR_GAP
      morseStr += " / "
    } else if (i < normalized.length - 1 && normalized[i + 1] !== " ") {
      totalUnits += INTER_CHAR_GAP
      morseStr += " "
    }
  }

  // Format Morse string
  const formattedMorse = characters
    .map((c) => (c.char === " " ? "/" : c.code))
    .join(" ")

  return {
    input,
    morse: formattedMorse,
    decoded: "",
    characters,
    totalElements: characters.reduce((sum, c) => sum + c.elements.length, 0),
    totalUnits,
    estimatedDurationMs: Math.round((totalUnits / 50) * 1000), // 50 dot-units per second at 20 WPM
  }
}

// ─── Decoding ────────────────────────────────────────────────────────────────

/**
 * Decode Morse code to text.
 * Accepts both "/" and "|" as word separators.
 */
export function decodeMorse(input: string): MorseResult {
  const normalized = input.trim()
  // Split by word separators first, then by character separators
  const words = normalized.split(/\s*\/\s*|\s*\|\s*/)
  const decodedChars: string[] = []
  const characters: MorseCharacter[] = []

  for (const word of words) {
    const letterCodes = word.trim().split(/\s+/)
    for (const code of letterCodes) {
      if (code === "") continue
      const char = REVERSE_MORSE_TABLE[code] || "?"
      decodedChars.push(char)
      characters.push({
        char,
        code,
        elements: [],
      })
    }
    decodedChars.push(" ")
  }

  // Remove trailing space
  if (decodedChars[decodedChars.length - 1] === " ") {
    decodedChars.pop()
  }

  const decoded = decodedChars.join("")
  const totalUnits = decoded.length * 5 // rough estimate

  return {
    input,
    morse: normalized,
    decoded,
    characters,
    totalElements: characters.length,
    totalUnits,
    estimatedDurationMs: Math.round((totalUnits / 50) * 1000),
  }
}

// ─── Waveform Generation ─────────────────────────────────────────────────────

/**
 * Generate waveform data for visual rendering of Morse signal.
 * Each dot = 1 unit, dash = 3 units, intra-char gap = 1 unit,
 * inter-char gap = 3 units, word gap = 7 units.
 */
export function generateWaveform(input: string): WaveformData {
  const result = encodeMorse(input)
  const highRanges: [number, number][] = []
  const charTimings: WaveformData["charTimings"] = []
  let currentTime = 0

  for (const mc of result.characters) {
    const startUnit = currentTime

    if (mc.char === " ") {
      // Word gap
      currentTime += WORD_GAP
      continue
    }

    for (let j = 0; j < mc.code.length; j++) {
      const symbol = mc.code[j]
      if (symbol === ".") {
        highRanges.push([currentTime, currentTime + DOT_DURATION])
        currentTime += DOT_DURATION
      } else if (symbol === "-") {
        highRanges.push([currentTime, currentTime + DASH_DURATION])
        currentTime += DASH_DURATION
      }

      // Intra-character gap
      if (j < mc.code.length - 1) {
        currentTime += INTRA_CHAR_GAP
      }
    }

    charTimings.push({
      char: mc.char,
      startUnit,
      endUnit: currentTime,
      code: mc.code,
    })

    // Inter-character gap
    currentTime += INTER_CHAR_GAP
  }

  return {
    highRanges,
    totalDuration: currentTime,
    charTimings,
  }
}

// ─── Frequency / WPM Utilities ──────────────────────────────────────────────

/**
 * Calculate words-per-minute from a Morse code string.
 * Standard: 1 word = "PARIS" (50 dot-units).
 */
export function calculateWPM(morseCode: string, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0
  const result = decodeMorse(morseCode)
  const parisUnits = 50 // "PARIS" = 50 dot-units
  const words = result.totalUnits / parisUnits
  return Math.round((words / durationSeconds) * 60 * 10) / 10
}

/**
 * Get the Morse code for a single character.
 */
export function getMorseForChar(ch: string): string {
  return MORSE_TABLE[ch.toUpperCase()] || ""
}

/**
 * Get the character for a Morse code sequence.
 */
export function getCharForMorse(code: string): string {
  return REVERSE_MORSE_TABLE[code] || "?"
}

/**
 * Calculate the Farnsworth timing (spacing between characters at a given WPM).
 */
export function farnsworthTiming(wpm: number): {
  dotMs: number
  dashMs: number
  intraCharMs: number
  interCharMs: number
  wordMs: number
} {
  // PARIS timing: 50 dot-units per word
  const dotMs = (60 / (50 * wpm)) * 1000
  return {
    dotMs,
    dashMs: dotMs * 3,
    intraCharMs: dotMs,
    interCharMs: dotMs * 3,
    wordMs: dotMs * 7,
  }
}
