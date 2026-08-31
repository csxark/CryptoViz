import { KalynaEngine } from './kalyna/kalynaEngine';
import { BaseCipher } from './baseCipher';

/**
 * Cipher Registry cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://en.wikipedia.org/wiki/Cryptography — Primary algorithm specification.
 */
export class CipherRegistry {
  private ciphers: Map<string, BaseCipher> = new Map();

  constructor() {
    this.register('kalyna', new KalynaEngine());
  }

  register(name: string, instance: BaseCipher): void {
    this.ciphers.set(name, instance);
  }

  get(name: string): BaseCipher | undefined {
    return this.ciphers.get(name);
  }
}

/**
 * Global Cipher Registry cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://en.wikipedia.org/wiki/Cryptography — Primary algorithm specification.
 */
export const globalCipherRegistry = new CipherRegistry();
