import { BaseCipher } from './baseCipher';

/**
 * Pipeline Mode cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://en.wikipedia.org/wiki/Cryptography — Primary algorithm specification.
 */
export type PipelineMode = 'FAST' | 'INSTRUMENTED';

/**
 * Trace Step cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://en.wikipedia.org/wiki/Cryptography — Primary algorithm specification.
 */
export interface TraceStep {
  step: string;
  data: Uint8Array;
}

/**
 * Instrumented Pipeline cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://en.wikipedia.org/wiki/Cryptography — Primary algorithm specification.
 */
export class InstrumentedPipeline {
  private cipher: BaseCipher;
  private mode: PipelineMode;

  constructor(cipher: BaseCipher, mode: PipelineMode = 'FAST') {
    this.cipher = cipher;
    this.mode = mode;
  }

  async execute(plaintext: Uint8Array): Promise<{ result: Uint8Array; traces?: TraceStep[] }> {
    if (this.mode === 'FAST') {
      const result = await this.cipher.encrypt(plaintext);
      return { result };
    }

    // Instrumented mode: capture step-by-step intermediate state metrics
    // In a full implementation, the cipher would emit internal state steps
    const traces: TraceStep[] = [
      { step: 'INIT', data: plaintext },
      { step: 'KEY_ADDITION', data: new Uint8Array(plaintext) }, // Mocked
      { step: 'SUBSTITUTION', data: new Uint8Array(plaintext) },
    ];
    
    const result = await this.cipher.encrypt(plaintext);
    traces.push({ step: 'FINAL', data: result });
    
    return {
      result,
      traces,
    };
  }
}
