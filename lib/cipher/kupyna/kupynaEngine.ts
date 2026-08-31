/**
 * Low-level Kupyna engine.
 *
 * This is a simulated placeholder and is intentionally not presented as a
 * conformant DSTU 7564 implementation. The public hash implementation
 * exposes the same disclosure through its metadata.
 */
export class KupynaEngine {
  async hash(
    data: Uint8Array,
    hashLength: number = 32,
  ): Promise<Uint8Array> {
    if (!Number.isInteger(hashLength) || hashLength <= 0) {
      throw new Error("hashLength must be a positive integer");
    }

    const hashBuffer = new Uint8Array(hashLength);

    // Explicitly simulated placeholder digest.
    for (let i = 0; i < data.length; i++) {
      hashBuffer[i % hashLength] ^= data[i];
    }

    return hashBuffer;
  }
}
