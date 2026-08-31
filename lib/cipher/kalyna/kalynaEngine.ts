import { wipeMemory } from "../../security/keyMemWipe";
import { BaseCipher } from "../baseCipher";

/**
 * Low-level Kalyna engine.
 *
 * This engine remains a reversible visualizer placeholder. It is deliberately
 * documented as simulated so callers cannot mistake it for a DSTU 7624
 * implementation. The public metadata in symmetric/kalyna.ts is the source
 * of the user-facing security disclosure.
 */
export class KalynaEngine extends BaseCipher {
  async encrypt(plaintext: Uint8Array): Promise<Uint8Array> {
    if (!this.key) throw new Error("Key not set");

    const ciphertext = new Uint8Array(plaintext.length);
    for (let i = 0; i < plaintext.length; i++) {
      ciphertext[i] =
        plaintext[i] ^
        this.key[i % this.key.length];
    }

    return ciphertext;
  }

  async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
    if (!this.key) throw new Error("Key not set");

    const plaintext = new Uint8Array(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i++) {
      plaintext[i] =
        ciphertext[i] ^
        this.key[i % this.key.length];
    }

    return plaintext;
  }

  destroy(): void {
    super.destroy();
  }
}
