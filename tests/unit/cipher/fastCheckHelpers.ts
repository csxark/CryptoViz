import * as fc from 'fast-check';

/**
 * Custom fast-check arbitraries for cryptographic input constraints.
 */
export const cryptoArbitraries = {
  // General UTF-8 strings including emojis and empty strings
  arbitraryUtf8: fc.string(),

  // Alphabetic-only strings for classical ciphers (Caesar, Playfair, Vigenere, etc.)
  arbitraryAlphabetic: fc.string({ unit: 'grapheme' }).map(s => s.replace(/[^a-zA-Z]/g, 'A')),

  // Hexadecimal strings for ciphers requiring hex inputs/keys
  arbitraryHex: fc.hexaString({ minLength: 2, maxLength: 64 }).filter(s => s.length % 2 === 0),

  // Variable-length keys
  arbitraryKey: fc.string({ minLength: 1, maxLength: 32 }),
};
